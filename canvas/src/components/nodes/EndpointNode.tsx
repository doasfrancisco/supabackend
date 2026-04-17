import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { EndpointNode as EndpointNodeType } from '../../types'

const methodColors: Record<string, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#8b5cf6',
  DELETE: '#ef4444',
}

export function EndpointNode({ data }: NodeProps<EndpointNodeType>) {
  const method = (data.method ?? 'GET').toUpperCase()
  const color = methodColors[method] ?? '#64748b'
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            background: color,
            color: 'white',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          {method}
        </span>
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>
          {data.path ?? '/'}
        </span>
        {data.auth ? (
          <span style={{ fontSize: 9, color: '#6b7280', border: '1px solid #6b7280', padding: '0 4px', borderRadius: 3 }}>
            auth
          </span>
        ) : null}
      </div>
      {data.name && data.name !== data.path ? (
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{data.name}</div>
      ) : null}
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}
