import { useCallback, useEffect, useRef, useState } from 'react'
import type { HistoryPoint, LogEntry, LogLevel, Metrics, NodeState, Packet, Proto } from './types'
import { NODE_BY_ID, NODES, route } from './topology'
import { PROTO_LAYER } from './protocols'
import { SCENARIOS, type Scenario } from './scenarios'

const SPEED_MS = 520 // time to cross one hop at 1x
let pid = 1
let lid = 1

function emptyNodeStates(): Record<string, NodeState> {
  const m: Record<string, NodeState> = {}
  for (const n of NODES) m[n.id] = { busy: 0, load: n.kind === 'server' || n.kind === 'website' ? 0.2 : 0 }
  return m
}

interface SpawnOpts {
  proto: Proto
  src: string
  dst: string
  srcPort: number
  dstPort: number
  flags?: string
  payload: string
  summary: string
  encrypted?: boolean
  scenario?: boolean
  onArrive?: (p: Packet) => void
}

export interface SimApi {
  packets: Packet[]
  nodeStates: Record<string, NodeState>
  logs: LogEntry[]
  metrics: Metrics
  history: HistoryPoint[]
  running: boolean
  speed: number
  ambient: boolean
  scenario: { scn: Scenario; step: number } | null
  setSpeed: (s: number) => void
  setAmbient: (a: boolean) => void
  playScenario: (id: string) => void
  stopScenario: () => void
  stepScenario: () => void
  sendCustom: (opts: SpawnOpts) => void
  reset: () => void
}

