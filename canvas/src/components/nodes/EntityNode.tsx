import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { EntityNode as EntityNodeType } from '../../types'

const rowStyle: React.CSSProperties = {
  position: 'relative',
  padding: '6px 12px',
  borderTop: '1px solid #eef0f3',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
}

export function EntityNode({ data }: NodeProps<EntityNodeType>) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #0f172a',
        borderRadius: 8,
        minWidth: 220,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: '#0f172a',
          color: 'white',
          borderRadius: '8px 8px 0 0',
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        {data.name}
      </div>
      <div>
        {data.fields.map((f) => (
          <div key={f.name} style={rowStyle}>
            <span>
              {f.isPrimary ? <span style={{ color: '#f59e0b' }}>★ </span> : null}
              {f.name}
            </span>
            <span style={{ color: '#64748b' }}>{f.type}</span>
            <Handle
              type="target"
              position={Position.Left}
              id={`${f.name}-tgt`}
              style={{ left: -5, width: 8, height: 8, background: '#0f172a' }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id={`${f.name}-src`}
              style={{ right: -5, width: 8, height: 8, background: '#0f172a' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
