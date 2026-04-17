import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

type StateNodeData = { name: string; isInitial?: boolean }
type StateNodeType = Node<StateNodeData, 'state'>

export function StateNode({ data }: NodeProps<StateNodeType>) {
  return (
    <div
      style={{
        padding: '14px 22px',
        background: data.isInitial ? '#6d28d9' : 'white',
        color: data.isInitial ? 'white' : '#6d28d9',
        border: '2px solid #6d28d9',
        borderRadius: 14,
        fontWeight: 600,
        fontSize: 14,
        minWidth: 110,
        textAlign: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        boxShadow: '0 2px 4px rgba(109,40,217,0.1)',
      }}
    >
      {data.isInitial ? '\u25B6  ' : ''}
      {data.name}
      <Handle type="target" position={Position.Left} style={{ background: '#6d28d9', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#6d28d9', width: 10, height: 10 }} />
    </div>
  )
}
