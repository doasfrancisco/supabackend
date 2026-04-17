import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ServiceNode as ServiceNodeType } from '../../types'

export function ServiceNode({ data }: NodeProps<ServiceNodeType>) {
  return (
    <div
      style={{
        background: '#f0f9ff',
        border: '1px solid #0284c7',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 160,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, color: '#0c4a6e' }}>{data.name}</div>
      <div style={{ fontSize: 11, color: '#0369a1', marginTop: 2 }}>{data.kind}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#0284c7' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#0284c7' }} />
    </div>
  )
}
