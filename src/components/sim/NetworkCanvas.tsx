import { useCallback, useRef, useState } from 'react'
import { NODES, LINKS, ZONES, NODE_BY_ID, VIEW_W, VIEW_H } from '../../sim/topology'
import { PROTO_COLOR } from '../../sim/protocols'
import type { NodeState, Packet } from '../../sim/types'
import DeviceIcon from './DeviceIcon'

interface Props {
  packets: Packet[]
  nodeStates: Record<string, NodeState>
  paused: boolean
  selectedPacketId: number | null
  selectedNodeId: string | null
  onSelectPacket: (id: number | null) => void
  onSelectNode: (id: string | null) => void
}

const STATUS_COLOR: Record<string, string> = { warning: '#eab308', compromised: '#ff3366', down: '#ff3366' }

const MEDIUM_DASH: Record<string, string> = { ethernet: '', fiber: '', wan: '6 5', wifi: '2 4' }

function packetXY(p: Packet) {
  const from = NODE_BY_ID[p.path[p.hop]]
  const to = NODE_BY_ID[p.path[Math.min(p.hop + 1, p.path.length - 1)]]
  if (!from || !to) return { x: 0, y: 0 }
  const t = p.status === 'delivered' ? 1 : p.progress
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
}

export default function NetworkCanvas({ packets, nodeStates, paused, selectedPacketId, selectedNodeId, onSelectPacket, onSelectNode }: Props) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [hover, setHover] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  const onWheel = useCallback((e: React.WheelEvent) => {
    const k = Math.max(0.6, Math.min(2.4, view.k - e.deltaY * 0.0012))
    setView(v => ({ ...v, k }))
  }, [view.k])

  const onDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-node]') || (e.target as Element).closest('[data-packet]')) return
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
    setDragging(true)
  }
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return
    setView(v => ({ ...v, x: drag.current!.vx + (e.clientX - drag.current!.x), y: drag.current!.vy + (e.clientY - drag.current!.y) }))
  }
  const onUp = () => { drag.current = null; setDragging(false) }

  return (
    <div className="relative w-full h-full overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 40% 35%, #0a1626 0%, #040810 70%, #02050b 100%)' }}
      onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <svg className="w-full h-full select-none" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onClick={(e) => { if (e.target === e.currentTarget || (e.target as Element).tagName === 'rect') { onSelectPacket(null); onSelectNode(null) } }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#1a3050" strokeWidth="0.5" opacity="0.35" />
          </pattern>
          <filter id="soft"><feGaussianBlur stdDeviation="2.2" /></filter>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <rect x={-200} y={-200} width={VIEW_W + 400} height={VIEW_H + 400} fill="url(#grid)" />

          {/* Zones */}
          {ZONES.map(z => (
            <g key={z.id}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={16}
                fill={z.color + '0c'} stroke={z.color + '44'} strokeWidth={1.5} strokeDasharray="2 6" />
              <text x={z.x + 16} y={z.y + 26} fill={z.color} fontSize={15} fontWeight={700} letterSpacing="1.5"
                fontFamily="system-ui" opacity={0.9}>{z.label}</text>
              <text x={z.x + 16} y={z.y + 44} fill={z.color} fontSize={11} fontFamily="monospace" opacity={0.55}>{z.sub}</text>
            </g>
          ))}

          {/* Links */}
          {LINKS.map((l, i) => {
            const a = NODE_BY_ID[l.a], b = NODE_BY_ID[l.b]
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#2a4a6a" strokeWidth={l.medium === 'wan' ? 2.5 : 2} strokeDasharray={MEDIUM_DASH[l.medium]}
                opacity={0.7} strokeLinecap="round" />
            )
          })}

          {/* Packets */}
          {packets.map(p => {
            const { x, y } = packetXY(p)
            const dropped = p.status === 'dropped'
            const col = dropped ? '#ff3366' : p.malicious ? '#ff5577' : PROTO_COLOR[p.proto]
            const sel = p.id === selectedPacketId
            const r = sel ? 10 : 7
            return (
              <g key={p.id} data-packet transform={`translate(${x} ${y})`} style={{ cursor: 'pointer', opacity: p.fade }}
                onClick={(e) => { e.stopPropagation(); onSelectPacket(p.id) }}>
                <circle r={r + 7} fill={col} opacity={dropped ? 0.3 : 0.22} filter="url(#soft)" />
                {p.encrypted && !dropped && <circle r={r + 3} fill="none" stroke={col} strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />}
                {p.malicious && !dropped && <circle r={r + 4} fill="none" stroke="#ff3366" strokeWidth={1.2} opacity={0.8}>
                  {!paused && <animate attributeName="r" values={`${r + 2};${r + 6};${r + 2}`} dur="0.7s" repeatCount="indefinite" />}
                </circle>}
                <circle r={r} fill={col}>
                  {!sel && !paused && !dropped && <animate attributeName="r" values={`${r};${r + 1.5};${r}`} dur="0.8s" repeatCount="indefinite" />}
                </circle>
                {dropped
                  ? <text y={3.5} textAnchor="middle" fontSize={11} fill="#fff" fontWeight={700}>✕</text>
                  : p.encrypted && <text y={3.5} textAnchor="middle" fontSize={8} fill="#02050b" fontWeight={700}>🔒</text>}
                {sel && <circle r={r + 4} fill="none" stroke="#fff" strokeWidth={1.5} />}
                <text y={-r - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={col} fontFamily="monospace"
                  style={{ paintOrder: 'stroke', stroke: '#02050b', strokeWidth: 3 }}>{dropped ? p.dropReason : p.label}</text>
              </g>
            )
          })}

          {/* Nodes */}
          {NODES.map(n => {
            const st = nodeStates[n.id]
            const col = n.kind === 'switch' ? '#eab308' : n.kind === 'router' ? '#f472b6'
              : n.kind === 'database' ? '#a78bfa' : n.kind === 'website' || n.kind === 'cloud' ? '#f97316'
              : n.kind === 'dns' ? '#38bdf8' : n.kind === 'mail' ? '#a78bfa' : '#22d3ee'
            const sel = n.id === selectedNodeId
            const hov = n.id === hover
            const glow = st?.busy ?? 0
            const statusCol = st && st.status !== 'ok' ? STATUS_COLOR[st.status] : null
            const ringCol = statusCol ?? col
            const W = 76, H = 60
            return (
              <g key={n.id} data-node transform={`translate(${n.x - W / 2} ${n.y - H / 2})`} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                onClick={(e) => { e.stopPropagation(); onSelectNode(n.id) }}>
                {statusCol && (
                  <rect x={-7} y={-7} width={W + 14} height={H + 14} rx={17} fill="none" stroke={statusCol} strokeWidth={2.5} filter="url(#soft)">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="1.1s" repeatCount="indefinite" />
                  </rect>
                )}
                {(glow > 0.02 || sel) && !statusCol && (
                  <rect x={-6} y={-6} width={W + 12} height={H + 12} rx={16}
                    fill="none" stroke={ringCol} strokeWidth={2} opacity={sel ? 0.9 : glow * 0.8} filter="url(#soft)" />
                )}
                <rect width={W} height={H} rx={12}
                  fill={sel ? col + '2a' : hov ? col + '1c' : '#0a1626ee'}
                  stroke={sel || hov ? col : statusCol ? statusCol + 'aa' : col + '66'} strokeWidth={sel ? 2 : 1.3} />
                <g transform={`translate(${W / 2 - 15} 7)`}><DeviceIcon kind={n.kind} color={col} size={30} /></g>
                <text x={W / 2} y={50} textAnchor="middle" fontSize={11} fontWeight={700} fill={hov || sel ? '#fff' : '#cfe3f5'}
                  fontFamily="system-ui">{n.label}</text>
                {n.ip !== '—' && (
                  <text x={W / 2} y={H + 14} textAnchor="middle" fontSize={9.5} fill={col} fontFamily="monospace" opacity={0.75}>{n.ip}</text>
                )}
                {/* load bar for servers */}
                {(n.kind === 'server' || n.kind === 'website' || n.kind === 'database') && st && st.load > 0 && (
                  <rect x={8} y={H - 6} width={(W - 16) * st.load} height={3} rx={1.5}
                    fill={st.load > 0.85 ? '#ff3366' : col} opacity={0.9} />
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {([['+', 0.2], ['−', -0.2], ['⊙', 0]] as [string, number][]).map(([lbl, d]) => (
          <button key={lbl} onClick={() => d === 0 ? setView({ x: 0, y: 0, k: 1 }) : setView(v => ({ ...v, k: Math.max(0.6, Math.min(2.4, v.k + d)) }))}
            className="w-8 h-8 rounded-md text-sm font-bold grid place-items-center transition-colors"
            style={{ background: '#0a1626', border: '1px solid #1e3a5a', color: '#38bdf8' }}>{lbl}</button>
        ))}
      </div>
      <div className="absolute bottom-3 left-3 text-[10px] font-mono" style={{ color: '#38bdf855' }}>
        {Math.round(view.k * 100)}% · scroll to zoom · drag to pan · click a packet to inspect
      </div>
      {paused && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5"
          style={{ background: '#eab30820', border: '1px solid #eab30855', color: '#eab308' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#eab308' }} />FROZEN — click any packet to inspect
        </div>
      )}
    </div>
  )
}
