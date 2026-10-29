import { useState } from 'react'
import { useSimulation } from '../../sim/engine'
import { NODE_BY_ID } from '../../sim/topology'
import { VANTAGE_BY_ID, observesLink } from '../../sim/vantage'
import type { Capture, Frame, Packet } from '../../sim/types'
import NetworkCanvas from './NetworkCanvas'
import SimControls from './SimControls'
import SecurityPanel from './SecurityPanel'
import GlobalControls from './GlobalControls'
import Inspector from './Inspector'
import ActivityPanel from './ActivityPanel'

function isRouter(id: string) { return NODE_BY_ID[id]?.kind === 'router' }
function ttlAt(path: string[], hopIndex: number) {
  let ttl = 64
  for (let i = 1; i <= hopIndex; i++) if (isRouter(path[i])) ttl -= 1
  return ttl
}

function frameFromPacket(p: Packet, hopIndex: number): Frame {
  const count = p.path.length - 1
  const h = Math.max(0, Math.min(hopIndex, count))
  const segIdx = h < count ? h : count - 1
  const atNode = p.path[h]
  const atDrop = p.status === 'dropped' && p.dropAt === atNode
  return {
    proto: p.proto, src: p.src, dst: p.dst, srcPort: p.srcPort, dstPort: p.dstPort, flags: p.flags,
    ttl: ttlAt(p.path, h), payload: p.payload, summary: p.summary, encrypted: p.encrypted, malicious: p.malicious,
    linkFrom: p.path[segIdx], linkTo: p.path[segIdx + 1], atNode, hopIndex: h, hopCount: count,
    status: atDrop ? 'dropped' : h >= count ? p.status : 'flying', dropReason: p.dropReason,
  }
}

function frameFromCapture(c: Capture): Frame {
  const from = c.hopIndex === 0 ? c.atNode : c.prevHop
  const to = c.hopIndex === 0 ? c.nextHop : c.atNode
  return {
    proto: c.proto, src: c.src, dst: c.dst, srcPort: c.srcPort, dstPort: c.dstPort, flags: c.flags,
    ttl: c.ttlAt, payload: c.payload, summary: c.summary, encrypted: c.encrypted, malicious: c.malicious,
    linkFrom: from, linkTo: to, atNode: c.atNode, hopIndex: c.hopIndex, hopCount: c.hopCount,
    status: c.dropped ? 'dropped' : c.hopIndex >= c.hopCount ? 'delivered' : 'flying',
  }
}

type Sel =
  | { kind: 'packet'; id: number; hop: number | null }
  | { kind: 'capture'; cap: Capture }
  | { kind: 'node'; id: string }
  | null

export default function NetworkSimulation() {
  const sim = useSimulation()
  const [tab, setTab] = useState<'explore' | 'security'>('explore')
  const [intercept, setIntercept] = useState(false)
  const [vantageId, setVantageId] = useState<string | null>(null)
  const [sel, setSel] = useState<Sel>(null)

  const showVantages = tab === 'security' && intercept
  const vantage = showVantages && vantageId ? VANTAGE_BY_ID[vantageId] : null

  const livePacket = sel?.kind === 'packet' ? sim.packets.find(p => p.id === sel.id) ?? null : null

  let frame: Frame | null = null
  let stepper: { index: number; count: number; onStep: (d: number) => void } | undefined
  if (sel?.kind === 'packet' && livePacket) {
    const hop = sel.hop ?? livePacket.hop
    frame = frameFromPacket(livePacket, hop)
    stepper = {
      index: frame.hopIndex, count: frame.hopCount,
      onStep: (d) => setSel(s => (s && s.kind === 'packet' ? { ...s, hop: Math.max(0, Math.min(frame!.hopCount, (s.hop ?? livePacket.hop) + d)) } : s)),
    }
  } else if (sel?.kind === 'capture') {
    frame = frameFromCapture(sel.cap)
  }

  const selNodeId = sel?.kind === 'node' ? sel.id : sel?.kind === 'capture' ? sel.cap.atNode : null
  const nodeInfo = sel?.kind === 'node'
    ? {
        id: sel.id, state: sim.nodeStates[sel.id], captures: sim.captures[sel.id] ?? [],
        enabled: sim.enabledDefenses, onToggle: sim.toggleDefense,
        onSelectCapture: (c: Capture) => setSel({ kind: 'capture', cap: c }),
      }
    : null

  const interceptInfo = frame && vantage && observesLink(vantage, frame.linkFrom, frame.linkTo)
    ? { name: vantage.name, short: vantage.short, layer: vantage.layer, color: vantage.color, readsPayload: !frame.encrypted || vantage.seesDecrypted }
    : undefined

  const inspectorTitle = frame ? 'Packet inspector' : sel?.kind === 'node' ? 'Device & capture' : 'Inspector'

  return (
    <div className="flex h-full min-h-0">
      {/* left dock */}
      <div className="flex-shrink-0 flex flex-col" style={{ width: 272, borderRight: '1px solid #0f2238', background: '#060f1c' }}>
        <div className="flex gap-1 p-2">
          {(['explore', 'security'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-1.5 rounded text-[11px] font-bold capitalize transition-colors"
              style={{ background: tab === t ? (t === 'security' ? '#ff336622' : '#38bdf822') : 'transparent', border: `1px solid ${tab === t ? (t === 'security' ? '#ff3366' : '#38bdf8') : '#1e3a5a'}`, color: tab === t ? (t === 'security' ? '#ff3366' : '#38bdf8') : '#7ea8d0' }}>
              {t === 'explore' ? '🧭 Explore' : '🛡 Security'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-2.5">
          {tab === 'explore'
            ? <SimControls sim={sim} />
            : <SecurityPanel sim={sim} intercept={intercept} setIntercept={setIntercept} vantageId={vantageId} setVantageId={setVantageId} />}
        </div>
        <div className="p-2.5 border-t" style={{ borderColor: '#0f2238' }}>
          <GlobalControls sim={sim} />
        </div>
      </div>

      {/* canvas */}
      <div className="flex-1 min-w-0 relative">
        <NetworkCanvas
          packets={sim.packets}
          nodeStates={sim.nodeStates}
          paused={sim.paused}
          selectedPacketId={sel?.kind === 'packet' ? sel.id : null}
          selectedNodeId={selNodeId}
          onSelectPacket={(id) => setSel(id == null ? null : { kind: 'packet', id, hop: null })}
          onSelectNode={(id) => setSel(id == null ? null : { kind: 'node', id })}
          showVantages={showVantages}
          selectedVantage={vantageId}
          onSelectVantage={setVantageId}
        />
      </div>

      {/* right dock */}
      <div className="flex-shrink-0 flex flex-col" style={{ width: 320, borderLeft: '1px solid #0f2238', background: '#060f1c' }}>
        <div className="flex-1 min-h-0 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', borderBottom: '1px solid #0f2238' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase">{inspectorTitle}</div>
            {sel && <button onClick={() => setSel(null)} className="text-[#5a7a9a] hover:text-white text-sm leading-none">×</button>}
          </div>
          <Inspector frame={frame} stepper={stepper} node={nodeInfo} intercept={interceptInfo} />
        </div>
        <div className="flex-shrink-0 p-3" style={{ height: 300 }}>
          <ActivityPanel metrics={sim.metrics} history={sim.history} logs={sim.logs} />
        </div>
      </div>
    </div>
  )
}
