import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getState } from './canvas-client.js'

const text = (value: unknown) => ({
  content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
})

const errorText = (value: string) => ({
  content: [{ type: 'text' as const, text: value }],
  isError: true,
})

export function createServer() {
  const server = new McpServer({
    name: 'supabackend',
    version: '0.1.0',
  })

  server.tool(
    'get_state',
    'Returns the full canvas state: every node and every edge as JSON. Use this first to orient yourself.',
    {},
    async () => text(await getState()),
  )

  server.tool(
    'get_nodes',
    'List nodes on the canvas. Optionally filter by type ("entity" for database tables, "service" for services/workers).',
    { type: z.enum(['entity', 'service']).optional() },
    async ({ type }) => {
      const state = await getState()
      const nodes = type ? state.nodes.filter((n) => n.type === type) : state.nodes
      return text(nodes)
    },
  )

  server.tool(
    'get_edges',
    'List edges on the canvas. Optionally filter by kind ("fk" for foreign keys, "calls"/"reads"/"writes" for service relations).',
    { kind: z.enum(['fk', 'calls', 'reads', 'writes']).optional() },
    async ({ kind }) => {
      const state = await getState()
      const edges = kind ? state.edges.filter((e) => e.data?.kind === kind) : state.edges
      return text(edges)
    },
  )

  server.tool(
    'get_node',
    'Fetch a single node by id (returns all its data, including fields for entities).',
    { id: z.string().describe('The node id (e.g., "users", "posts")') },
    async ({ id }) => {
      const state = await getState()
      const node = state.nodes.find((n) => n.id === id)
      if (!node) return errorText(`No node with id '${id}'. Known ids: ${state.nodes.map((n) => n.id).join(', ')}`)
      return text(node)
    },
  )

  server.tool(
    'find_nodes',
    'Case-insensitive substring search against node data.name. Use when the user refers to something by name rather than id.',
    { query: z.string().describe('Substring to match against node names') },
    async ({ query }) => {
      const state = await getState()
      const q = query.toLowerCase()
      const matches = state.nodes.filter((n) => {
        const name = (n.data?.name ?? '').toString().toLowerCase()
        return name.includes(q)
      })
      return text(matches)
    },
  )

  server.tool(
    'describe_graph',
    'Returns a human-readable summary of the canvas — counts, nodes by name, and edges with direction and kind. Good starting point.',
    {},
    async () => {
      const state = await getState()
      const byType = state.nodes.reduce<Record<string, number>>((acc, n) => {
        acc[n.type] = (acc[n.type] ?? 0) + 1
        return acc
      }, {})
      const lines: string[] = []
      lines.push(
        `Nodes: ${state.nodes.length} (${Object.entries(byType).map(([t, c]) => `${t}: ${c}`).join(', ') || 'empty'})`,
      )
      lines.push(`Edges: ${state.edges.length}`)
      if (state.nodes.length) {
        lines.push('')
        lines.push('## Nodes')
        for (const n of state.nodes) {
          const name = (n.data?.name as string | undefined) ?? n.id
          lines.push(`- ${n.type}:${name} (id=${n.id})`)
        }
      }
      if (state.edges.length) {
        lines.push('')
        lines.push('## Edges')
        for (const e of state.edges) {
          const kind = e.data?.kind ?? '—'
          const label = e.data?.label ? ` — ${e.data.label}` : ''
          lines.push(`- ${e.source} → ${e.target} [${kind}]${label}`)
        }
      }
      return text(lines.join('\n'))
    },
  )

  return server
}
