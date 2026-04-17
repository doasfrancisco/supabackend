import { useMemo } from 'react'
import { useCanvasStore } from '../../store/canvas-store'
import {
  blockRangesForFile,
  canvasToCompose,
  canvasToJobs,
  canvasToMachines,
  canvasToPrisma,
  canvasToRoutes,
  type CodeLanguage,
} from '../../codegen'
import { CodeView } from '../code/CodeView'

type FileSpec = {
  path: string
  language: CodeLanguage
  generate: (state: { nodes: ReturnType<typeof useCanvasStore.getState>['nodes']; edges: ReturnType<typeof useCanvasStore.getState>['edges'] }) => string
  emptyHint: string
}

const FILE_BY_PAGE: Record<'endpoints' | 'jobs' | 'services', FileSpec> = {
  endpoints: {
    path: 'src/routes.ts',
    language: 'typescript',
    generate: (s) => canvasToRoutes(s),
    emptyHint: 'No endpoints yet — ask the MCP to add one with add_endpoint.',
  },
  jobs: {
    path: 'src/jobs.ts',
    language: 'typescript',
    generate: (s) => canvasToJobs(s),
    emptyHint: 'No jobs yet — ask the MCP to add one with add_job.',
  },
  services: {
    path: 'docker-compose.yml',
    language: 'yaml',
    generate: (s) => canvasToCompose(s),
    emptyHint: 'No services yet — ask the MCP to add one with add_service.',
  },
}

export function FilePage({ pageId }: { pageId: 'endpoints' | 'jobs' | 'services' | 'models_file' | 'machines_file' }) {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const setCodePanel = useCanvasStore((s) => s.setCodePanel)
  const codePanelNodeId = useCanvasStore((s) => s.codePanelNodeId)

  const spec: FileSpec = useMemo(() => {
    if (pageId === 'models_file') {
      return {
        path: 'prisma/schema.prisma',
        language: 'prisma',
        generate: (s) => canvasToPrisma(s),
        emptyHint: 'No entities yet.',
      }
    }
    if (pageId === 'machines_file') {
      return {
        path: 'src/machines.ts',
        language: 'typescript',
        generate: (s) => canvasToMachines(s),
        emptyHint: 'No state machines yet.',
      }
    }
    return FILE_BY_PAGE[pageId as 'endpoints' | 'jobs' | 'services']
  }, [pageId])

  const code = useMemo(() => spec.generate({ nodes, edges }), [spec, nodes, edges])
  const ranges = useMemo(() => blockRangesForFile(code), [code])

  const idExists = (id: string) => nodes.some((n) => n.id === id)

  const highlightLines = ranges
    .filter((r) => idExists(r.nodeId))
    .map((r) => ({
      start: r.start,
      end: r.end,
      onClick: () => setCodePanel(r.nodeId),
      title: `Open ${r.nodeId}`,
    }))

  if (codePanelNodeId) {
    const sel = ranges.find((r) => r.nodeId === codePanelNodeId)
    if (sel) {
      const existing = highlightLines.find((h) => h.start === sel.start && h.end === sel.end)
      if (!existing) {
        highlightLines.push({
          start: sel.start,
          end: sel.end,
          onClick: () => setCodePanel(sel.nodeId),
          title: `Open ${sel.nodeId}`,
        })
      }
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        paddingTop: 72,
        background: '#011627',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #0b2942',
          color: '#94a3b8',
          fontSize: 12,
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            background: '#1e293b',
            color: '#cbd5e1',
            padding: '3px 8px',
            borderRadius: 4,
            fontSize: 10,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontWeight: 700,
          }}
        >
          {spec.language}
        </span>
        <span>{spec.path}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11 }}>Click a highlighted block to drill into that node.</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {ranges.filter((r) => idExists(r.nodeId)).length === 0 && !code.trim().includes('model ') ? (
          <div
            style={{
              padding: 40,
              color: '#94a3b8',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              fontSize: 14,
            }}
          >
            {spec.emptyHint}
          </div>
        ) : (
          <CodeView code={code} language={spec.language} highlightLines={highlightLines} />
        )}
      </div>
    </div>
  )
}
