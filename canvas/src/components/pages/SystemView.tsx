import { useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useCanvasStore } from '../../store/canvas-store'
import { canvasToFiles, fileImports, type FileEntry } from '../../codegen'
import { CodeView } from '../code/CodeView'

type FileNodeData = {
  path: string
  description: string
  language: string
  lineCount: number
}

type FileNode = Node<FileNodeData, 'file'>

const LANG_COLOR: Record<string, string> = {
  typescript: '#3178c6',
  prisma: '#2d3748',
  yaml: '#cb171e',
  json: '#f5a623',
  bash: '#4a5568',
  markdown: '#6b7280',
}

const DESCRIPTIONS: Record<string, string> = {
  'prisma/schema.prisma': 'Models · FK graph',
  'src/routes.ts': 'HTTP endpoints',
  'src/jobs.ts': 'Cron + queue workers',
  'src/machines.ts': 'XState machines',
  'src/index.ts': 'Express entrypoint',
  'docker-compose.yml': 'Runtime services',
  '.env.example': 'Env vars',
  'package.json': 'Dependencies',
  'README.md': 'Readme',
}

function FileNodeCmp({ data }: NodeProps<FileNode>) {
  const color = LANG_COLOR[data.language] ?? '#334155'
  return (
    <div
      style={{
        background: '#0f172a',
        color: 'white',
        border: `1px solid ${color}`,
        borderRadius: 10,
        padding: '12px 14px',
        minWidth: 200,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        boxShadow: '0 4px 12px rgba(2,6,23,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            background: color,
            color: 'white',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {data.language}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{data.lineCount} lines</span>
      </div>
      <div style={{ marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#e2e8f0' }}>
        {data.path}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>{data.description}</div>
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}

const nodeTypes: NodeTypes = { file: FileNodeCmp }

const BASE_LAYOUT: Record<string, { x: number; y: number }> = {
  'prisma/schema.prisma': { x: 60, y: 80 },
  'src/routes.ts': { x: 420, y: 30 },
  'src/jobs.ts': { x: 420, y: 170 },
  'src/machines.ts': { x: 420, y: 310 },
  'src/index.ts': { x: 800, y: 170 },
  'docker-compose.yml': { x: 60, y: 430 },
  '.env.example': { x: 420, y: 450 },
  'package.json': { x: 800, y: 450 },
}

function positionFor(path: string, fallbackIndex: number): { x: number; y: number } {
  return BASE_LAYOUT[path] ?? { x: 60 + (fallbackIndex % 3) * 380, y: 600 + Math.floor(fallbackIndex / 3) * 150 }
}

function FileOverlay({ file, onClose }: { file: FileEntry; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(2,6,23,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(960px, 90vw)',
          height: 'min(700px, 85vh)',
          background: '#011627',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        <header
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #0b2942',
            color: 'white',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              background: LANG_COLOR[file.language] ?? '#334155',
              color: 'white',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {file.language}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'ui-monospace, Menlo, monospace' }}>
            {file.path}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
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
        </header>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeView code={file.code} language={file.language} />
        </div>
      </div>
    </div>
  )
}

function ViewportInit({ nodes }: { nodes: Node[] }) {
  const rf = useReactFlow()
  const pageEnterToken = useCanvasStore((s) => s.pageEnterToken)
  useEffect(() => {
    if (nodes.length === 0) return
    const t = setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageEnterToken, nodes.length])
  return null
}

export function SystemView() {
  const rawNodes = useCanvasStore((s) => s.nodes)
  const rawEdges = useCanvasStore((s) => s.edges)
  const setCurrentPage = useCanvasStore((s) => s.setCurrentPage)
  const systemFile = useCanvasStore((s) => s.systemFileSelection)
  const setSystemFile = useCanvasStore((s) => s.setSystemFile)

  const files = useMemo(() => canvasToFiles({ nodes: rawNodes, edges: rawEdges }), [rawNodes, rawEdges])
  const imports = useMemo(() => fileImports(files), [files])

  const nodes: Node[] = useMemo(() => {
    return files.map((f, i) => ({
      id: f.path,
      type: 'file',
      position: positionFor(f.path, i),
      data: {
        path: f.path,
        description: DESCRIPTIONS[f.path] ?? '',
        language: f.language,
        lineCount: f.code.split('\n').length,
      },
    }))
  }, [files])

  const edges: Edge[] = useMemo(() => {
    return imports.map((imp, i) => ({
      id: `imp-${i}`,
      source: imp.from,
      target: imp.to,
      label: imp.label,
      animated: imp.label === 'prisma',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#0f172a' },
      labelBgPadding: [3, 5] as [number, number],
      labelBgBorderRadius: 3,
      style: { stroke: '#475569', strokeWidth: 1.5 },
    }))
  }, [imports])

  const openFile = (path: string) => {
    if (path === 'prisma/schema.prisma') return setCurrentPage('models')
    if (path === 'src/routes.ts') return setCurrentPage('endpoints')
    if (path === 'src/jobs.ts') return setCurrentPage('jobs')
    if (path === 'src/machines.ts') return setCurrentPage('state_machines')
    if (path === 'docker-compose.yml') return setCurrentPage('services')
    setSystemFile(path)
  }

  const selectedFile = systemFile ? files.find((f) => f.path === systemFile) : null

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        onNodeDoubleClick={(_, node) => openFile(node.id)}
      >
        <ViewportInit nodes={nodes} />
        <Background color="#1e293b" gap={24} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.9)',
          color: '#cbd5e1',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 11,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        Double-click a file to open its page or code view.
      </div>
      {selectedFile ? <FileOverlay file={selectedFile} onClose={() => setSystemFile(null)} /> : null}
    </div>
  )
}
