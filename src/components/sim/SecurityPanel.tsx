import { motion, AnimatePresence } from 'framer-motion'
import { ATTACKS, DEFENSES } from '../../sim/security'
import { VANTAGE_POINTS, VANTAGE_BY_ID } from '../../sim/vantage'
import type { SimApi } from '../../sim/engine'

interface Props {
  sim: SimApi
  intercept: boolean
  setIntercept: (v: boolean) => void
  vantageId: string | null
  setVantageId: (id: string | null) => void
}

function AttacksView({ sim }: { sim: SimApi }) {
  const allOn = sim.enabledDefenses.size === DEFENSES.length
  const atk = ATTACKS.find(a => a.id === sim.activeAttack)
  return (
    <>
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
                  {a.layers.map(l => (<span key={l} className="text-[8px] px-1 rounded font-mono" style={{ background: '#38bdf818', color: '#38bdf8' }}>L{l}</span>))}
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
              <div className="rounded p-2 text-[11px] leading-relaxed" style={{ background: '#22c55e12', border: '1px solid #22c55e33', color: '#86efac' }}>🛡 {atk.mitigation}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#22c55e] tracking-widest uppercase">Defenses</span>
          <button onClick={() => sim.setAllDefenses(!allOn)} className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#0a1626', border: '1px solid #1e3a5a', color: '#7ea8d0' }}>{allOn ? 'Disable all' : 'Enable all'}</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {DEFENSES.map(d => {
            const on = sim.enabledDefenses.has(d.id)
            return (
              <div key={d.id} className="rounded-md p-2" style={{ background: on ? d.color + '12' : '#0a1626', border: `1px solid ${on ? d.color + '55' : '#1e3a5a'}` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold truncate" style={{ color: on ? d.color : '#7ea8d0' }}>{d.short} · {d.name}</div>
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
    </>
  )
}

function InterceptView({ vantageId, setVantageId }: { vantageId: string | null; setVantageId: (id: string | null) => void }) {
  const v = vantageId ? VANTAGE_BY_ID[vantageId] : null
  return (
    <>
      <div className="rounded-md p-2.5 text-[11px] text-[#a6c4e0] leading-relaxed" style={{ background: '#38bdf80c', border: '1px solid #38bdf826' }}>
        An attacker can only read what passes its position. <span className="text-[#cfe3f5] font-bold">Where</span> it sits sets <span className="text-[#cfe3f5] font-bold">which OSI layer</span> it works at and what it sees. Pick a vantage point — it appears on the map, and the traffic it can observe lights up. Then click a packet crossing it.
      </div>
      <div>
        <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase mb-2">Attacker vantage points</div>
        <div className="flex flex-col gap-1.5">
          {VANTAGE_POINTS.map(p => {
            const on = vantageId === p.id
            return (
              <button key={p.id} onClick={() => setVantageId(on ? null : p.id)}
                className="text-left rounded-md px-2.5 py-2 transition-colors"
                style={{ background: on ? p.color + '22' : '#0a1626', border: `1px solid ${on ? p.color : '#1e3a5a'}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-1 rounded font-bold" style={{ background: p.color + '26', color: p.color }}>L{p.layer}</span>
                  <span className="text-xs font-bold text-[#cfe3f5]">{p.name}</span>
                </div>
                <div className="text-[10px] text-[#7ea8d0] mt-1 leading-snug">{p.summary}</div>
              </button>
            )
          })}
        </div>
      </div>
      <AnimatePresence>
        {v && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-lg overflow-hidden" style={{ background: v.color + '0e', border: `1px solid ${v.color}40` }}>
            <div className="p-2.5 flex flex-col gap-2.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono px-1 rounded font-bold" style={{ background: v.color + '26', color: v.color }}>Operates at L{v.layer}</span>
                </div>
                <div className="text-xs font-bold text-[#cfe3f5]">{v.name}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-[#7ea8d0] tracking-widest uppercase mb-1">How</div>
                <div className="text-[11px] text-[#a6c4e0] leading-relaxed">{v.technique}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-[#f87171] tracking-widest uppercase mb-1">Can access</div>
                <ul className="flex flex-col gap-1">
                  {v.access.map((a, i) => (<li key={i} className="text-[11px] text-[#e6b4bc] leading-snug flex gap-1.5"><span style={{ color: v.color }}>▸</span>{a}</li>))}
                </ul>
              </div>
              <div>
                <div className="text-[9px] font-bold text-[#4ade80] tracking-widest uppercase mb-1">Cannot read</div>
                <ul className="flex flex-col gap-1">
                  {v.blind.map((a, i) => (<li key={i} className="text-[11px] text-[#9fd8b4] leading-snug flex gap-1.5"><span className="text-[#22c55e]">✕</span>{a}</li>))}
                </ul>
              </div>
              <div className="rounded p-2" style={{ background: '#22c55e10', border: '1px solid #22c55e30' }}>
                <div className="text-[9px] font-bold text-[#22c55e] tracking-widest uppercase mb-1">🛡 What stops it</div>
                <ul className="flex flex-col gap-1">
                  {v.stoppedBy.map((a, i) => (<li key={i} className="text-[11px] text-[#86efac] leading-snug flex gap-1.5"><span>•</span>{a}</li>))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function SecurityPanel({ sim, intercept, setIntercept, vantageId, setVantageId }: Props) {
  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
      <div className="flex gap-1 rounded-md p-0.5" style={{ background: '#0a1626', border: '1px solid #1e3a5a' }}>
        <button onClick={() => setIntercept(false)} className="flex-1 py-1 rounded text-[11px] font-bold transition-colors"
          style={{ background: !intercept ? '#ff336622' : 'transparent', color: !intercept ? '#ff3366' : '#7ea8d0' }}>⚔ Attacks</button>
        <button onClick={() => setIntercept(true)} className="flex-1 py-1 rounded text-[11px] font-bold transition-colors"
          style={{ background: intercept ? '#38bdf822' : 'transparent', color: intercept ? '#38bdf8' : '#7ea8d0' }}>👁 Interception</button>
      </div>
      {intercept ? <InterceptView vantageId={vantageId} setVantageId={setVantageId} /> : <AttacksView sim={sim} />}
    </div>
  )
}
