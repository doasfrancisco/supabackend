import { useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { EndpointNode as EndpointNodeType } from '../../types'
import { useCanvasStore } from '../../store/canvas-store'

const methodColors: Record<string, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#8b5cf6',
  DELETE: '#ef4444',
}

const pillStyle = (kind: 'reads' | 'writes'): React.CSSProperties => ({
  background: kind === 'reads' ? '#ecfdf5' : '#fef2f2',
  color: kind === 'reads' ? '#065f46' : '#991b1b',
  border: `1px solid ${kind === 'reads' ? '#a7f3d0' : '#fecaca'}`,
  padding: '2px 6px',
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1.2,
})

export function EndpointNode({ id, data }: NodeProps<EndpointNodeType>) {
  const method = (data.method ?? 'GET').toUpperCase()
  const color = methodColors[method] ?? '#64748b'

  const edges = useCanvasStore((s) => s.edges)
  const nodes = useCanvasStore((s) => s.nodes)
  const currentPage = useCanvasStore((s) => s.currentPage)
  const setCurrentPage = useCanvasStore((s) => s.setCurrentPage)

  const refs = useMemo(() => {
    const reads: Array<{ targetId: string; name: string }> = []
    const writes: Array<{ targetId: string; name: string }> = []
    const nameOf = (targetId: string) => {
      const n = nodes.find((n) => n.id === targetId)
      return ((n?.data as { name?: string })?.name ?? targetId) as string
    }
    for (const e of edges) {
      if (e.source !== id) continue
      if (e.data?.kind === 'reads') reads.push({ targetId: e.target, name: nameOf(e.target) })
      else if (e.data?.kind === 'writes') writes.push({ targetId: e.target, name: nameOf(e.target) })
    }
    return { reads, writes }
  }, [edges, nodes, id])

  const showPills = currentPage !== 'all' && (refs.reads.length > 0 || refs.writes.length > 0)

  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 220,
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
      {showPills ? (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {refs.reads.map((r) => (
            <button
              key={`r-${r.targetId}`}
              style={pillStyle('reads')}
              title={`Jump to Models (reads ${r.name})`}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentPage('models')
              }}
            >
              reads {r.name}
            </button>
          ))}
          {refs.writes.map((w) => (
            <button
              key={`w-${w.targetId}`}
              style={pillStyle('writes')}
              title={`Jump to Models (writes ${w.name})`}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentPage('models')
              }}
            >
              writes {w.name}
            </button>
          ))}
        </div>
      ) : null}
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}
