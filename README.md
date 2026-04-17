# supabackend

Visual editor for backend code. Week 1 scope: xyflow-based canvas with entity (table) + service nodes, plus a read-only MCP server that lets Claude query what's on the canvas.

```
supabackend/
├── canvas/        Vite + React + xyflow UI. Ships with a tiny Express companion
│                  server on :3333 that mirrors canvas state so external clients
│                  (like the MCP server) can read it.
└── mcp/           stdio MCP server. Calls the canvas companion server over HTTP
                   and exposes 6 read-only tools to Claude.
```

## Run it

Two terminals.

**Terminal 1 — canvas (UI on :5173, state server on :3333):**

```bash
cd canvas
npm install
npm run dev
```

Open http://localhost:5173. You should see `users` and `posts` entities wired by a foreign key.

**Terminal 2 — build the MCP server:**

```bash
cd mcp
npm install
npm run build
```

This produces `mcp/dist/index.js` — the entrypoint for Claude.

## Wire it into Claude Code

```bash
claude mcp add supabackend -- node C:/Francisco/github-repositories/supabackend/mcp/dist/index.js
```

Then restart Claude Code. Ask things like:

- "describe the canvas"
- "what tables are there?"
- "what does the posts table look like?"
- "what foreign keys exist?"

Claude will call `describe_graph`, `get_nodes`, `get_node`, `get_edges` under the hood.

## Tools exposed

| Tool | Purpose |
| --- | --- |
| `get_state` | Full canvas state as JSON |
| `get_nodes` | All nodes, optionally filtered by type |
| `get_edges` | All edges, optionally filtered by kind |
| `get_node` | Single node by id |
| `find_nodes` | Substring search by name |
| `describe_graph` | Human-readable summary |

## How state flows (Week 1)

```
  Browser (React + Zustand)
        │  PUT /api/state on every change (debounced 150ms)
        ▼
  canvas/server (Express on :3333, in-memory state)
        ▲
        │  GET /api/state
        │
  mcp/  (stdio → Claude)
```

Canvas is the source of truth; the companion server is a mirror so the MCP (a separate process) can read without coupling to the UI.

## Next (Week 2)

Write tools on the MCP (`add_node`, `update_node`, `connect`, ...) + WebSocket push from server → browser so Claude's edits show up live, paper.design-style.
