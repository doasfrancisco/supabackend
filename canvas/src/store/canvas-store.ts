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

export type PageId =
  | 'all'
  | 'models'
  | 'endpoints'
  | 'jobs'
  | 'state_machines'
  | 'services'

const PAGE_STORAGE_KEY = 'supabackend.currentPage'

function loadInitialPage(): PageId {
  if (typeof window === 'undefined') return 'all'
  const saved = window.localStorage.getItem(PAGE_STORAGE_KEY)
  const valid: PageId[] = ['all', 'models', 'endpoints', 'jobs', 'state_machines', 'services']
  return (valid as string[]).includes(saved ?? '') ? (saved as PageId) : 'all'
}

type Store = CanvasState & {
  currentPage: PageId
  drillTarget: string | null
  setCurrentPage: (page: PageId) => void
  setDrillTarget: (id: string | null) => void
  setAll: (s: CanvasState) => void
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void
  onConnect: (connection: Connection) => void
}

export const useCanvasStore = create<Store>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  currentPage: loadInitialPage(),
  drillTarget: null,
  setCurrentPage: (page) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PAGE_STORAGE_KEY, page)
    }
    set({ currentPage: page, drillTarget: null })
  },
  setDrillTarget: (id) => set({ drillTarget: id }),
  setAll: (s) => set({ nodes: s.nodes, edges: s.edges }),
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) =>
    set({ edges: addEdge(connection, get().edges) as CanvasEdge[] }),
}))
