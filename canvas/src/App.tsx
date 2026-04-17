import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EndpointNode } from './components/nodes/EndpointNode'
import { EntityNode } from './components/nodes/EntityNode'
import { JobNode } from './components/nodes/JobNode'
import { ServiceNode } from './components/nodes/ServiceNode'
import { StateMachineNode } from './components/nodes/StateMachineNode'
import { useCanvasStore } from './store/canvas-store'
import { useSync } from './sync/use-sync'

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  service: ServiceNode,
  endpoint: EndpointNode,
  job: JobNode,
  state_machine: StateMachineNode,
}

export default function App() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)

  useSync()

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
