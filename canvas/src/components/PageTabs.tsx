import { useCanvasStore, type PageId } from '../store/canvas-store'

const PAGES: Array<{ id: PageId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'models', label: 'Models' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'state_machines', label: 'State machines' },
  { id: 'services', label: 'Services' },
]

export function PageTabs() {
  const currentPage = useCanvasStore((s) => s.currentPage)
  const setCurrentPage = useCanvasStore((s) => s.setCurrentPage)
  const nodes = useCanvasStore((s) => s.nodes)

  const counts: Record<string, number> = {}
  for (const n of nodes) counts[n.type] = (counts[n.type] ?? 0) + 1

  const countFor = (id: PageId): number | null => {
    if (id === 'all') return nodes.length
    if (id === 'models') return counts.entity ?? 0
    if (id === 'endpoints') return counts.endpoint ?? 0
    if (id === 'jobs') return counts.job ?? 0
    if (id === 'state_machines') return counts.state_machine ?? 0
    if (id === 'services') return counts.service ?? 0
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        fontSize: 12,
      }}
    >
      {PAGES.map((p) => {
        const active = p.id === currentPage
        const count = countFor(p.id)
        return (
          <button
            key={p.id}
            onClick={() => setCurrentPage(p.id)}
            style={{
              background: active ? '#0f172a' : 'transparent',
              color: active ? 'white' : '#334155',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: active ? 600 : 500,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {p.label}
            {count !== null ? (
              <span
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                  color: active ? 'white' : '#475569',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
