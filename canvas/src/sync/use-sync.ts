import { useEffect, useRef } from 'react'
import type { CanvasEdge, CanvasNode } from '../types'
import { useCanvasStore } from '../store/canvas-store'

type WSMessage = {
  type: 'state'
  state: { nodes: CanvasNode[]; edges: CanvasEdge[] }
  rev: number
}

export function useSync() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const setAll = useCanvasStore((s) => s.setAll)
  const putTimer = useRef<number | null>(null)
  const receivedRemote = useRef(false)

  useEffect(() => {
    let closed = false
    let ws: WebSocket | null = null
    let reconnectTimer: number | null = null

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      let firstMessage = true
      ws = new WebSocket(`${proto}//${location.host}/ws`)
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage
          if (msg.type !== 'state' || !msg.state) return
          // First message is the welcome. If server has no state yet, don't wipe
          // the canvas's default client-side state.
          if (firstMessage) {
            firstMessage = false
            if (msg.state.nodes.length === 0 && msg.state.edges.length === 0) return
          }
          receivedRemote.current = true
          setAll({ nodes: msg.state.nodes, edges: msg.state.edges })
        } catch {
          // malformed frame — ignore
        }
      }
      ws.onclose = () => {
        if (closed) return
        reconnectTimer = window.setTimeout(connect, 1000)
      }
    }

    connect()
    return () => {
      closed = true
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [setAll])

  useEffect(() => {
    // If the change came from a remote broadcast, don't PUT it back — it's an echo.
    if (receivedRemote.current) {
      receivedRemote.current = false
      return
    }
    if (putTimer.current !== null) window.clearTimeout(putTimer.current)
    putTimer.current = window.setTimeout(() => {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      }).catch(() => {
        // server offline — silently skip; editor still works locally
      })
    }, 150)
    return () => {
      if (putTimer.current !== null) window.clearTimeout(putTimer.current)
    }
  }, [nodes, edges])
}