export function useSimulation(): SimApi {
  const [packets, setPackets] = useState<Packet[]>([])
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>(emptyNodeStates)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ sent: 0, delivered: 0, dropped: 0 })
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [speed, setSpeed] = useState(1)
  const [ambient, setAmbient] = useState(true)
  const [scenario, setScenario] = useState<{ scn: Scenario; step: number } | null>(null)

  const pktRef = useRef<Packet[]>([])
  const speedRef = useRef(speed)
  const scenarioRef = useRef(scenario)
  const deliveredRef = useRef(0)
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { scenarioRef.current = scenario }, [scenario])

  const log = useCallback((level: LogLevel, source: string, msg: string) => {
    setLogs(prev => [{ id: lid++, t: Date.now(), level, source, msg }, ...prev].slice(0, 120))
  }, [])

  const bump = useCallback((id: string, load = 0) => {
    setNodeStates(prev => {
      const cur = prev[id]
      if (!cur) return prev
      return { ...prev, [id]: { busy: Math.min(1, cur.busy + 0.6), load: Math.min(1, Math.max(cur.load, load)) } }
    })
  }, [])

  const spawn = useCallback((opts: SpawnOpts) => {
    const path = route(opts.src, opts.dst)
    const srcNode = NODE_BY_ID[opts.src]
    const dstNode = NODE_BY_ID[opts.dst]
    if (!srcNode || !dstNode || path.length < 2) {
      log('warn', opts.src, `No route to ${opts.dst}`)
      return
    }
    const p: Packet = {
      id: pid++,
      proto: opts.proto,
      label: opts.flags && opts.proto !== 'ARP' ? `${opts.proto}·${opts.flags.split(',')[0]}` : opts.proto,
      src: opts.src,
      dst: opts.dst,
      path,
      hop: 0,
      progress: 0,
      hopTime: 0,
      srcPort: opts.srcPort,
      dstPort: opts.dstPort,
      flags: opts.flags,
      payload: opts.payload,
      summary: opts.summary,
      encrypted: !!opts.encrypted,
      ttl: 64,
      status: 'flying',
      fade: 1,
      scenario: opts.scenario,
      onArrive: opts.onArrive,
    }
    pktRef.current = [...pktRef.current, p]
    setPackets(pktRef.current)
    setMetrics(m => ({ ...m, sent: m.sent + 1 }))
    bump(opts.src)
    if (opts.scenario) {
      log('info', srcNode.label, `${opts.proto}: ${opts.summary}`)
    }
  }, [bump, log])

  // ---- Animation loop ----
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      const perHop = SPEED_MS / speedRef.current
      let changed = false
      const arrivedAtHop: { id: string }[] = []

      for (const p of pktRef.current) {
        if (p.status === 'delivered') {
          p.fade -= dt / 500
          changed = true
          continue
        }
        p.hopTime += dt
        p.progress = Math.min(1, p.hopTime / perHop)
        changed = true
        if (p.progress >= 1) {
          // reached the next hop node
          const nodeId = p.path[p.hop + 1]
          const node = NODE_BY_ID[nodeId]
          arrivedAtHop.push({ id: nodeId })
          // TTL decrement at routers
          if (node?.kind === 'router' && p.proto !== 'ARP') p.ttl -= 1
          p.hop += 1
          p.hopTime = 0
          p.progress = 0
          if (p.hop >= p.path.length - 1) {
            p.status = 'delivered'
            p.fade = 1
          }
        }
      }

      if (arrivedAtHop.length) {
        for (const a of arrivedAtHop) bump(a.id)
      }

      // finalize delivered packets
      const delivered = pktRef.current.filter(p => p.status === 'delivered' && p.fade <= 0)
      if (delivered.length) {
        deliveredRef.current += delivered.length
        setMetrics(m => ({ ...m, delivered: m.delivered + delivered.length }))
        for (const p of delivered) p.onArrive?.(p)
      }

      pktRef.current = pktRef.current.filter(p => !(p.status === 'delivered' && p.fade <= 0))
      if (changed) setPackets([...pktRef.current])
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bump])

  // ---- Node busy / load decay + history sampling ----
  useEffect(() => {
    const decay = setInterval(() => {
      setNodeStates(prev => {
        const next: Record<string, NodeState> = {}
        for (const k in prev) {
          const base = NODE_BY_ID[k]?.kind === 'server' || NODE_BY_ID[k]?.kind === 'website' ? 0.2 : 0
          next[k] = { busy: Math.max(0, prev[k].busy - 0.12), load: Math.max(base, prev[k].load - 0.04) }
        }
        return next
      })
    }, 120)
    const sample = setInterval(() => {
      const inFlight = pktRef.current.filter(p => p.status === 'flying').length
      setHistory(h => [...h, { t: Date.now(), delivered: deliveredRef.current, inFlight }].slice(-60))
    }, 1000)
    return () => { clearInterval(decay); clearInterval(sample) }
  }, [])

  // ---- Ambient background traffic ----
  useEffect(() => {
    if (!ambient) return
    const flows: SpawnOpts[] = [
      { proto: 'HTTPS', src: 'bob', dst: 'site', srcPort: 51000, dstPort: 443, flags: 'PSH,ACK', payload: 'GET /feed', summary: 'browsing', encrypted: true },
      { proto: 'MQTT', src: 'iot', dst: 'cloudapi', srcPort: 48000, dstPort: 8883, payload: 'temp=21.4', summary: 'telemetry', encrypted: true },
      { proto: 'SMB', src: 'alice', dst: 'files', srcPort: 49200, dstPort: 445, flags: 'PSH,ACK', payload: 'read report.xlsx', summary: 'file read' },
      { proto: 'DNS', src: 'bob', dst: 'dns', srcPort: 50100, dstPort: 53, payload: 'A? cdn.example.com', summary: 'name lookup' },
      { proto: 'HTTPS', src: 'alice', dst: 'web', srcPort: 51200, dstPort: 443, flags: 'PSH,ACK', payload: 'GET /dashboard', summary: 'intranet', encrypted: true },
      { proto: 'TCP', src: 'web', dst: 'db', srcPort: 52000, dstPort: 5432, flags: 'PSH,ACK', payload: 'SELECT …', summary: 'db query' },
    ]
    const iv = setInterval(() => {
      if (pktRef.current.filter(p => p.status === 'flying').length > 14) return
      const f = flows[Math.floor(Math.random() * flows.length)]
      spawn(f)
    }, 1100)
    return () => clearInterval(iv)
  }, [ambient, spawn])

  // ---- Scenario stepping ----
  const runStep = useCallback((scn: Scenario, i: number) => {
    const s = scn.steps[i]
    spawn({
      proto: s.proto, src: s.src, dst: s.dst, srcPort: s.srcPort, dstPort: s.dstPort,
      flags: s.flags, payload: s.payload, summary: s.summary, encrypted: s.encrypted, scenario: true,
    })
  }, [spawn])

  const advanceRef = useRef<() => void>(() => {})
  const advance = useCallback(() => {
    const cur = scenarioRef.current
    if (!cur) return
    const nextIndex = cur.step + 1
    if (nextIndex >= cur.scn.steps.length) {
      log('success', cur.scn.name, 'Scenario complete')
      setScenario(null)
      return
    }
    setScenario({ scn: cur.scn, step: nextIndex })
    runStep(cur.scn, nextIndex)
    const hops = route(cur.scn.steps[nextIndex].src, cur.scn.steps[nextIndex].dst).length
    stepTimer.current = setTimeout(() => advanceRef.current(), hops * (SPEED_MS / speedRef.current) + 700)
  }, [log, runStep])
  useEffect(() => { advanceRef.current = advance }, [advance])

  const playScenario = useCallback((id: string) => {
    const scn = SCENARIOS.find(s => s.id === id)
    if (!scn) return
    if (stepTimer.current) clearTimeout(stepTimer.current)
    setAmbient(false)
    setScenario({ scn, step: 0 })
    log('info', scn.name, 'Scenario started')
    runStep(scn, 0)
    const hops = route(scn.steps[0].src, scn.steps[0].dst).length
    stepTimer.current = setTimeout(() => advanceRef.current(), hops * (SPEED_MS / speedRef.current) + 700)
  }, [log, runStep])

  const stopScenario = useCallback(() => {
    if (stepTimer.current) clearTimeout(stepTimer.current)
    setScenario(null)
  }, [])

  const stepScenario = useCallback(() => {
    // manual advance: cancel auto timer and move forward once
    if (stepTimer.current) clearTimeout(stepTimer.current)
    const cur = scenarioRef.current
    if (!cur) return
    const nextIndex = cur.step + 1
    if (nextIndex >= cur.scn.steps.length) { setScenario(null); return }
    setScenario({ scn: cur.scn, step: nextIndex })
    runStep(cur.scn, nextIndex)
  }, [runStep])

  const sendCustom = useCallback((opts: SpawnOpts) => spawn(opts), [spawn])

  const reset = useCallback(() => {
    if (stepTimer.current) clearTimeout(stepTimer.current)
    pktRef.current = []
    deliveredRef.current = 0
    setPackets([])
    setNodeStates(emptyNodeStates())
    setLogs([])
    setMetrics({ sent: 0, delivered: 0, dropped: 0 })
    setHistory([])
    setScenario(null)
  }, [])

  useEffect(() => () => { if (stepTimer.current) clearTimeout(stepTimer.current) }, [])

  return {
    packets, nodeStates, logs, metrics, history,
    running: ambient, speed, ambient, scenario,
    setSpeed, setAmbient, playScenario, stopScenario, stepScenario, sendCustom, reset,
  }
}

export { PROTO_LAYER }
