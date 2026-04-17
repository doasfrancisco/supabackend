import { readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { applyOp, getState } from './canvas-client.js'
import { canvasToPrisma, prismaToCanvas } from './prisma.js'
import type { CanvasNode } from './types.js'

const text = (value: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    },
  ],
})

const errorText = (value: string) => ({
  content: [{ type: 'text' as const, text: value }],
  isError: true,
})

async function run(fn: () => Promise<string>) {
  try {
    return text(await fn())
  } catch (err) {
    return errorText(`${(err as Error).message}`)
  }
}

function absolutize(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p)
}

const fieldSchema = z.object({
  name: z.string(),
  type: z
    .string()
    .describe(
      'One of: uuid, text, int, bigint, float, bool, timestamp, date, json, bytes, decimal. Unknown types export as Prisma String.',
    ),
  isPrimary: z.boolean().optional(),
  isNullable: z.boolean().optional(),
})

const positionSchema = z.object({ x: z.number(), y: z.number() })

export function createServer() {
  const server = new McpServer({ name: 'supabackend', version: '0.2.0' })

  // ─── READ TOOLS ──────────────────────────────────────────────────────────

  server.tool(
    'get_state',
    'Returns the full canvas state: every node and every edge as JSON. Use this first to orient yourself.',
    {},
    async () => run(async () => JSON.stringify(await getState(), null, 2)),
  )

  server.tool(
    'get_nodes',
    'List nodes on the canvas. Optionally filter by type ("entity" for DB tables, "service" for services/workers).',
    { type: z.enum(['entity', 'service']).optional() },
    async ({ type }) =>
      run(async () => {
        const state = await getState()
        const nodes = type ? state.nodes.filter((n) => n.type === type) : state.nodes
        return JSON.stringify(nodes, null, 2)
      }),
  )

  server.tool(
    'get_edges',
    'List edges on the canvas. Optionally filter by kind ("fk", "calls", "reads", "writes").',
    { kind: z.enum(['fk', 'calls', 'reads', 'writes']).optional() },
    async ({ kind }) =>
      run(async () => {
        const state = await getState()
        const edges = kind ? state.edges.filter((e) => e.data?.kind === kind) : state.edges
        return JSON.stringify(edges, null, 2)
      }),
  )

  server.tool(
    'get_node',
    'Fetch a single node by id (returns all its data, including fields for entities).',
    { id: z.string().describe('The node id, e.g. "users" or "posts"') },
    async ({ id }) =>
      run(async () => {
        const state = await getState()
        const node = state.nodes.find((n) => n.id === id)
        if (!node) {
          throw new Error(
            `No node with id '${id}'. Known ids: ${state.nodes.map((n) => n.id).join(', ') || '(none)'}`,
          )
        }
        return JSON.stringify(node, null, 2)
      }),
  )

  server.tool(
    'find_nodes',
    'Case-insensitive substring search against node data.name. Use when the user refers to something by name rather than id.',
    { query: z.string() },
    async ({ query }) =>
      run(async () => {
        const state = await getState()
        const q = query.toLowerCase()
        const matches = state.nodes.filter((n) => {
          const name = (n.data?.name ?? '').toString().toLowerCase()
          return name.includes(q)
        })
        return JSON.stringify(matches, null, 2)
      }),
  )

  server.tool(
    'describe_graph',
    'Human-readable summary of the canvas — counts, nodes by name, edges with direction and kind. Good starting point.',
    {},
    async () =>
      run(async () => {
        const state = await getState()
        const byType = state.nodes.reduce<Record<string, number>>((acc, n) => {
          acc[n.type] = (acc[n.type] ?? 0) + 1
          return acc
        }, {})
        const lines: string[] = []
        lines.push(
          `Nodes: ${state.nodes.length} (${
            Object.entries(byType)
              .map(([t, c]) => `${t}: ${c}`)
              .join(', ') || 'empty'
          })`,
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
        return lines.join('\n')
      }),
  )

  // ─── WRITE TOOLS ─────────────────────────────────────────────────────────

  server.tool(
    'add_entity',
    'Add a new entity (database table) to the canvas. If you omit `id`, the table name is used as the node id.',
    {
      name: z.string(),
      id: z.string().optional(),
      fields: z.array(fieldSchema).optional(),
      position: positionSchema.optional(),
    },
    async ({ name, id, fields, position }) =>
      run(async () => {
        const nodeId = id ?? name
        const pos =
          position ??
          { x: 120 + Math.floor(Math.random() * 400), y: 120 + Math.floor(Math.random() * 200) }
        const node: CanvasNode = {
          id: nodeId,
          type: 'entity',
          position: pos,
          data: { name, fields: fields ?? [] },
        }
        const result = await applyOp({ type: 'add_node', node })
        return `Added entity '${name}' (id=${nodeId}) with ${fields?.length ?? 0} field(s). Canvas rev=${result.rev}.`
      }),
  )

  server.tool(
    'update_entity',
    "Update an entity's name, fields, or position. Omit a parameter to leave it unchanged. If `fields` is passed, it REPLACES the entire field list.",
    {
      id: z.string(),
      name: z.string().optional(),
      fields: z.array(fieldSchema).optional(),
      position: positionSchema.optional(),
    },
    async ({ id, name, fields, position }) =>
      run(async () => {
        const patch: Record<string, unknown> = {}
        if (name !== undefined) patch.name = name
        if (fields !== undefined) patch.fields = fields
        const result = await applyOp({
          type: 'update_node',
          id,
          patch: Object.keys(patch).length ? patch : undefined,
          position,
        })
        return `Updated entity '${id}'. Canvas rev=${result.rev}.`
      }),
  )

  server.tool(
    'add_service',
    'Add a service/worker/queue node to the canvas (used for architecture diagrams).',
    {
      name: z.string(),
      id: z.string().optional(),
      kind: z.string().default('http-service'),
      position: positionSchema.optional(),
    },
    async ({ name, id, kind, position }) =>
      run(async () => {
        const nodeId = id ?? name
        const pos =
          position ??
          { x: 120 + Math.floor(Math.random() * 400), y: 120 + Math.floor(Math.random() * 200) }
        const node: CanvasNode = {
          id: nodeId,
          type: 'service',
          position: pos,
          data: { name, kind },
        }
        const result = await applyOp({ type: 'add_node', node })
        return `Added service '${name}' (id=${nodeId}, kind=${kind}). Canvas rev=${result.rev}.`
      }),
  )

  server.tool(
    'update_service',
    "Update a service node's name, kind, or position.",
    {
      id: z.string(),
      name: z.string().optional(),
      kind: z.string().optional(),
      position: positionSchema.optional(),
    },
    async ({ id, name, kind, position }) =>
      run(async () => {
        const patch: Record<string, unknown> = {}
        if (name !== undefined) patch.name = name
        if (kind !== undefined) patch.kind = kind
        const result = await applyOp({
          type: 'update_node',
          id,
          patch: Object.keys(patch).length ? patch : undefined,
          position,
        })
        return `Updated service '${id}'. Canvas rev=${result.rev}.`
      }),
  )

  server.tool(
    'delete_node',
    'Delete a node and every edge connected to it. Works for both entities and services.',
    { id: z.string() },
    async ({ id }) =>
      run(async () => {
        const result = await applyOp({ type: 'delete_node', id })
        return `Deleted node '${id}'. Canvas rev=${result.rev}, now ${result.nodeCount} nodes / ${result.edgeCount} edges.`
      }),
  )

  server.tool(
    'add_fk',
    'Add a foreign-key edge from a child entity field to a parent entity field.',
    {
      from_entity: z.string().describe('Id of the child entity (holds the FK column)'),
      from_field: z.string().describe('Name of the FK column on the child'),
      to_entity: z.string().describe('Id of the parent entity (referenced table)'),
      to_field: z.string().describe('Name of the referenced column on the parent (usually the PK)'),
      label: z.string().optional(),
    },
    async ({ from_entity, from_field, to_entity, to_field, label }) =>
      run(async () => {
        const edgeId = `${from_entity}_${from_field}__${to_entity}_${to_field}`
        const result = await applyOp({
          type: 'add_edge',
          edge: {
            id: edgeId,
            source: from_entity,
            target: to_entity,
            sourceHandle: `${from_field}-src`,
            targetHandle: `${to_field}-tgt`,
            data: {
              kind: 'fk',
              label: label ?? `${from_entity}.${from_field} → ${to_entity}.${to_field}`,
            },
          },
        })
        return `Added FK edge '${edgeId}'. Canvas rev=${result.rev}.`
      }),
  )

  server.tool(
    'delete_edge',
    'Delete an edge by id.',
    { id: z.string() },
    async ({ id }) =>
      run(async () => {
        const result = await applyOp({ type: 'delete_edge', id })
        return `Deleted edge '${id}'. Canvas rev=${result.rev}.`
      }),
  )

  server.tool(
    'update_edge',
    "Update an edge's kind or label.",
    {
      id: z.string(),
      kind: z.enum(['fk', 'calls', 'reads', 'writes']).optional(),
      label: z.string().optional(),
    },
    async ({ id, kind, label }) =>
      run(async () => {
        const patch: Record<string, unknown> = {}
        if (kind !== undefined) patch.kind = kind
        if (label !== undefined) patch.label = label
        const result = await applyOp({ type: 'update_edge', id, patch })
        return `Updated edge '${id}'. Canvas rev=${result.rev}.`
      }),
  )

  server.tool(
    'clear_canvas',
    'Replace the canvas with an empty state. Destructive — wipes every node and edge.',
    {},
    async () =>
      run(async () => {
        const result = await applyOp({
          type: 'replace_state',
          state: { nodes: [], edges: [] },
        })
        return `Canvas cleared. Rev=${result.rev}.`
      }),
  )

  // ─── PRISMA ROUND-TRIP ───────────────────────────────────────────────────

  server.tool(
    'export_prisma',
    'Serialize the current canvas entities and FK edges as a Prisma schema and write it to disk. Overwrites if the file exists.',
    {
      path: z
        .string()
        .describe('Path to write, e.g. "./schema.prisma" or "C:/Users/me/app/schema.prisma"'),
    },
    async ({ path: targetPath }) =>
      run(async () => {
        const state = await getState()
        const prisma = canvasToPrisma(state)
        const absolute = absolutize(targetPath)
        await writeFile(absolute, prisma, 'utf8')
        const preview = prisma.length > 800 ? `${prisma.slice(0, 800)}\n…` : prisma
        return `Wrote ${prisma.length} bytes to ${absolute}\n\n--- preview ---\n${preview}`
      }),
  )

  server.tool(
    'import_prisma',
    'Read a Prisma schema file, parse its models + relations, and REPLACE the canvas state with the result. Destructive.',
    { path: z.string().describe('Path to a .prisma file to read') },
    async ({ path: targetPath }) =>
      run(async () => {
        const absolute = absolutize(targetPath)
        const source = await readFile(absolute, 'utf8')
        const state = prismaToCanvas(source)
        const result = await applyOp({ type: 'replace_state', state })
        return `Imported ${state.nodes.length} entities and ${state.edges.length} FK edge(s) from ${absolute}. Canvas rev=${result.rev}.`
      }),
  )

  return server
}
