import type { Edge, Node } from '@xyflow/react'

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

export type EntityNode = Node<EntityNodeData, 'entity'>
export type ServiceNode = Node<ServiceNodeData, 'service'>
export type CanvasNode = EntityNode | ServiceNode

export type CanvasEdgeKind = 'fk' | 'calls' | 'reads' | 'writes'

export type CanvasEdgeData = {
  kind: CanvasEdgeKind
  label?: string
}

export type CanvasEdge = Edge<CanvasEdgeData>

export type CanvasState = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}
