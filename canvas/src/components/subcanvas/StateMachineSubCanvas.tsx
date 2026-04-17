import { useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import { useCanvasStore } from '../../store/canvas-store'
import type { StateMachineNodeData } from '../../types'
import { StateNode } from './StateNode'

const nodeTypes: NodeTypes = { state: StateNode }

export function StateMachineSubCanvas({ machineId }: { machineId: string }) {
  const machine = useCanvasStore((s) => s.nodes.find((n) => n.id === machineId))

  const { nodes, edges, missing } = useMemo(() => {
    if (!machine || machine.type !== 'state_machine') {
      return { nodes: [], edges: [], missing: true }
    }
    const data = machine.data as StateMachineNodeData
    const states = data.states ?? []
    const transitions = data.transitions ?? []
    const initial = data.initial ?? states[0]

    const subNodes: Node[] = states.map((stateName, i) => ({
      id: `${machineId}:${stateName}`,
      type: 'state',
      position: { x: 100 + i * 220, y: 140 },
      data: { name: stateName, isInitial: stateName === initial } as Record<string, unknown>,
    }))

    const subEdges: Edge[] = transitions.map((t, i) => ({
      id: `${machineId}:t${i}`,
      source: `${machineId}:${t.from}`,
      target: `${machineId}:${t.to}`,
      label: t.event,
      animated: true,
      labelStyle: { fill: '#6d28d9', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#faf5ff' },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
      style: { stroke: '#6d28d9', strokeWidth: 2 },
    }))

    return { nodes: subNodes, edges: subEdges, missing: false }
  }, [machine, machineId])

  if (missing) {
    return (
      <div style={{ padding: 40, color: '#64748b', fontFamily: 'ui-sans-serif, system-ui' }}>
        State machine not found.
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable
      edgesFocusable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#ede9fe" gap={24} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
    </ReactFlow>
  )
}
