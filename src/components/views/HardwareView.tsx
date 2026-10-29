import { motion } from 'framer-motion'

const STACK = [
  { label: 'User space', sub: 'Applications', color: '#2dd4bf', items: ['Browser', 'curl', 'SSH', 'OpenSSL'],
    note: 'Your program calls send() / recv(). It never touches the hardware directly.' },
  { label: 'System calls', sub: 'The kernel boundary', color: '#22c55e', items: ['socket()', 'connect()', 'send()', 'recv()'],
    note: 'A controlled doorway into the kernel. Data is copied from the app into kernel memory.' },
  { label: 'Kernel network stack', sub: 'TCP/IP implementation', color: '#38bdf8', items: ['TCP/IP', 'netfilter / firewall', 'sk_buff', 'routing table'],
    note: 'The kernel builds the TCP and IP headers, decides which interface to use, and applies firewall rules.' },
  { label: 'Driver + DMA', sub: 'Talking to the card', color: '#a78bfa', items: ['NIC driver', 'ring buffer', 'DMA engine', 'IRQ'],
    note: 'The driver hands the packet to the NIC. DMA lets the card read it straight from RAM without the CPU copying each byte.' },
  { label: 'Hardware', sub: 'Network interface card', color: '#eab308', items: ['NIC ASIC', 'PHY chip', 'RJ-45 / SFP', 'the wire'],
    note: 'The PHY turns bytes into electrical, optical or radio signals — the actual Physical layer.' },
]

const COMPONENTS = [
  { label: 'CPU', sub: 'runs the network stack', color: '#38bdf8' },
  { label: 'RAM', sub: 'holds socket buffers', color: '#22c55e' },
  { label: 'NIC', sub: 'sends/receives frames', color: '#eab308' },
  { label: 'PCIe bus', sub: 'CPU ↔ NIC at high speed', color: '#a78bfa' },
]

export default function HardwareView() {
  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', background: 'radial-gradient(ellipse at 50% 0%, #0a1626 0%, #040810 80%)' }}>
      <div className="max-w-4xl mx-auto p-5">
        <h2 className="text-lg font-bold text-[#cfe3f5]">Inside the machine</h2>
        <p className="text-xs text-[#7ea8d0] mb-5">What happens between your app and the wire. A packet travels <span className="text-[#38bdf8] font-bold">down</span> this stack to be sent, and back <span className="text-[#22c55e] font-bold">up</span> when received.</p>

        {/* hardware row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {COMPONENTS.map(c => (
            <div key={c.label} className="rounded-lg p-3 text-center" style={{ background: c.color + '10', border: `1px solid ${c.color}33` }}>
              <div className="text-sm font-bold" style={{ color: c.color }}>{c.label}</div>
              <div className="text-[10px] text-[#7ea8d0] mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* kernel stack with travelling packet */}
        <div className="relative flex flex-col gap-2">
          {/* animated packet going down then implied back up */}
          <motion.div className="absolute left-[-14px] w-2.5 h-2.5 rounded-full z-10"
            style={{ background: '#fff', boxShadow: '0 0 10px #38bdf8' }}
            animate={{ top: ['2%', '92%', '92%', '2%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.55, 1] }} />
          {STACK.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-lg p-3" style={{ background: s.color + '0e', border: `1px solid ${s.color}30` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-[10px] text-[#7ea8d0]">{s.sub}</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 rounded" style={{ background: s.color + '20', color: s.color }}>{i + 1}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {s.items.map(it => (
                  <span key={it} className="text-[9.5px] px-1.5 py-0.5 rounded font-mono" style={{ background: s.color + '18', color: s.color, border: `1px solid ${s.color}2a` }}>{it}</span>
                ))}
              </div>
              <p className="text-[11px] text-[#a6c4e0] leading-relaxed">{s.note}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 rounded-lg p-3" style={{ background: '#eab3080c', border: '1px solid #eab30826' }}>
          <div className="text-[10px] font-bold text-[#eab308] tracking-widest uppercase mb-1">Receive path (DMA)</div>
          <p className="text-[11px] text-[#a6c4e0] leading-relaxed font-mono">
            wire → PHY → NIC → <span className="text-[#a78bfa]">DMA into RAM ring buffer</span> → IRQ wakes the CPU → driver → kernel TCP/IP → socket buffer → your app’s recv()
          </p>
        </div>
      </div>
    </div>
  )
}
