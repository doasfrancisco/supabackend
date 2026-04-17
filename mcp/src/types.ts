export type EntityField = {
  name: string
  type: string
  isPrimary?: boolean
  isNullable?: boolean
}

export type EntityNodeData = {
  name: string
  fields: EntityField[]
}

export type ServiceNodeData = {
  name: string
  kind: string
}

export type CanvasNode = {
  id: string
  type: 'entity' | 'service' | string
  position: { x: number; y: number }
  data: Record<string, unknown> & { name?: string }
}

export type CanvasEdgeKind = 'fk' | 'calls' | 'reads' | 'writes'

export type CanvasEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  data?: Record<string, unknown> & { kind?: CanvasEdgeKind; label?: string }
}

export type CanvasState = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export type Op =
  | { type: 'add_node'; node: CanvasNode }
  | { type: 'update_node'; id: string; patch?: Record<string, unknown>; position?: { x: number; y: number } }
  | { type: 'delete_node'; id: string }
  | { type: 'add_edge'; edge: CanvasEdge }
  | { type: 'update_edge'; id: string; patch?: Record<string, unknown> }
  | { type: 'delete_edge'; id: string }
  | { type: 'replace_state'; state: CanvasState }
