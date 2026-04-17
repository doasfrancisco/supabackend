import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'

type CanvasNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  [key: string]: unknown
}

type CanvasEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  data?: Record<string, unknown>
  [key: string]: unknown
}

type State = { nodes: CanvasNode[]; edges: CanvasEdge[] }

type Op =
  | { type: 'add_node'; node: CanvasNode }
  | { type: 'update_node'; id: string; patch?: Record<string, unknown>; position?: { x: number; y: number } }
  | { type: 'delete_node'; id: string }
  | { type: 'add_edge'; edge: CanvasEdge }
  | { type: 'update_edge'; id: string; patch?: Record<string, unknown> }
  | { type: 'delete_edge'; id: string }
  | { type: 'replace_state'; state: State }

let state: State = { nodes: [], edges: [] }
let rev = 0
let lastUpdatedAt: string | null = null

function bump() {
  rev += 1
  lastUpdatedAt = new Date().toISOString()
}

function applyOp(op: Op): void {
  switch (op.type) {
    case 'add_node': {
      if (!op.node?.id) throw new Error('node.id is required')
      if (state.nodes.some((n) => n.id === op.node.id)) {
        throw new Error(`node '${op.node.id}' already exists`)
      }
      state.nodes = [...state.nodes, op.node]
      break
    }
    case 'update_node': {
      const idx = state.nodes.findIndex((n) => n.id === op.id)
      if (idx < 0) throw new Error(`node '${op.id}' not found`)
      const current = state.nodes[idx]
      const next: CanvasNode = {
        ...current,
        ...(op.position ? { position: op.position } : {}),
        ...(op.patch ? { data: { ...(current.data ?? {}), ...op.patch } } : {}),
      }
      state.nodes = [...state.nodes.slice(0, idx), next, ...state.nodes.slice(idx + 1)]
      break
    }
    case 'delete_node': {
      if (!state.nodes.some((n) => n.id === op.id)) throw new Error(`node '${op.id}' not found`)
      state.nodes = state.nodes.filter((n) => n.id !== op.id)
      state.edges = state.edges.filter((e) => e.source !== op.id && e.target !== op.id)
      break
    }
    case 'add_edge': {
      if (!op.edge?.id) throw new Error('edge.id is required')
      if (state.edges.some((e) => e.id === op.edge.id)) {
        throw new Error(`edge '${op.edge.id}' already exists`)
      }
      state.edges = [...state.edges, op.edge]
      break
    }
    case 'update_edge': {
      const idx = state.edges.findIndex((e) => e.id === op.id)
      if (idx < 0) throw new Error(`edge '${op.id}' not found`)
      const current = state.edges[idx]
      const next: CanvasEdge = { ...current, data: { ...(current.data ?? {}), ...op.patch } }
      state.edges = [...state.edges.slice(0, idx), next, ...state.edges.slice(idx + 1)]
      break
    }
    case 'delete_edge': {
      if (!state.edges.some((e) => e.id === op.id)) throw new Error(`edge '${op.id}' not found`)
      state.edges = state.edges.filter((e) => e.id !== op.id)
      break
    }
    case 'replace_state': {
      if (!op.state || !Array.isArray(op.state.nodes) || !Array.isArray(op.state.edges)) {
        throw new Error('replace_state requires { state: { nodes: [], edges: [] } }')
      }
      state = { nodes: op.state.nodes, edges: op.state.edges }
      break
    }
    default:
      throw new Error(`unknown op type: ${(op as { type: string }).type}`)
  }
  bump()
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '8mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rev, lastUpdatedAt, nodeCount: state.nodes.length, edgeCount: state.edges.length })
})
app.get('/api/state', (_req, res) => res.json({ ...state, rev }))
app.get('/api/nodes', (_req, res) => res.json({ nodes: state.nodes }))
app.get('/api/edges', (_req, res) => res.json({ edges: state.edges }))

app.put('/api/state', (req, res) => {
  const body = req.body as Partial<State> | undefined
  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return res.status(400).json({ error: 'body must be { nodes: [], edges: [] }' })
  }
  state = { nodes: body.nodes, edges: body.edges }
  bump()
  // DO NOT broadcast here — the canvas is always the caller of PUT and
  // already has this state. Broadcasting would echo back and reset in-flight drags.
  res.json({ ok: true, rev, lastUpdatedAt })
})

app.post('/api/ops', (req, res) => {
  const op = req.body as Op
  try {
    applyOp(op)
    broadcast()
    res.json({ ok: true, rev, lastUpdatedAt, nodeCount: state.nodes.length, edgeCount: state.edges.length })
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
})

const PORT = Number(process.env.PORT ?? 3333)
const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', state, rev }))
})

function broadcast() {
  const msg = JSON.stringify({ type: 'state', state, rev })
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  }
}

httpServer.listen(PORT, () => {
  console.log(`[canvas-server] HTTP + WS on http://localhost:${PORT}`)
})
