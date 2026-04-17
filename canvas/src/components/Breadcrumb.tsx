import { useCanvasStore, type PageId } from '../store/canvas-store'

const PAGE_LABEL: Record<PageId, string> = {
  system: 'System',
  models: 'Models',
  endpoints: 'Endpoints',
  jobs: 'Jobs',
  state_machines: 'State machines',
  services: 'Services',
}

export function Breadcrumb() {
  const currentPage = useCanvasStore((s) => s.currentPage)
  const drillTarget = useCanvasStore((s) => s.drillTarget)
  const nodes = useCanvasStore((s) => s.nodes)
  const setDrillTarget = useCanvasStore((s) => s.setDrillTarget)

  const drillNode = drillTarget ? nodes.find((n) => n.id === drillTarget) : null
  const drillName = drillNode ? ((drillNode.data as { name?: string })?.name ?? drillTarget) : null

  type Crumb = { label: string; onClick?: () => void; active?: boolean }

  const crumbs: Crumb[] = []
  crumbs.push({
    label: PAGE_LABEL[currentPage],
    onClick: drillTarget ? () => setDrillTarget(null) : undefined,
    active: !drillTarget,
  })
  if (drillTarget && drillName) {
    crumbs.push({ label: drillName, active: true })
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        fontSize: 12,
      }}
    >
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {i > 0 ? <span style={{ color: '#cbd5e1' }}>/</span> : null}
          {c.onClick && !c.active ? (
            <button
              onClick={c.onClick}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'inherit',
              }}
            >
              {c.label}
            </button>
          ) : (
            <span
              style={{
                color: c.active ? '#0f172a' : '#475569',
                fontWeight: c.active ? 700 : 500,
                padding: '2px 6px',
              }}
            >
              {c.label}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
