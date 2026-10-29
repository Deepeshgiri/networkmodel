import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KNOWLEDGE_NODES } from '../../data/knowledgeNodes'

const LAYER_COLORS: Record<number, string> = { 1: '#f97316', 2: '#eab308', 3: '#38bdf8', 4: '#22c55e', 5: '#a78bfa', 6: '#ff3366', 7: '#2dd4bf' }
const DEVICES: Record<number, string> = {
  1: 'Cables · hubs · repeaters · radio', 2: 'Switches · NICs · MAC addresses', 3: 'Routers · IP addresses',
  4: 'Firewalls · TCP/UDP ports', 5: 'Session managers · sockets', 6: 'TLS · compression · encoding', 7: 'Browsers · servers · apps',
}
const TCPIP: Record<number, string> = { 7: 'Application', 6: 'Application', 5: 'Application', 4: 'Transport', 3: 'Internet', 2: 'Link', 1: 'Link' }

// a worked example: an HTTPS request being wrapped down the stack
const ENCAP = [
  { layer: 7, label: 'Data', detail: 'GET / HTTP/2  ·  Host: example.com', color: '#2dd4bf' },
  { layer: 6, label: '+ TLS', detail: 'encrypted with AES-256-GCM 🔒', color: '#ff3366' },
  { layer: 4, label: '+ TCP header', detail: 'src 54321 → dst 443  ·  seq/ack', color: '#22c55e' },
  { layer: 3, label: '+ IP header', detail: '10.0.1.10 → 93.184.215.14  ·  TTL 64', color: '#38bdf8' },
  { layer: 2, label: '+ Ethernet', detail: 'src/dst MAC  ·  FCS checksum', color: '#eab308' },
  { layer: 1, label: '→ Bits', detail: '0100100001010100…  on the wire', color: '#f97316' },
]

export default function OSIModel() {
  const [open, setOpen] = useState<number | null>(7)

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin', background: 'radial-gradient(ellipse at 50% 0%, #0a1626 0%, #040810 80%)' }}>
      <div className="max-w-5xl mx-auto p-5 grid gap-5" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
        {/* stack */}
        <div>
          <h2 className="text-lg font-bold text-[#cfe3f5]">The OSI Model</h2>
          <p className="text-xs text-[#7ea8d0] mb-4">Seven layers of abstraction. Each layer adds its own header as data travels down, and strips it off on the way back up. Click a layer.</p>

          <div className="flex items-center gap-2 mb-2 text-[10px] font-bold tracking-widest">
            <span className="flex-1 text-center py-1 rounded" style={{ background: '#38bdf818', color: '#38bdf8', border: '1px solid #38bdf833' }}>OSI · 7 LAYERS</span>
            <span className="text-[#5a7a9a]">↔</span>
            <span className="flex-1 text-center py-1 rounded" style={{ background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}>TCP/IP · 4 LAYERS</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {[7, 6, 5, 4, 3, 2, 1].map(layer => {
              const node = KNOWLEDGE_NODES.find(n => n.layer === layer)
              const color = LAYER_COLORS[layer]
              const isOpen = open === layer
              return (
                <motion.div key={layer} layout onClick={() => setOpen(isOpen ? null : layer)}
                  className="cursor-pointer rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${isOpen ? color : color + '33'}`, boxShadow: isOpen ? `0 0 18px ${color}26` : 'none' }}>
                  <div className="flex items-stretch">
                    <div className="w-11 grid place-items-center text-base font-bold flex-shrink-0" style={{ background: color + '26', color }}>{layer}</div>
                    <div className="flex-1 p-2.5" style={{ background: isOpen ? color + '10' : '#0a1626' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold" style={{ color: isOpen ? color : '#cfe3f5' }}>{node?.title.replace(' Layer', '')}</div>
                          <div className="text-[10px] text-[#7ea8d0]">{DEVICES[layer]}</div>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold flex-shrink-0" style={{ background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}>{TCPIP[layer]}</span>
                      </div>
                      <AnimatePresence>
                        {isOpen && node && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: color + '2a' }}>
                              <p className="text-[11px] text-[#a6c4e0] leading-relaxed mb-2">{node.description}</p>
                              <p className="text-[11px] text-[#7ea8d0] leading-relaxed mb-2.5">{node.deepDive}</p>
                              <div className="flex flex-wrap gap-1">
                                {node.relatedProtocols.map(p => (
                                  <span key={p} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: color + '1c', color, border: `1px solid ${color}33` }}>{p}</span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* encapsulation sidebar */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg p-3" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
            <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase mb-1">Encapsulation</div>
            <p className="text-[11px] text-[#7ea8d0] leading-relaxed mb-3">Following one HTTPS request as it is wrapped down the stack:</p>
            <div className="flex flex-col gap-1">
              {ENCAP.map((e, i) => (
                <motion.div key={e.layer} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}
                  className="rounded px-2 py-1.5" style={{ background: e.color + '12', border: `1px solid ${e.color}30`, marginLeft: i * 7 }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1 rounded" style={{ background: e.color + '26', color: e.color }}>L{e.layer}</span>
                    <span className="text-[11px] font-bold" style={{ color: e.color }}>{e.label}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#a6c4e0] mt-0.5 truncate">{e.detail}</div>
                </motion.div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 text-[10px]">
              <span className="text-[#38bdf8]">↓ sender wraps</span>
              <span className="text-[#22c55e]">↑ receiver unwraps</span>
            </div>
          </div>
          <div className="rounded-lg p-3 text-[11px] text-[#a6c4e0] leading-relaxed" style={{ background: '#38bdf80c', border: '1px solid #38bdf826' }}>
            <span className="font-bold text-[#38bdf8]">Mnemonic:</span> “Please Do Not Throw Sausage Pizza Away” — Physical, Data link, Network, Transport, Session, Presentation, Application.
          </div>
        </div>
      </div>
    </div>
  )
}
