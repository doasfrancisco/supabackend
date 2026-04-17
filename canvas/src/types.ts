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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type EndpointNodeData = {
  name: string
  method: HttpMethod
  path: string
  handler?: string
  auth?: boolean
}

export type JobKind = 'cron' | 'queue'

export type JobNodeData = {
  name: string
  kind: JobKind
  schedule?: string
  queue?: string
  handler?: string
}

export type StateTransition = {
  from: string
  to: string
  event: string
}

export type StateMachineNodeData = {
  name: string
  initial: string
  states: string[]
  transitions: StateTransition[]
}

export type EntityNode = Node<EntityNodeData, 'entity'>
export type ServiceNode = Node<ServiceNodeData, 'service'>
export type EndpointNode = Node<EndpointNodeData, 'endpoint'>
export type JobNode = Node<JobNodeData, 'job'>
export type StateMachineNode = Node<StateMachineNodeData, 'state_machine'>

export type CanvasNode =
  | EntityNode
  | ServiceNode
  | EndpointNode
  | JobNode
  | StateMachineNode

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
