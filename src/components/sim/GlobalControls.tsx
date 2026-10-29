import type { SimApi } from '../../sim/engine'

export default function GlobalControls({ sim }: { sim: SimApi }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <button onClick={() => sim.setPaused(!sim.paused)}
          className="flex-1 py-1.5 rounded text-[11px] font-bold transition-colors"
          style={{ background: sim.paused ? '#eab30822' : '#22c55e18', border: `1px solid ${sim.paused ? '#eab308' : '#22c55e55'}`, color: sim.paused ? '#eab308' : '#22c55e' }}>
          {sim.paused ? '▶ Resume' : '⏸ Freeze'}
        </button>
        <button onClick={sim.stepOnce} disabled={!sim.paused}
          className="flex-1 py-1.5 rounded text-[11px] font-bold transition-colors disabled:opacity-30"
          style={{ background: '#13243a', border: '1px solid #1e3a5a', color: '#38bdf8' }}>
          Step ▶▌
        </button>
      </div>
      {sim.paused && <div className="text-[9px] text-[#eab308] text-center -mt-1">Frozen — click any packet anywhere to inspect it</div>}
      <label className="flex items-center justify-between text-[11px] text-[#a6c4e0]">
        <span>Background traffic</span>
        <button onClick={() => sim.setAmbient(!sim.ambient)} className="rounded-full relative transition-colors" style={{ background: sim.ambient ? '#22c55e' : '#1e3a5a', width: 40, height: 20 }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: sim.ambient ? 22 : 2 }} />
        </button>
      </label>
      <div className="text-[11px] text-[#a6c4e0]">
        <div className="flex justify-between mb-1"><span>Speed</span><span className="font-mono text-[#38bdf8]">{sim.speed.toFixed(1)}×</span></div>
        <input type="range" min={0.3} max={3} step={0.1} value={sim.speed} onChange={e => sim.setSpeed(Number(e.target.value))} className="w-full accent-[#38bdf8]" />
      </div>
      <button onClick={sim.reset} className="py-1.5 rounded text-[11px] font-bold" style={{ background: '#0a1626', border: '1px solid #1e3a5a', color: '#7ea8d0' }}>↺ Reset simulation</button>
    </div>
  )
}
