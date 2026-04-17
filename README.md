# supabackend

Visual editor for backend code. Design your schema and services on an infinite canvas; let Claude query and edit the canvas via an MCP server; round-trip the design to and from real `.prisma` files.

```
supabackend/
├── canvas/        Vite + React + xyflow UI and a companion Express + WebSocket
│                  server on :3333 that holds canvas state and broadcasts to
│                  connected clients.
└── mcp/           stdio MCP server. 17 tools: read the canvas, write to the
                   canvas, and round-trip the schema to Prisma.
```

## Run it

Two terminals.

**Terminal 1 — canvas (UI on :5173, state server on :3333):**

```bash
cd canvas
npm install
npm run dev
```

Open http://localhost:5173. You'll see `users` + `posts` wired by a foreign key. Drag, reshape, anything you do is mirrored to :3333 in real time.

**Terminal 2 — build the MCP server:**

```bash
cd mcp
npm install
npm run build
```

Produces `mcp/dist/index.js` — the entrypoint Claude will spawn.

## Wire into Claude Code

```bash
claude mcp add supabackend -- node C:/Francisco/github-repositories/supabackend/mcp/dist/index.js
```

Restart Claude, then try things like:

- *"describe the canvas"*
- *"add a `comments` table with id, post_id, body, and wire a FK to posts"*
- *"export this canvas to ./schema.prisma"*
- *"load `./some-other-schema.prisma` into the canvas"*

Claude will pick the appropriate tools from the 17 below.

## Tool catalog

### Read — query what's on the canvas
| Tool | Purpose |
| --- | --- |
| `get_state` | Full canvas state as JSON |
| `get_nodes` | All nodes, optionally filtered by type (`entity` \| `service`) |
| `get_edges` | All edges, optionally filtered by kind (`fk` \| `calls` \| `reads` \| `writes`) |
| `get_node` | Single node by id |
| `find_nodes` | Substring search against node names |
| `describe_graph` | Human-readable summary — counts + adjacency |

### Write — edits push live to the canvas via WebSocket
| Tool | Purpose |
| --- | --- |
| `add_entity` | Add a table with fields (name, type, isPrimary?, isNullable?) |
| `update_entity` | Rename, replace fields, or move an entity |
| `add_service` | Add a service/worker/queue node |
| `update_service` | Update a service's name, kind, or position |
| `delete_node` | Delete any node + its edges |
| `add_fk` | Add a foreign-key edge between two entity fields |
| `delete_edge` | Delete an edge by id |
| `update_edge` | Change edge kind or label |
| `clear_canvas` | Destructive: empty the canvas |

### Round-trip — Prisma ↔ canvas
| Tool | Purpose |
| --- | --- |
| `export_prisma` | Serialize canvas entities + FKs to a `.prisma` file |
| `import_prisma` | Parse a `.prisma` file (via `@mrleebo/prisma-ast`) and replace the canvas state |

## How state flows

```
  Browser (React + Zustand)
        │ │                                    ┌──────┐
        │ │ PUT /api/state (debounced 150ms)   │ MCP  │
        │ ▼                                    │      │
        │ canvas/server ─────────────────────▶ │ tool │
        │ (Express + ws, in-memory state)      │ call │
        │ ▲                                    │      │
        │ │ broadcast over WS                  │      │
        └─┘ ◀────  POST /api/ops ──────────────┘      │
                                                ...Claude
```

- **Canvas → server:** debounced PUTs with the full state. Server stores, does NOT broadcast (echoing to the sender would reset in-flight drags).
- **MCP → server:** granular POST /api/ops. Server applies the op, bumps `rev`, and broadcasts the new state to every connected browser. Canvas receives over WebSocket, the xyflow view updates immediately.
- **Browser reconnects** on server restart; a `receivedRemote` flag suppresses the PUT echo loop when remote state arrives.

## Type mapping (canvas ↔ Prisma)

| Canvas type | Prisma |
| --- | --- |
| `uuid` | `String @db.Uuid` |
| `text`, `varchar`, `char`, `string` | `String` |
| `int`, `integer`, `int4` | `Int` |
| `bigint`, `int8` | `BigInt` |
| `float`, `double`, `real` | `Float` |
| `bool`, `boolean` | `Boolean` |
| `timestamp`, `timestamptz`, `datetime`, `date` | `DateTime` |
| `json`, `jsonb` | `Json` |
| `bytes` | `Bytes` |
| `decimal`, `numeric` | `Decimal` |
| *unknown* | `String` (safe default) |

## What's next

- Layout engines (dagre / elkjs) for auto-arranging imported schemas
- More codegen targets: raw SQL migrations, Supabase, Drizzle, Terraform
- Multi-browser collab (cooperative WS broadcast with client-id filtering)
- State-machine + DAG node types (not just entities and services)
