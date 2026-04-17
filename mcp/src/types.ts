export type EntityField = {
  name: string
  type: string
  isPrimary?: boolean
  isNullable?: boolean
}

export type CanvasNode = {
  id: string
  type: 'entity' | 'service'
  position: { x: number; y: number }
  data: Record<string, unknown> & { name?: string }
}

export type CanvasEdgeKind = 'fk' | 'calls' | 'reads' | 'writes'

export type CanvasEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data?: { kind?: CanvasEdgeKind; label?: string }
}

export type CanvasState = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}
