import { motion, AnimatePresence } from 'framer-motion'
import { ATTACKS, DEFENSES } from '../../sim/security'
import type { SimApi } from '../../sim/engine'

export default function SecurityPanel({ sim }: { sim: SimApi }) {
  const allOn = sim.enabledDefenses.size === DEFENSES.length
  const atk = ATTACKS.find(a => a.id === sim.activeAttack)

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
      <div className="rounded-md p-2.5 text-[11px] text-[#a6c4e0] leading-relaxed" style={{ background: '#ff33660c', border: '1px solid #ff336626' }}>
        Launch an attack and watch where the network’s defenses stop it. Toggle a defense off to see what gets through — then turn it back on.
      </div>

      <div>
        <div className="text-[10px] font-bold text-[#ff3366] tracking-widest uppercase mb-2">Attack simulations</div>
        <div className="flex flex-col gap-1.5">
          {ATTACKS.map(a => {
            const on = sim.activeAttack === a.id
            return (
              <button key={a.id} onClick={() => sim.launchAttack(a.id)}
                className="text-left rounded-md px-2.5 py-2 transition-colors"
                style={{ background: on ? '#ff336622' : '#0a1626', border: `1px solid ${on ? '#ff3366' : '#1e3a5a'}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{a.icon}</span>
                  <span className="text-xs font-bold text-[#cfe3f5]">{a.name}</span>
                  <span className="ml-auto text-[8px] px-1 py-0.5 rounded font-bold"
                    style={{ background: a.severity === 'critical' ? '#ff336622' : '#eab30822', color: a.severity === 'critical' ? '#ff3366' : '#eab308' }}>
                    {a.severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {a.layers.map(l => (
                    <span key={l} className="text-[8px] px-1 rounded font-mono" style={{ background: '#38bdf818', color: '#38bdf8' }}>L{l}</span>
                  ))}
                  {on && <span className="text-[9px] text-[#ff3366] ml-auto">running…</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {atk && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-lg overflow-hidden" style={{ background: '#ff33660e', border: '1px solid #ff336633' }}>
            <div className="p-2.5">
              <div className="text-xs font-bold text-[#ff3366] mb-1">{atk.icon} {atk.name}</div>
              <div className="text-[11px] text-[#a6c4e0] leading-relaxed mb-2">{atk.story}</div>
              <div className="rounded p-2 text-[11px] leading-relaxed" style={{ background: '#22c55e12', border: '1px solid #22c55e33', color: '#86efac' }}>
                🛡 {atk.mitigation}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#22c55e] tracking-widest uppercase">Defenses</span>
          <button onClick={() => sim.setAllDefenses(!allOn)} className="text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: '#0a1626', border: '1px solid #1e3a5a', color: '#7ea8d0' }}>{allOn ? 'Disable all' : 'Enable all'}</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {DEFENSES.map(d => {
            const on = sim.enabledDefenses.has(d.id)
            return (
              <div key={d.id} className="rounded-md p-2" style={{ background: on ? d.color + '12' : '#0a1626', border: `1px solid ${on ? d.color + '55' : '#1e3a5a'}` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate" style={{ color: on ? d.color : '#7ea8d0' }}>{d.short} · {d.name}</div>
                  </div>
                  <button onClick={() => sim.toggleDefense(d.id)} className="shrink-0 rounded-full relative transition-colors" style={{ background: on ? d.color : '#1e3a5a', width: 36, height: 18 }}>
                    <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all" style={{ left: on ? 20 : 2 }} />
                  </button>
                </div>
                <div className="text-[10px] text-[#7ea8d0] mt-1 leading-snug">{d.desc}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
