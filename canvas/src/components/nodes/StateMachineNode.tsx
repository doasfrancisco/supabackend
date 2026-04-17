import { type NodeProps } from '@xyflow/react'
import type { StateMachineNode as StateMachineNodeType } from '../../types'

export function StateMachineNode({ data }: NodeProps<StateMachineNodeType>) {
  const states = data.states ?? []
  const transitions = data.transitions ?? []
  return (
    <div
      style={{
        background: '#f5f3ff',
        border: '1px solid #6d28d9',
        borderRadius: 8,
        minWidth: 220,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: '#6d28d9',
          color: 'white',
          borderRadius: '8px 8px 0 0',
          fontWeight: 600,
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{data.name}</span>
        <span style={{ fontSize: 10, opacity: 0.8 }}>
          {states.length}s · {transitions.length}t
        </span>
      </div>
      <div style={{ padding: '8px 12px', fontSize: 11 }}>
        {states.map((s) => (
          <div
            key={s}
            style={{
              padding: '2px 0',
              color: s === data.initial ? '#6d28d9' : '#374151',
              fontWeight: s === data.initial ? 700 : 400,
            }}
          >
            {s === data.initial ? '▶ ' : '  '}
            {s}
          </div>
        ))}
        {transitions.length ? (
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid #ddd6fe',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 10,
              color: '#6b7280',
            }}
          >
            {transitions.slice(0, 4).map((t, i) => (
              <div key={i}>
                {t.from} —{t.event}→ {t.to}
              </div>
            ))}
            {transitions.length > 4 ? <div>+{transitions.length - 4} more</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
