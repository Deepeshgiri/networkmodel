import { useCallback, useEffect, useRef, useState } from 'react'
import type { Capture, DefenseId, HistoryPoint, LogEntry, LogLevel, Metrics, NodeState, NodeStatus, Packet, Proto } from './types'
import { NODE_BY_ID, NODES, route } from './topology'
import { PROTO_LAYER } from './protocols'
import { SCENARIOS, type Scenario } from './scenarios'
import { ATTACKS, DEFENSES, evaluateDefense, THREATS } from './security'

const SPEED_MS = 520 // time to cross one hop at 1x
const CAPTURE_LIMIT = 16
let pid = 1
let lid = 1
let cid = 1

function emptyNodeStates(): Record<string, NodeState> {
  const m: Record<string, NodeState> = {}
  for (const n of NODES) m[n.id] = { busy: 0, load: n.kind === 'server' || n.kind === 'website' ? 0.2 : 0, status: 'ok', alerts: 0 }
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
  malicious?: boolean
  threatId?: string
}

export interface SimApi {
  packets: Packet[]
  nodeStates: Record<string, NodeState>
  captures: Record<string, Capture[]>
  logs: LogEntry[]
  metrics: Metrics
  history: HistoryPoint[]
  speed: number
  ambient: boolean
  paused: boolean
  enabledDefenses: Set<DefenseId>
  scenario: { scn: Scenario; step: number } | null
  activeAttack: string | null
  setSpeed: (s: number) => void
  setAmbient: (a: boolean) => void
  setPaused: (p: boolean) => void
  stepOnce: () => void
  toggleDefense: (id: DefenseId) => void
  setAllDefenses: (on: boolean) => void
  playScenario: (id: string) => void
  stopScenario: () => void
  stepScenario: () => void
  launchAttack: (id: string) => void
  sendCustom: (opts: SpawnOpts) => void
  reset: () => void
}

