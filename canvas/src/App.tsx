import { useEffect, useMemo, useRef } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
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
import { CodePanel } from './components/code/CodePanel'
import { FilePage } from './components/pages/FilePage'
import { SystemView } from './components/pages/SystemView'
import { useCanvasStore, type PageId } from './store/canvas-store'
import { useSync } from './sync/use-sync'

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  service: ServiceNode,
  endpoint: EndpointNode,
  job: JobNode,
  state_machine: StateMachineNode,
}

const GRAPH_PAGE_TYPES: Partial<Record<PageId, string>> = {
  models: 'entity',
  state_machines: 'state_machine',
}

function ViewportController() {
  const rf = useReactFlow()
  const pageEnterToken = useCanvasStore((s) => s.pageEnterToken)
  const focusRequest = useCanvasStore((s) => s.focusRequest)
  const currentPage = useCanvasStore((s) => s.currentPage)
  const rawNodes = useCanvasStore((s) => s.nodes)

  const firstFit = useRef(false)

  useEffect(() => {
    const allowedType = GRAPH_PAGE_TYPES[currentPage]
    if (!allowedType) return
    const visible = rawNodes.filter((n) => n.type === allowedType)
    if (visible.length === 0) return
    const t = setTimeout(() => {
      rf.fitView({
        nodes: visible.map((n) => ({ id: n.id })),
        padding: 0.25,
        duration: firstFit.current ? 400 : 0,
      })
      firstFit.current = true
    }, 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageEnterToken, currentPage, rawNodes.length])

  useEffect(() => {
    if (!focusRequest) return
    const node = rawNodes.find((n) => n.id === focusRequest.nodeId)
    if (!node) return
    const t = setTimeout(() => {
      const width = (node as { width?: number }).width ?? 220
      const height = (node as { height?: number }).height ?? 120
      const x = node.position.x + width / 2
      const y = node.position.y + height / 2
      rf.setCenter(x, y, { zoom: 1.1, duration: 500 })
    }, 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.token])

  return null
}

export default function App() {
  const rawNodes = useCanvasStore((s) => s.nodes)
  const rawEdges = useCanvasStore((s) => s.edges)
  const currentPage = useCanvasStore((s) => s.currentPage)
  const drillTarget = useCanvasStore((s) => s.drillTarget)
  const codePanelNodeId = useCanvasStore((s) => s.codePanelNodeId)
  const setDrillTarget = useCanvasStore((s) => s.setDrillTarget)
  const setCodePanel = useCanvasStore((s) => s.setCodePanel)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)

  useSync()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (codePanelNodeId) setCodePanel(null)
      else if (drillTarget) setDrillTarget(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drillTarget, codePanelNodeId, setDrillTarget, setCodePanel])

  const { nodes, edges } = useMemo(() => {
    const allowedType = GRAPH_PAGE_TYPES[currentPage]
    if (!allowedType) return { nodes: [], edges: [] }
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
  const isGraphPage = !!GRAPH_PAGE_TYPES[currentPage]
  const isFilePage = currentPage === 'endpoints' || currentPage === 'jobs' || currentPage === 'services'

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Breadcrumb />
      {!isDrilled ? <PageTabs /> : null}

      {isDrilled && drilledNode?.type === 'state_machine' ? (
        <StateMachineSubCanvas machineId={drillTarget!} />
      ) : currentPage === 'system' ? (
        <SystemView />
      ) : isFilePage ? (
        <FilePage pageId={currentPage as 'endpoints' | 'jobs' | 'services'} />
      ) : isGraphPage ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, node) => {
            if (node.type === 'state_machine') setDrillTarget(node.id)
            else setCodePanel(node.id)
          }}
          fitView
        >
          <ViewportController />
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      ) : null}

      <CodePanel />
    </div>
  )
}
