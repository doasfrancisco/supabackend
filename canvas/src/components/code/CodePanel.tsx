import { useEffect, useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas-store'
import { codeForNode } from '../../codegen'
import type { CanvasNode } from '../../types'
import { CodeView } from './CodeView'

const TYPE_LABEL: Record<string, string> = {
  entity: 'Model',
  endpoint: 'Endpoint',
  job: 'Job',
  state_machine: 'State machine',
  service: 'Service',
}

const TYPE_COLOR: Record<string, string> = {
  entity: '#0ea5e9',
  endpoint: '#3b82f6',
  job: '#d97706',
  state_machine: '#6d28d9',
  service: '#475569',
}

function pillStyle(bg: string, color: string, cursor: 'pointer' | 'default' = 'pointer'): React.CSSProperties {
  return {
    background: bg,
    color,
    border: `1px solid ${color}`,
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
    cursor,
    fontFamily: 'inherit',
    lineHeight: 1.3,
  }
}

export function CodePanel() {
  const nodeId = useCanvasStore((s) => s.codePanelNodeId)
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const closePanel = useCanvasStore((s) => s.setCodePanel)
  const setCurrentPage = useCanvasStore((s) => s.setCurrentPage)
  const setFocusNode = useCanvasStore((s) => s.setFocusNode)

  const node: CanvasNode | undefined = useMemo(
    () => nodes.find((n) => n.id === nodeId),
    [nodes, nodeId],
  )

  const generated = useMemo(
    () => (nodeId ? codeForNode({ nodes, edges }, nodeId) : null),
    [nodes, edges, nodeId],
  )

  useEffect(() => {
    if (!nodeId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nodeId, closePanel])

  if (!nodeId || !node || !generated) return null

  const data = node.data as { name?: string; auth?: boolean; method?: string; path?: string; schedule?: string; queue?: string; kind?: string }
  const name = data.name ?? nodeId
  const typeLabel = TYPE_LABEL[node.type as string] ?? node.type
  const typeColor = TYPE_COLOR[node.type as string] ?? '#475569'

  const outgoing = edges.filter((e) => e.source === nodeId)
  const reads = outgoing.filter((e) => e.data?.kind === 'reads')
  const writes = outgoing.filter((e) => e.data?.kind === 'writes')
  const nameOf = (id: string) => (nodes.find((n) => n.id === id)?.data as { name?: string })?.name ?? id

  const jumpToEntity = (entityId: string) => {
    closePanel(null)
    setCurrentPage('models')
    setFocusNode(entityId)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100vh',
        width: 'min(560px, 48vw)',
        background: '#0f172a',
        boxShadow: '-8px 0 24px rgba(2,6,23,0.28)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #1e293b',
      }}
    >
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #1e293b',
          background: '#111827',
          color: 'white',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              background: typeColor,
              color: 'white',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {typeLabel}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => closePanel(null)}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #334155',
              padding: '4px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            Close · Esc
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' }}>
          {generated.file}
          {data.method && data.path ? `  ·  ${data.method} ${data.path}` : ''}
          {data.schedule ? `  ·  ${data.schedule}` : ''}
          {data.queue ? `  ·  queue ${data.queue}` : ''}
          {data.kind && node.type === 'service' ? `  ·  ${data.kind}` : ''}
          {data.auth ? '  ·  auth' : ''}
        </div>
        {(reads.length || writes.length) ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
            {reads.map((e) => (
              <button
                key={`r-${e.target}`}
                style={pillStyle('rgba(16,185,129,0.16)', '#6ee7b7')}
                onClick={() => jumpToEntity(e.target)}
              >
                reads {nameOf(e.target)}
              </button>
            ))}
            {writes.map((e) => (
              <button
                key={`w-${e.target}`}
                style={pillStyle('rgba(239,68,68,0.16)', '#fca5a5')}
                onClick={() => jumpToEntity(e.target)}
              >
                writes {nameOf(e.target)}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      <div style={{ flex: 1, overflow: 'hidden', background: '#011627' }}>
        <CodeView code={generated.code} language={generated.language} />
      </div>
    </div>
  )
}
