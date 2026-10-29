import { motion, AnimatePresence } from 'framer-motion'
import { SCENARIOS } from '../../sim/scenarios'
import type { SimApi } from '../../sim/engine'

const PRESETS: { label: string; icon: string; opts: Parameters<SimApi['sendCustom']>[0] }[] = [
  { label: 'HTTPS request', icon: '🌐', opts: { proto: 'HTTPS', src: 'alice', dst: 'site', srcPort: 54321, dstPort: 443, flags: 'PSH,ACK', payload: 'GET /', summary: 'encrypted web request', encrypted: true } },
  { label: 'DNS lookup', icon: '🔎', opts: { proto: 'DNS', src: 'alice', dst: 'dns', srcPort: 54000, dstPort: 53, payload: 'A? example.com', summary: 'name lookup' } },
  { label: 'Ping', icon: '📡', opts: { proto: 'ICMP', src: 'alice', dst: 'site', srcPort: 0, dstPort: 0, payload: 'echo request', summary: 'ICMP echo' } },
  { label: 'File read (SMB)', icon: '📁', opts: { proto: 'SMB', src: 'bob', dst: 'files', srcPort: 49200, dstPort: 445, flags: 'PSH,ACK', payload: 'read q4.xlsx', summary: 'LAN file access' } },
]

export default function SimControls({ sim }: { sim: SimApi }) {
  const active = sim.scenario
  const step = active ? active.scn.steps[active.step] : null

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
      <div>
        <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase mb-2">Guided walkthroughs</div>
        <div className="flex flex-col gap-1.5">
          {SCENARIOS.map(s => {
            const on = active?.scn.id === s.id
            return (
              <button key={s.id} onClick={() => on ? sim.stopScenario() : sim.playScenario(s.id)}
                className="text-left rounded-md px-2.5 py-2 transition-colors"
                style={{ background: on ? '#38bdf822' : '#0a1626', border: `1px solid ${on ? '#38bdf8' : '#1e3a5a'}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs font-bold" style={{ color: on ? '#38bdf8' : '#cfe3f5' }}>{s.name}</span>
                  {on && <span className="ml-auto text-[9px] text-[#f87171]">■ stop</span>}
                </div>
                {!on && <div className="text-[10px] text-[#5a7a9a] mt-1 leading-snug">{s.blurb}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* active scenario narration */}
      <AnimatePresence>
        {active && step && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-lg overflow-hidden" style={{ background: '#38bdf80e', border: '1px solid #38bdf833' }}>
            <div className="p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#38bdf8]">STEP {active.step + 1} / {active.scn.steps.length}</span>
                <span className="text-[10px] px-1.5 rounded font-mono" style={{ background: '#38bdf822', color: '#38bdf8' }}>L{step.layer}</span>
              </div>
              <div className="text-xs font-bold text-[#cfe3f5] mb-1">{step.title}</div>
              <div className="text-[11px] text-[#a6c4e0] leading-relaxed">{step.narrate}</div>
              <div className="flex gap-1.5 mt-2.5">
                <button onClick={sim.stepScenario} className="flex-1 py-1 rounded text-[11px] font-bold"
                  style={{ background: '#38bdf822', border: '1px solid #38bdf855', color: '#38bdf8' }}>Step ▶</button>
                <button onClick={sim.stopScenario} className="px-3 py-1 rounded text-[11px] font-bold"
                  style={{ background: '#0a1626', border: '1px solid #1e3a5a', color: '#7ea8d0' }}>Stop</button>
              </div>
              <div className="mt-2 flex gap-0.5">
                {active.scn.steps.map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= active.step ? '#38bdf8' : '#1e3a5a' }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* send a single packet */}
      <div>
        <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase mb-2">Send one packet</div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => sim.sendCustom(p.opts)}
              className="rounded-md px-2 py-2 text-left transition-colors hover:brightness-125"
              style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
              <div className="text-sm">{p.icon}</div>
              <div className="text-[10px] font-bold text-[#cfe3f5] leading-tight mt-0.5">{p.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* traffic + speed */}
      <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-[#1e3a5a]">
        <label className="flex items-center justify-between text-[11px] text-[#a6c4e0]">
          <span>Background traffic</span>
          <button onClick={() => sim.setAmbient(!sim.ambient)}
            className="w-10 h-5 rounded-full relative transition-colors" style={{ background: sim.ambient ? '#22c55e' : '#1e3a5a' }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: sim.ambient ? 22 : 2 }} />
          </button>
        </label>
        <div className="text-[11px] text-[#a6c4e0]">
          <div className="flex justify-between mb-1"><span>Speed</span><span className="font-mono text-[#38bdf8]">{sim.speed.toFixed(1)}×</span></div>
          <input type="range" min={0.3} max={3} step={0.1} value={sim.speed} onChange={e => sim.setSpeed(Number(e.target.value))}
            className="w-full accent-[#38bdf8]" />
        </div>
        <button onClick={sim.reset} className="py-1.5 rounded text-[11px] font-bold"
          style={{ background: '#0a1626', border: '1px solid #1e3a5a', color: '#7ea8d0' }}>↺ Reset simulation</button>
      </div>
    </div>
  )
}
