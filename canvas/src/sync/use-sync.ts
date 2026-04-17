import { useEffect, useRef } from 'react'
import { useCanvasStore } from '../store/canvas-store'

export function useSync() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      }).catch(() => {
        // companion server offline — silently skip; editor still works
      })
    }, 150)
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [nodes, edges])
}
