import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import type { CanvasEdge, CanvasNode, CanvasState } from '../types'

const initial: CanvasState = {
  nodes: [
    {
      id: 'users',
      type: 'entity',
      position: { x: 80, y: 80 },
      data: {
        name: 'users',
        fields: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'email', type: 'text' },
          { name: 'created_at', type: 'timestamp' },
        ],
      },
    },
    {
      id: 'posts',
      type: 'entity',
      position: { x: 460, y: 80 },
      data: {
        name: 'posts',
        fields: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'user_id', type: 'uuid' },
          { name: 'title', type: 'text' },
          { name: 'body', type: 'text' },
          { name: 'created_at', type: 'timestamp' },
        ],
      },
    },
  ],
  edges: [
    {
      id: 'posts_user_id__users_id',
      source: 'posts',
      target: 'users',
      sourceHandle: 'user_id-src',
      targetHandle: 'id-tgt',
      data: { kind: 'fk', label: 'posts.user_id → users.id' },
    },
  ],
}

type Store = CanvasState & {
  setAll: (s: CanvasState) => void
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void
  onConnect: (connection: Connection) => void
}

export const useCanvasStore = create<Store>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  setAll: (s) => set({ nodes: s.nodes, edges: s.edges }),
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) =>
    set({ edges: addEdge(connection, get().edges) as CanvasEdge[] }),
}))
