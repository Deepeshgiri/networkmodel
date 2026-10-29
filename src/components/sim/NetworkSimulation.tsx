import { useState } from 'react'
import { useSimulation } from '../../sim/engine'
import NetworkCanvas from './NetworkCanvas'
import SimControls from './SimControls'
import Inspector from './Inspector'
import ActivityPanel from './ActivityPanel'

export default function NetworkSimulation() {
  const sim = useSimulation()
  const [selPacket, setSelPacket] = useState<number | null>(null)
  const [selNode, setSelNode] = useState<string | null>(null)

  // keep selected packet live as it moves; drop selection once it is gone
  const packet = sim.packets.find(p => p.id === selPacket) ?? null

  return (
    <div className="flex h-full min-h-0">
      {/* left — controls / scenarios */}
      <div className="flex-shrink-0 p-3" style={{ width: 268, borderRight: '1px solid #0f2238', background: '#060f1c' }}>
        <SimControls sim={sim} />
      </div>

      {/* center — canvas */}
      <div className="flex-1 min-w-0 relative">
        <NetworkCanvas
          packets={sim.packets}
          nodeStates={sim.nodeStates}
          selectedPacketId={selPacket}
          selectedNodeId={selNode}
          onSelectPacket={setSelPacket}
          onSelectNode={setSelNode}
        />
      </div>

      {/* right — inspector + activity */}
      <div className="flex-shrink-0 flex flex-col" style={{ width: 312, borderLeft: '1px solid #0f2238', background: '#060f1c' }}>
        <div className="flex-1 min-h-0 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', borderBottom: '1px solid #0f2238' }}>
          <div className="text-[10px] font-bold text-[#38bdf8] tracking-widest uppercase mb-2">
            {packet ? 'Packet inspector' : selNode ? 'Device' : 'Inspector'}
          </div>
          <Inspector packet={packet} nodeId={selNode} />
        </div>
        <div className="flex-shrink-0 p-3" style={{ height: 320 }}>
          <ActivityPanel metrics={sim.metrics} history={sim.history} logs={sim.logs} />
        </div>
      </div>
    </div>
  )
}
