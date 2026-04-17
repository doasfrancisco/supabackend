import type { CanvasState, Op } from './types.js'

const BASE = process.env.CANVAS_URL ?? 'http://localhost:3333'

export async function getState(): Promise<CanvasState> {
  const res = await fetch(`${BASE}/api/state`)
  if (!res.ok) {
    throw new Error(
      `canvas server at ${BASE} returned ${res.status}. Is \`cd canvas && npm run dev\` running?`,
    )
  }
  return (await res.json()) as CanvasState
}

export async function applyOp(op: Op): Promise<{
  ok: true
  rev: number
  nodeCount: number
  edgeCount: number
}> {
  const res = await fetch(`${BASE}/api/ops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(op),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as { error?: string }
      if (err?.error) detail = err.error
    } catch {
      // not json
    }
    throw new Error(detail)
  }
  return (await res.json()) as { ok: true; rev: number; nodeCount: number; edgeCount: number }
}