export function useSimulation(): SimApi {
  const [packets, setPackets] = useState<Packet[]>([])
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>(emptyNodeStates)
  const [captures, setCaptures] = useState<Record<string, Capture[]>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ sent: 0, delivered: 0, dropped: 0, blocked: 0, alerts: 0, breaches: 0 })
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [speed, setSpeed] = useState(1)
  const [ambient, setAmbient] = useState(true)
  const [paused, setPaused] = useState(false)
  const [enabledDefenses, setEnabledDefenses] = useState<Set<DefenseId>>(() => new Set(DEFENSES.map(d => d.id)))
  const [scenario, setScenario] = useState<{ scn: Scenario; step: number } | null>(null)
  const [activeAttack, setActiveAttack] = useState<string | null>(null)

  const pktRef = useRef<Packet[]>([])
  const capRef = useRef<Record<string, Capture[]>>({})
  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)
  const defRef = useRef(enabledDefenses)
  const scenarioRef = useRef(scenario)
  const deliveredRef = useRef(0)
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attackTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { defRef.current = enabledDefenses }, [enabledDefenses])
  useEffect(() => { scenarioRef.current = scenario }, [scenario])

  const log = useCallback((level: LogLevel, source: string, msg: string) => {
    setLogs(prev => [{ id: lid++, t: Date.now(), level, source, msg }, ...prev].slice(0, 160))
  }, [])

  const bump = useCallback((id: string, load = 0) => {
    setNodeStates(prev => {
      const cur = prev[id]
      if (!cur) return prev
      return { ...prev, [id]: { ...cur, busy: Math.min(1, cur.busy + 0.6), load: Math.min(1, Math.max(cur.load, load)) } }
    })
  }, [])

  const setStatus = useCallback((id: string, status: NodeStatus, note?: string) => {
    setNodeStates(prev => (prev[id] ? { ...prev, [id]: { ...prev[id], status } } : prev))
    if (note) log('breach', NODE_BY_ID[id]?.label ?? id, note)
  }, [log])

  const capture = useCallback((nodeId: string, p: Packet, hopIndex: number, dropped = false) => {
    const prevHop = p.path[Math.max(0, hopIndex - 1)]
    const nextHop = p.path[Math.min(hopIndex + 1, p.path.length - 1)]
    const entry: Capture = {
      key: cid++, packetId: p.id, t: Date.now(), proto: p.proto, src: p.src, dst: p.dst,
      srcPort: p.srcPort, dstPort: p.dstPort, flags: p.flags, payload: p.payload, summary: p.summary,
      encrypted: p.encrypted, malicious: p.malicious, ttlAt: p.ttl, prevHop, nextHop, atNode: nodeId,
      hopIndex, hopCount: p.path.length - 1, dropped,
    }
    const arr = capRef.current[nodeId] ? [entry, ...capRef.current[nodeId]] : [entry]
    capRef.current = { ...capRef.current, [nodeId]: arr.slice(0, CAPTURE_LIMIT) }
  }, [])

  const applyBreach = useCallback((p: Packet) => {
    switch (p.threat?.id) {
      case 'arp_spoof': setStatus('alice', 'warning', 'ARP cache poisoned — Alice now routes via the attacker (MITM)'); break
      case 'ransomware': setStatus('files', 'compromised', 'File server reached over SMB — shares being encrypted'); break
      case 'dns_spoof': setStatus('dns', 'warning', 'Forged DNS record accepted — clients may be misdirected'); break
      case 'port_scan': log('warn', 'Web Server', 'Unsolicited connection reached an open port'); break
      case 'syn_flood':
        setNodeStates(prev => {
          const cur = prev.web; if (!cur) return prev
          const load = Math.min(1, cur.load + 0.14)
          return { ...prev, web: { ...cur, load, status: load >= 0.99 ? 'down' : 'warning' } }
        })
        break
    }
    setMetrics(m => ({ ...m, breaches: m.breaches + 1 }))
  }, [log, setStatus])

  const spawn = useCallback((opts: SpawnOpts) => {
    const path = route(opts.src, opts.dst)
    const srcNode = NODE_BY_ID[opts.src]
    if (!srcNode || path.length < 2) { log('warn', opts.src, `No route to ${opts.dst}`); return }
    const p: Packet = {
      id: pid++, proto: opts.proto,
      label: opts.flags && opts.proto !== 'ARP' ? `${opts.proto}·${opts.flags.split(',')[0]}` : opts.proto,
      src: opts.src, dst: opts.dst, path, hop: 0, progress: 0, hopTime: 0,
      srcPort: opts.srcPort, dstPort: opts.dstPort, flags: opts.flags, payload: opts.payload, summary: opts.summary,
      encrypted: !!opts.encrypted, malicious: !!opts.malicious, threat: opts.threatId ? THREATS[opts.threatId] : undefined,
      ttl: 64, status: 'flying', fade: 1, scenario: opts.scenario,
    }
    pktRef.current = [...pktRef.current, p]
    setPackets(pktRef.current)
    setMetrics(m => ({ ...m, sent: m.sent + 1 }))
    capture(opts.src, p, 0)
    setCaptures(capRef.current)
    bump(opts.src)
    if (opts.scenario) log('info', srcNode.label, `${opts.proto}: ${opts.summary}`)
    if (opts.malicious) log('warn', srcNode.label, `⚠ ${opts.summary}`)
  }, [bump, capture, log])

  // ---- one simulation tick (shared by RAF loop and the Step button) ----
  const simulate = useCallback((dtMs: number) => {
    const perHop = SPEED_MS / speedRef.current
    const next: Packet[] = []
    const caps: { nodeId: string; p: Packet; hop: number; dropped: boolean }[] = []
    const bumps: string[] = []
    const logsOut: [LogLevel, string, string][] = []
    const nodeAlerts: string[] = []
    const breaches: Packet[] = []
    let dDelivered = 0, dDropped = 0, dBlocked = 0, dAlerts = 0

    for (const p of pktRef.current) {
      // fading out already-finished packets
      if (p.status === 'delivered' || p.status === 'dropped') {
        const fade = p.fade - dtMs / 600
        if (fade > 0) next.push({ ...p, fade })
        continue
      }
      const hopTime = p.hopTime + dtMs
      const progress = Math.min(1, hopTime / perHop)
      if (progress < 1) { next.push({ ...p, hopTime, progress }); continue }

      // arrived at the next node
      const hop = p.hop + 1
      const nodeId = p.path[hop]
      const node = NODE_BY_ID[nodeId]
      const ttl = node?.kind === 'router' && p.proto !== 'ARP' ? p.ttl - 1 : p.ttl
      bumps.push(nodeId)

      if (ttl <= 0) {
        const np: Packet = { ...p, hop, ttl, hopTime: 0, progress: 0, status: 'dropped', dropAt: nodeId, dropReason: 'TTL expired', fade: 1 }
        caps.push({ nodeId, p: np, hop, dropped: true }); dDropped++
        logsOut.push(['warn', node?.label ?? nodeId, 'Packet dropped — TTL reached 0'])
        next.push(np); continue
      }

      // defensive evaluation for malicious packets
      if (p.malicious && p.threat) {
        const verdict = evaluateDefense(nodeId, p.threat, defRef.current)
        if (verdict?.action === 'block') {
          const np: Packet = { ...p, hop, ttl, hopTime: 0, progress: 0, status: 'dropped', dropAt: nodeId, dropReason: `Blocked by ${verdict.by.toUpperCase()}`, fade: 1 }
          caps.push({ nodeId, p: np, hop, dropped: true }); dBlocked++; nodeAlerts.push(nodeId)
          logsOut.push(['block', node?.label ?? nodeId, `🛡 ${p.threat.name} blocked (${verdict.by})`])
          next.push(np); continue
        }
        if (verdict?.action === 'detect' && !p.detected) {
          dAlerts++; nodeAlerts.push(nodeId)
          logsOut.push(['alert', node?.label ?? nodeId, `⚠ ${p.threat.name} detected (${verdict.by}) — alerting`])
          const np: Packet = { ...p, hop, ttl, hopTime: 0, progress: 0, detected: true }
          caps.push({ nodeId, p: np, hop, dropped: false })
          if (hop >= p.path.length - 1) { np.status = 'delivered'; np.fade = 1; dDelivered++; breaches.push(np) }
          next.push(np); continue
        }
      }

      const np: Packet = { ...p, hop, ttl, hopTime: 0, progress: 0 }
      caps.push({ nodeId, p: np, hop, dropped: false })
      if (hop >= p.path.length - 1) { np.status = 'delivered'; np.fade = 1; dDelivered++; if (p.malicious && p.threat) breaches.push(np) }
      next.push(np)
    }

    const hadAny = pktRef.current.length > 0
    pktRef.current = next
    if (hadAny || next.length) setPackets(next)

    // apply collected side effects
    for (const b of bumps) bump(b)
    if (caps.length) { for (const c of caps) capture(c.nodeId, c.p, c.hop, c.dropped); setCaptures(capRef.current) }
    if (dDelivered) deliveredRef.current += dDelivered
    if (dDelivered || dDropped || dBlocked || dAlerts) {
      setMetrics(m => ({ ...m, delivered: m.delivered + dDelivered, dropped: m.dropped + dDropped, blocked: m.blocked + dBlocked, alerts: m.alerts + dAlerts }))
    }
    if (nodeAlerts.length) {
      setNodeStates(prev => {
        const upd = { ...prev }
        for (const id of nodeAlerts) if (upd[id]) upd[id] = { ...upd[id], alerts: upd[id].alerts + 1 }
        return upd
      })
    }
    for (const l of logsOut) log(l[0], l[1], l[2])
    for (const p of breaches) applyBreach(p)
  }, [applyBreach, bump, capture, log])

  // ---- RAF loop ----
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!pausedRef.current) simulate(dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [simulate])

  const stepOnce = useCallback(() => simulate(SPEED_MS / speedRef.current), [simulate])

  // ---- decay + history ----
  useEffect(() => {
    const decay = setInterval(() => {
      if (pausedRef.current) return
      setNodeStates(prev => {
        const next: Record<string, NodeState> = {}
        for (const k in prev) {
          const kind = NODE_BY_ID[k]?.kind
          const base = kind === 'server' || kind === 'website' ? 0.2 : 0
          const cur = prev[k]
          const load = cur.status === 'down' ? cur.load : Math.max(base, cur.load - 0.04)
          next[k] = { ...cur, busy: Math.max(0, cur.busy - 0.12), load }
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

  // ---- ambient traffic ----
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
      if (pausedRef.current) return
      if (pktRef.current.filter(p => p.status === 'flying').length > 16) return
      spawn(flows[Math.floor(Math.random() * flows.length)])
    }, 1100)
    return () => clearInterval(iv)
  }, [ambient, spawn])

  // ---- scenarios ----
  const runStep = useCallback((scn: Scenario, i: number) => {
    const s = scn.steps[i]
    spawn({ proto: s.proto, src: s.src, dst: s.dst, srcPort: s.srcPort, dstPort: s.dstPort, flags: s.flags, payload: s.payload, summary: s.summary, encrypted: s.encrypted, scenario: true })
  }, [spawn])

  const advanceRef = useRef<() => void>(() => {})
  const advance = useCallback(() => {
    const cur = scenarioRef.current
    if (!cur) return
    const nextIndex = cur.step + 1
    if (nextIndex >= cur.scn.steps.length) { log('success', cur.scn.name, 'Scenario complete'); setScenario(null); return }
    setScenario({ scn: cur.scn, step: nextIndex })
    runStep(cur.scn, nextIndex)
    const hops = route(cur.scn.steps[nextIndex].src, cur.scn.steps[nextIndex].dst).length
    stepTimer.current = setTimeout(() => advanceRef.current(), hops * (SPEED_MS / speedRef.current) + 800)
  }, [log, runStep])
  useEffect(() => { advanceRef.current = advance }, [advance])

  const playScenario = useCallback((id: string) => {
    const scn = SCENARIOS.find(s => s.id === id)
    if (!scn) return
    if (stepTimer.current) clearTimeout(stepTimer.current)
    setPaused(false)
    setAmbient(false)
    setScenario({ scn, step: 0 })
    log('info', scn.name, 'Walkthrough started')
    runStep(scn, 0)
    const hops = route(scn.steps[0].src, scn.steps[0].dst).length
    stepTimer.current = setTimeout(() => advanceRef.current(), hops * (SPEED_MS / speedRef.current) + 800)
  }, [log, runStep])

  const stopScenario = useCallback(() => { if (stepTimer.current) clearTimeout(stepTimer.current); setScenario(null) }, [])

  const stepScenario = useCallback(() => {
    if (stepTimer.current) clearTimeout(stepTimer.current)
    const cur = scenarioRef.current
    if (!cur) return
    const nextIndex = cur.step + 1
    if (nextIndex >= cur.scn.steps.length) { setScenario(null); return }
    setScenario({ scn: cur.scn, step: nextIndex })
    runStep(cur.scn, nextIndex)
  }, [runStep])

  // ---- attacks ----
  const launchAttack = useCallback((id: string) => {
    const atk = ATTACKS.find(a => a.id === id)
    if (!atk) return
    attackTimers.current.forEach(clearTimeout)
    attackTimers.current = []
    setPaused(false)
    setActiveAttack(id)
    log('alert', 'Security', `▶ Simulating: ${atk.name}`)
    const b = atk.burst
    for (let i = 0; i < b.count; i++) {
      const t = setTimeout(() => {
        spawn({ proto: b.proto, src: b.src, dst: b.dst, srcPort: b.srcPort + i, dstPort: b.dstPort, flags: b.flags, payload: b.payload, summary: b.summary, encrypted: b.encrypted, malicious: true, threatId: atk.threatId })
      }, i * b.intervalMs)
      attackTimers.current.push(t)
    }
    const done = setTimeout(() => setActiveAttack(null), b.count * b.intervalMs + 2500)
    attackTimers.current.push(done)
  }, [log, spawn])

  const toggleDefense = useCallback((id: DefenseId) => {
    setEnabledDefenses(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])
  const setAllDefenses = useCallback((on: boolean) => setEnabledDefenses(on ? new Set(DEFENSES.map(d => d.id)) : new Set()), [])

  const sendCustom = useCallback((opts: SpawnOpts) => spawn(opts), [spawn])

  const reset = useCallback(() => {
    if (stepTimer.current) clearTimeout(stepTimer.current)
    attackTimers.current.forEach(clearTimeout); attackTimers.current = []
    pktRef.current = []; capRef.current = {}; deliveredRef.current = 0
    setPackets([]); setCaptures({}); setNodeStates(emptyNodeStates()); setLogs([]); setHistory([])
    setMetrics({ sent: 0, delivered: 0, dropped: 0, blocked: 0, alerts: 0, breaches: 0 })
    setScenario(null); setActiveAttack(null); setPaused(false)
  }, [])

  useEffect(() => () => {
    if (stepTimer.current) clearTimeout(stepTimer.current)
    attackTimers.current.forEach(clearTimeout)
  }, [])

  return {
    packets, nodeStates, captures, logs, metrics, history,
    speed, ambient, paused, enabledDefenses, scenario, activeAttack,
    setSpeed, setAmbient, setPaused, stepOnce, toggleDefense, setAllDefenses,
    playScenario, stopScenario, stepScenario, launchAttack, sendCustom, reset,
  }
}

export { PROTO_LAYER }
