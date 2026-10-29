import { motion } from 'framer-motion'
import { NODE_BY_ID } from '../../sim/topology'
import { buildHeaders, PROTO_COLOR, PROTO_LAYER } from '../../sim/protocols'
import type { Packet } from '../../sim/types'

const LAYER_NAME: Record<number, string> = { 2: 'Link', 3: 'Network', 4: 'Transport', 6: 'Presentation', 7: 'Application' }

function PacketView({ p }: { p: Packet }) {
  const col = PROTO_COLOR[p.proto]
  const hopFrom = NODE_BY_ID[p.path[p.hop]]
  const hopTo = NODE_BY_ID[p.path[Math.min(p.hop + 1, p.path.length - 1)]]
  const prevHop = p.path[p.hop]
  const nextHop = p.path[Math.min(p.hop + 1, p.path.length - 1)]
  const stack = buildHeaders({
    proto: p.proto, srcId: p.src, dstId: p.dst, prevHopId: prevHop, nextHopId: nextHop,
    srcPort: p.srcPort, dstPort: p.dstPort, flags: p.flags, ttl: p.ttl, payload: p.payload, encrypted: p.encrypted,
  })

  return (
    <div className="flex flex-col gap-3">
      {/* summary card */}
      <div className="rounded-lg p-3" style={{ background: col + '14', border: `1px solid ${col}44` }}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm" style={{ color: col }}>{p.proto}{p.flags ? ` · ${p.flags}` : ''}</div>
          <div className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: col + '22', color: col }}>
            L{PROTO_LAYER[p.proto]} {LAYER_NAME[PROTO_LAYER[p.proto]]}
          </div>
        </div>
        <div className="text-xs text-[#a6c4e0] mt-1.5">{p.summary}</div>
        <div className="text-[11px] font-mono text-[#7ea8d0] mt-2 leading-relaxed">
          {NODE_BY_ID[p.src]?.ip} → {NODE_BY_ID[p.dst]?.ip}
          {p.dstPort ? `  :${p.dstPort}` : ''}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px]">
          <span className="px-1.5 py-0.5 rounded" style={{ background: '#dc262622', color: '#f87171' }}>TTL {p.ttl}</span>
          {p.encrypted
            ? <span className="px-1.5 py-0.5 rounded" style={{ background: '#22c55e22', color: '#4ade80' }}>🔒 encrypted (TLS)</span>
            : <span className="px-1.5 py-0.5 rounded" style={{ background: '#64748b22', color: '#94a3b8' }}>plaintext</span>}
        </div>
      </div>

      {/* current hop */}
      <div className="text-[11px] text-[#7ea8d0]">
        On the wire now: <span className="text-[#cfe3f5] font-bold">{hopFrom?.label}</span> → <span className="text-[#cfe3f5] font-bold">{hopTo?.label}</span>
        <span className="text-[#5a7a9a]"> · hop {p.hop + 1}/{p.path.length - 1}</span>
      </div>

      {/* layered headers */}
      <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase">Encapsulation — outermost first</div>
      <div className="flex flex-col gap-2">
        {stack.slice().reverse().map((seg, i) => (
          <motion.div key={seg.title} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-md overflow-hidden" style={{ border: `1px solid ${seg.fields[0]?.color ?? '#1e3a5a'}55` }}>
            <div className="px-2 py-1 text-[10px] font-bold flex items-center justify-between"
              style={{ background: (seg.fields[0]?.color ?? '#1e3a5a') + '22', color: seg.fields[0]?.color }}>
              <span>{seg.title}</span><span className="opacity-60">L{seg.layer}</span>
            </div>
            <div className="p-1.5 flex flex-wrap gap-1" style={{ background: '#060d18' }}>
              {seg.fields.map(f => (
                <div key={f.name} className="group relative rounded px-1.5 py-1" style={{ background: f.color + '1c', border: `1px solid ${f.color}3a`, minWidth: 54 }}>
                  <div className="text-[9px] font-bold" style={{ color: f.color }}>{f.name}</div>
                  <div className="text-[10px] font-mono text-[#cfe3f5] truncate max-w-[130px]">{f.value}</div>
                  <div className="absolute z-20 left-0 top-full mt-1 hidden group-hover:block w-48 p-2 rounded text-[10px]"
                    style={{ background: '#02050b', border: `1px solid ${f.color}66`, color: '#a6c4e0' }}>
                    <span className="font-bold" style={{ color: f.color }}>{f.name}</span> · {f.bits} bits<br />{f.description}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-[10px] text-[#5a7a9a] leading-relaxed">
        The application’s data sits at the core; each layer below adds its own header. Only the <span className="text-[#eab308]">Ethernet</span> header
        changes at every hop — the <span className="text-[#38bdf8]">IP</span> addresses stay the same the whole way.
      </div>
    </div>
  )
}

function NodeView({ id }: { id: string }) {
  const n = NODE_BY_ID[id]
  if (!n) return null
  const col = '#38bdf8'
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="font-bold text-sm text-[#cfe3f5]">{n.label}</div>
        <div className="text-xs text-[#7ea8d0]">{n.role}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="rounded p-2" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
          <div className="text-[9px] text-[#5a7a9a] uppercase tracking-wider">IP</div>
          <div className="text-[#cfe3f5]">{n.ip}</div>
        </div>
        <div className="rounded p-2" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
          <div className="text-[9px] text-[#5a7a9a] uppercase tracking-wider">MAC</div>
          <div className="text-[#cfe3f5] truncate">{n.mac}</div>
        </div>
      </div>
      <div className="rounded p-2 text-[10px]" style={{ background: col + '12', border: `1px solid ${col}33` }}>
        <span className="font-bold" style={{ color: col }}>Operates up to Layer {n.layer}</span>
      </div>
      <div className="text-xs text-[#a6c4e0] leading-relaxed">{n.explain}</div>
    </div>
  )
}

export default function Inspector({ packet, nodeId }: { packet: Packet | null; nodeId: string | null }) {
  if (packet) return <PacketView p={packet} />
  if (nodeId) return <NodeView id={nodeId} />
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
      <div className="text-3xl opacity-40">🔍</div>
      <div className="text-xs text-[#7ea8d0]">Click a packet in flight to freeze it and inspect every header.</div>
      <div className="text-[10px] text-[#5a7a9a]">Or click a device to see its role in the network.</div>
    </div>
  )
}
