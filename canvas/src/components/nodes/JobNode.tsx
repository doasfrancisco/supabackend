import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { JobNode as JobNodeType } from '../../types'

export function JobNode({ data }: NodeProps<JobNodeType>) {
  const kind = data.kind ?? 'cron'
  const color = kind === 'cron' ? '#d97706' : '#7c3aed'
  const bg = kind === 'cron' ? '#fffbeb' : '#faf5ff'
  const detail = kind === 'cron' ? (data.schedule ?? '* * * * *') : (data.queue ?? data.name)
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 180,
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
          {kind.toUpperCase()}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{data.name}</span>
      </div>
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          color: '#6b7280',
          marginTop: 4,
        }}
      >
        {detail}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}
