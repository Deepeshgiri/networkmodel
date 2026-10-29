import type { HistoryPoint, LogEntry, Metrics } from '../../sim/types'

const LEVEL_COLOR: Record<string, string> = {
  info: '#7ea8d0', success: '#4ade80', warn: '#fbbf24', alert: '#fb923c', block: '#4ade80', breach: '#ff3366',
}

function Sparkline({ data }: { data: HistoryPoint[] }) {
  const w = 240, h = 40
  if (data.length < 2) return <svg width="100%" viewBox={`0 0 ${w} ${h}`} />
  const max = Math.max(4, ...data.map(d => d.inFlight))
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.inFlight / max) * (h - 4) - 2}`)
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <polyline points={pts.join(' ')} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="#38bdf81a" />
    </svg>
  )
}

export default function ActivityPanel({ metrics, history, logs }: { metrics: Metrics; history: HistoryPoint[]; logs: LogEntry[] }) {
  const stats = [
    { label: 'Delivered', value: metrics.delivered, color: '#22c55e' },
    { label: 'Blocked', value: metrics.blocked, color: '#4ade80' },
    { label: 'Alerts', value: metrics.alerts, color: '#fb923c' },
    { label: 'Breaches', value: metrics.breaches, color: '#ff3366' },
  ]
  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="grid grid-cols-4 gap-1.5">
        {stats.map(s => (
          <div key={s.label} className="rounded-md px-1 py-1.5 text-center" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
            <div className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[8px] text-[#5a7a9a] uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-md px-2 pt-1.5 pb-1" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
        <div className="text-[9px] text-[#5a7a9a] uppercase tracking-wider mb-0.5">Packets in flight</div>
        <Sparkline data={history} />
      </div>
      <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase">Event log</div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-md font-mono text-[10px] leading-relaxed"
        style={{ background: '#060d18', border: '1px solid #1e3a5a', scrollbarWidth: 'thin' }}>
        {logs.length === 0 && <div className="p-2 text-[#5a7a9a]">No events yet — start a walkthrough or send a packet.</div>}
        {logs.map(l => (
          <div key={l.id} className="px-2 py-0.5 flex gap-1.5 border-b border-[#0f1f30]">
            <span className="text-[#3a5a7a]">{new Date(l.t).toLocaleTimeString([], { hour12: false })}</span>
            <span className="font-bold shrink-0" style={{ color: LEVEL_COLOR[l.level] }}>{l.source}</span>
            <span className="text-[#a6c4e0]">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
