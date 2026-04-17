import type { CanvasState } from './types.js'

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
