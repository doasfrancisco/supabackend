import { useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { JobNode as JobNodeType } from '../../types'
import { useCanvasStore } from '../../store/canvas-store'

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

export function JobNode({ id, data }: NodeProps<JobNodeType>) {
  const kind = data.kind ?? 'cron'
  const color = kind === 'cron' ? '#d97706' : '#7c3aed'
  const bg = kind === 'cron' ? '#fffbeb' : '#faf5ff'
  const detail = kind === 'cron' ? (data.schedule ?? '* * * * *') : (data.queue ?? data.name)

  const edges = useCanvasStore((s) => s.edges)
  const nodes = useCanvasStore((s) => s.nodes)
  const setCurrentPage = useCanvasStore((s) => s.setCurrentPage)
  const setFocusNode = useCanvasStore((s) => s.setFocusNode)

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

  const showPills = refs.reads.length > 0 || refs.writes.length > 0

  const jumpToModel = (targetId: string) => {
    setCurrentPage('models')
    setFocusNode(targetId)
  }

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
      {showPills ? (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {refs.reads.map((r) => (
            <button
              key={`r-${r.targetId}`}
              style={pillStyle('reads')}
              title={`Jump to Models (reads ${r.name})`}
              onClick={(e) => {
                e.stopPropagation()
                jumpToModel(r.targetId)
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
                jumpToModel(w.targetId)
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
