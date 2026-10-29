import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import NetworkSimulation from './components/sim/NetworkSimulation'
import OSIModel from './components/views/OSIModel'
import HardwareView from './components/views/HardwareView'

type View = 'sim' | 'osi' | 'hardware'

const VIEWS: { id: View; label: string; icon: string; color: string }[] = [
  { id: 'sim', label: 'Network Simulation', icon: '🖧', color: '#38bdf8' },
  { id: 'osi', label: 'OSI Model', icon: '📚', color: '#a78bfa' },
  { id: 'hardware', label: 'Inside the Machine', icon: '🔩', color: '#eab308' },
]

function Navbar({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <header className="flex items-center gap-4 px-4 py-2.5 flex-shrink-0" style={{ background: '#060f1c', borderBottom: '1px solid #0f2238' }}>
      <div className="flex items-center gap-2.5">
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="w-7 h-7 rounded-lg grid place-items-center text-sm" style={{ background: '#38bdf818', border: '1px solid #38bdf844' }}>🌐</motion.div>
        <div>
          <div className="text-sm font-bold tracking-wide text-[#cfe3f5]">NetScope</div>
          <div className="text-[9px] text-[#5a7a9a] tracking-widest uppercase">Network & security explainer</div>
        </div>
      </div>
      <nav className="flex gap-1.5 ml-2">
        {VIEWS.map(v => {
          const on = view === v.id
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
              style={{ background: on ? v.color + '20' : 'transparent', border: `1px solid ${on ? v.color : '#1e3a5a'}`, color: on ? v.color : '#7ea8d0' }}>
              <span>{v.icon}</span><span className="hidden md:inline">{v.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="ml-auto hidden lg:flex items-center gap-2 text-[10px] font-mono text-[#5a7a9a]">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
        <span>live simulation</span>
      </div>
    </header>
  )
}

export default function App() {
  const [view, setView] = useState<View>('sim')
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#040810' }}>
      <Navbar view={view} setView={setView} />
      <main className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">
            {view === 'sim' && <NetworkSimulation />}
            {view === 'osi' && <OSIModel />}
            {view === 'hardware' && <HardwareView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
