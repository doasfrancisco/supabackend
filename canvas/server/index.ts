import cors from 'cors'
import express from 'express'

type State = { nodes: unknown[]; edges: unknown[] }

let state: State = { nodes: [], edges: [] }
let lastUpdatedAt: string | null = null

const app = express()
app.use(cors())
app.use(express.json({ limit: '4mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, lastUpdatedAt, nodeCount: state.nodes.length, edgeCount: state.edges.length })
})

app.get('/api/state', (_req, res) => res.json(state))
app.get('/api/nodes', (_req, res) => res.json({ nodes: state.nodes }))
app.get('/api/edges', (_req, res) => res.json({ edges: state.edges }))

app.put('/api/state', (req, res) => {
  const body = req.body as Partial<State> | undefined
  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return res.status(400).json({ error: 'body must be { nodes: [], edges: [] }' })
  }
  state = { nodes: body.nodes, edges: body.edges }
  lastUpdatedAt = new Date().toISOString()
  res.json({ ok: true, lastUpdatedAt })
})

const PORT = Number(process.env.PORT ?? 3333)
app.listen(PORT, () => {
  console.log(`[canvas-server] listening on http://localhost:${PORT}`)
})
