import { useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Breadcrumb } from './components/Breadcrumb'
import { PageTabs } from './components/PageTabs'
import { EndpointNode } from './components/nodes/EndpointNode'
import { EntityNode } from './components/nodes/EntityNode'
import { JobNode } from './components/nodes/JobNode'
import { ServiceNode } from './components/nodes/ServiceNode'
import { StateMachineNode } from './components/nodes/StateMachineNode'
import { StateMachineSubCanvas } from './components/subcanvas/StateMachineSubCanvas'
import { useCanvasStore, type PageId } from './store/canvas-store'
import { useSync } from './sync/use-sync'

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  service: ServiceNode,
  endpoint: EndpointNode,
  job: JobNode,
  state_machine: StateMachineNode,
}

const PAGE_NODE_TYPES: Record<Exclude<PageId, 'all'>, string> = {
  models: 'entity',
  endpoints: 'endpoint',
  jobs: 'job',
  state_machines: 'state_machine',
  services: 'service',
}

export default function App() {
  const rawNodes = useCanvasStore((s) => s.nodes)
  const rawEdges = useCanvasStore((s) => s.edges)
  const currentPage = useCanvasStore((s) => s.currentPage)
  const drillTarget = useCanvasStore((s) => s.drillTarget)
  const setCurrentPage = useCanvasStore((s) => s.setCurrentPage)
  const setDrillTarget = useCanvasStore((s) => s.setDrillTarget)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)

  useSync()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (drillTarget) setDrillTarget(null)
      else if (currentPage !== 'all') setCurrentPage('all')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drillTarget, currentPage, setDrillTarget, setCurrentPage])

  const { nodes, edges } = useMemo(() => {
    if (currentPage === 'all') {
      return {
        nodes: rawNodes.map((n) => ({ ...n, hidden: false })),
        edges: rawEdges.map((e) => ({ ...e, hidden: false })),
      }
    }
    const allowedType = PAGE_NODE_TYPES[currentPage]
    const visibleIds = new Set(
      rawNodes.filter((n) => n.type === allowedType).map((n) => n.id),
    )
    return {
      nodes: rawNodes.map((n) => ({ ...n, hidden: !visibleIds.has(n.id) })),
      edges: rawEdges.map((e) => ({
        ...e,
        hidden: !(visibleIds.has(e.source) && visibleIds.has(e.target)),
      })),
    }
  }, [currentPage, rawNodes, rawEdges])

  const isDrilled = !!drillTarget
  const drilledNode = drillTarget ? rawNodes.find((n) => n.id === drillTarget) : null

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Breadcrumb />
      {!isDrilled ? <PageTabs /> : null}

      {isDrilled && drilledNode?.type === 'state_machine' ? (
        <StateMachineSubCanvas machineId={drillTarget!} />
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, node) => {
            if (node.type === 'state_machine') setDrillTarget(node.id)
          }}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      )}
    </div>
  )
}
