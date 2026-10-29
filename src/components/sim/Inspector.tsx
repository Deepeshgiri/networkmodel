import { motion } from 'framer-motion'
import { NODE_BY_ID } from '../../sim/topology'
import { buildHeaders, PROTO_COLOR, PROTO_LAYER } from '../../sim/protocols'
import { DEFENSES, NODE_DEFENSES } from '../../sim/security'
import type { Capture, DefenseId, Frame, NodeState } from '../../sim/types'

const LAYER_NAME: Record<number, string> = { 2: 'Link', 3: 'Network', 4: 'Transport', 6: 'Presentation', 7: 'Application' }

function FrameView({ frame, stepper }: { frame: Frame; stepper?: { index: number; count: number; onStep: (d: number) => void } }) {
  const col = frame.malicious ? '#ff3366' : PROTO_COLOR[frame.proto]
  const at = NODE_BY_ID[frame.linkFrom]
  const next = NODE_BY_ID[frame.linkTo]
  const stack = buildHeaders({
    proto: frame.proto, srcId: frame.src, dstId: frame.dst, prevHopId: frame.linkFrom, nextHopId: frame.linkTo,
    srcPort: frame.srcPort, dstPort: frame.dstPort, flags: frame.flags, ttl: frame.ttl, payload: frame.payload, encrypted: frame.encrypted,
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg p-3" style={{ background: col + '14', border: `1px solid ${col}44` }}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm" style={{ color: col }}>
            {frame.malicious && '⚠ '}{frame.proto}{frame.flags ? ` · ${frame.flags}` : ''}
          </div>
          <div className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: col + '22', color: col }}>
            L{PROTO_LAYER[frame.proto]} {LAYER_NAME[PROTO_LAYER[frame.proto]]}
          </div>
        </div>
        <div className="text-xs text-[#a6c4e0] mt-1.5">{frame.summary}</div>
        <div className="text-[11px] font-mono text-[#7ea8d0] mt-2">{NODE_BY_ID[frame.src]?.ip} → {NODE_BY_ID[frame.dst]?.ip}{frame.dstPort ? `  :${frame.dstPort}` : ''}</div>
        <div className="flex items-center flex-wrap gap-1.5 mt-2 text-[10px]">
          <span className="px-1.5 py-0.5 rounded" style={{ background: '#dc262622', color: '#f87171' }}>TTL {frame.ttl}</span>
          {frame.encrypted
            ? <span className="px-1.5 py-0.5 rounded" style={{ background: '#22c55e22', color: '#4ade80' }}>🔒 TLS encrypted</span>
            : <span className="px-1.5 py-0.5 rounded" style={{ background: '#64748b22', color: '#94a3b8' }}>plaintext</span>}
          {frame.status === 'dropped' && <span className="px-1.5 py-0.5 rounded" style={{ background: '#ff336622', color: '#ff3366' }}>✕ {frame.dropReason}</span>}
          {frame.status === 'delivered' && <span className="px-1.5 py-0.5 rounded" style={{ background: '#22c55e22', color: '#4ade80' }}>✓ delivered</span>}
        </div>
      </div>

      {/* where on the path */}
      <div className="rounded-md px-2.5 py-2" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
        <div className="text-[11px] text-[#7ea8d0]">
          On the wire: <span className="text-[#cfe3f5] font-bold">{at?.label}</span> → <span className="text-[#cfe3f5] font-bold">{next?.label}</span>
        </div>
        {stepper && stepper.count > 1 && (
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => stepper.onStep(-1)} disabled={stepper.index <= 0}
              className="px-2 py-0.5 rounded text-[11px] font-bold disabled:opacity-30" style={{ background: '#13243a', border: '1px solid #1e3a5a', color: '#38bdf8' }}>◀ hop</button>
            <div className="flex-1 flex gap-0.5">
              {Array.from({ length: stepper.count }).map((_, i) => (
                <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i === stepper.index ? col : i < stepper.index ? col + '66' : '#1e3a5a' }} />
              ))}
            </div>
            <button onClick={() => stepper.onStep(1)} disabled={stepper.index >= stepper.count - 1}
              className="px-2 py-0.5 rounded text-[11px] font-bold disabled:opacity-30" style={{ background: '#13243a', border: '1px solid #1e3a5a', color: '#38bdf8' }}>hop ▶</button>
          </div>
        )}
        <div className="text-[10px] text-[#5a7a9a] mt-1">hop {frame.hopIndex + 1} / {frame.hopCount} — step through to watch the MAC addresses and TTL change</div>
      </div>

      {/* layered headers */}
      <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase">Encapsulation — outermost first</div>
      <div className="flex flex-col gap-2">
        {stack.slice().reverse().map((seg, i) => (
          <motion.div key={seg.title} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-md overflow-hidden" style={{ border: `1px solid ${seg.fields[0]?.color ?? '#1e3a5a'}55` }}>
            <div className="px-2 py-1 text-[10px] font-bold flex items-center justify-between" style={{ background: (seg.fields[0]?.color ?? '#1e3a5a') + '22', color: seg.fields[0]?.color }}>
              <span>{seg.title}</span><span className="opacity-60">L{seg.layer}</span>
            </div>
            <div className="p-1.5 flex flex-wrap gap-1" style={{ background: '#060d18' }}>
              {seg.fields.map(f => (
                <div key={f.name} className="group relative rounded px-1.5 py-1" style={{ background: f.color + '1c', border: `1px solid ${f.color}3a`, minWidth: 54 }}>
                  <div className="text-[9px] font-bold" style={{ color: f.color }}>{f.name}</div>
                  <div className="text-[10px] font-mono text-[#cfe3f5] truncate max-w-[150px]">{f.value}</div>
                  <div className="absolute z-20 left-0 top-full mt-1 hidden group-hover:block w-48 p-2 rounded text-[10px]" style={{ background: '#02050b', border: `1px solid ${f.color}66`, color: '#a6c4e0' }}>
                    <span className="font-bold" style={{ color: f.color }}>{f.name}</span> · {f.bits} bits<br />{f.description}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-[10px] text-[#5a7a9a] leading-relaxed">
        Only the <span className="text-[#eab308]">Ethernet</span> header changes at each hop — the <span className="text-[#38bdf8]">IP</span> addresses stay fixed end to end.
      </div>
    </div>
  )
}

interface NodeInfo {
  id: string
  state: NodeState
  captures: Capture[]
  enabled: Set<DefenseId>
  onToggle: (id: DefenseId) => void
  onSelectCapture: (c: Capture) => void
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  ok: { label: 'Healthy', color: '#22c55e' },
  warning: { label: 'Suspicious activity', color: '#eab308' },
  compromised: { label: 'Compromised', color: '#ff3366' },
  down: { label: 'Overloaded / down', color: '#ff3366' },
}

function NodeView({ info }: { info: NodeInfo }) {
  const n = NODE_BY_ID[info.id]
  if (!n) return null
  const defs = (NODE_DEFENSES[info.id] ?? []).map(id => DEFENSES.find(d => d.id === id)!).filter(Boolean)
  const st = STATUS_STYLE[info.state.status]

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm text-[#cfe3f5]">{n.label}</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: st.color + '22', color: st.color }}>● {st.label}</span>
        </div>
        <div className="text-xs text-[#7ea8d0]">{n.role}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="rounded p-2" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
          <div className="text-[9px] text-[#5a7a9a] uppercase tracking-wider">IP</div><div className="text-[#cfe3f5]">{n.ip}</div>
        </div>
        <div className="rounded p-2" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
          <div className="text-[9px] text-[#5a7a9a] uppercase tracking-wider">MAC</div><div className="text-[#cfe3f5] truncate">{n.mac}</div>
        </div>
      </div>
      <div className="text-xs text-[#a6c4e0] leading-relaxed">{n.explain}</div>

      {defs.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase mb-1.5">Security controls here</div>
          <div className="flex flex-col gap-1.5">
            {defs.map(d => {
              const on = info.enabled.has(d.id)
              return (
                <div key={d.id} className="rounded-md p-2" style={{ background: on ? d.color + '12' : '#0a1626', border: `1px solid ${on ? d.color + '55' : '#1e3a5a'}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: on ? d.color : '#7ea8d0' }}>{d.name}</span>
                    <button onClick={() => info.onToggle(d.id)} className="w-9 h-4.5 rounded-full relative transition-colors" style={{ background: on ? d.color : '#1e3a5a', height: 18 }}>
                      <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all" style={{ left: on ? 20 : 2 }} />
                    </button>
                  </div>
                  <div className="text-[10px] text-[#7ea8d0] mt-1 leading-snug">{d.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase mb-1.5 flex items-center justify-between">
          <span>Capture buffer</span><span className="text-[#5a7a9a] normal-case tracking-normal">{info.captures.length} frames · newest first</span>
        </div>
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {info.captures.length === 0 && <div className="text-[10px] text-[#5a7a9a] py-2">No traffic through this device yet.</div>}
          {info.captures.map(c => {
            const col = c.malicious ? '#ff3366' : PROTO_COLOR[c.proto]
            return (
              <button key={c.key} onClick={() => info.onSelectCapture(c)}
                className="text-left rounded px-2 py-1.5 transition-colors hover:brightness-125"
                style={{ background: '#0a1626', border: `1px solid ${c.dropped ? '#ff336655' : '#1e3a5a'}` }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono" style={{ color: col }}>{c.proto}{c.flags ? `·${c.flags.split(',')[0]}` : ''}</span>
                  <span className="text-[9px] font-mono text-[#5a7a9a]">TTL {c.ttlAt}</span>
                  {c.dropped && <span className="text-[9px] text-[#ff3366]">✕ dropped</span>}
                  <span className="ml-auto text-[9px] font-mono text-[#3a5a7a]">{new Date(c.t).toLocaleTimeString([], { hour12: false })}</span>
                </div>
                <div className="text-[10px] text-[#a6c4e0] font-mono truncate mt-0.5">{NODE_BY_ID[c.src]?.ip} → {NODE_BY_ID[c.dst]?.ip}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Inspector({ frame, stepper, node }: { frame: Frame | null; stepper?: { index: number; count: number; onStep: (d: number) => void }; node?: NodeInfo | null }) {
  if (frame) return <FrameView frame={frame} stepper={stepper} />
  if (node) return <NodeView info={node} />
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
      <div className="text-3xl opacity-40">🔍</div>
      <div className="text-xs text-[#7ea8d0]">Click any packet to inspect its full structure, hop by hop.</div>
      <div className="text-[10px] text-[#5a7a9a]">Or click a device to tap its capture buffer and see every frame that passed through it.</div>
    </div>
  )
}
