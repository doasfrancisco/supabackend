import { getSchema } from '@mrleebo/prisma-ast'
import type { CanvasEdge, CanvasNode, CanvasState, EntityField } from './types.js'

const TYPE_TO_PRISMA: Record<string, { prisma: string; dbAttr?: string }> = {
  uuid: { prisma: 'String', dbAttr: '@db.Uuid' },
  text: { prisma: 'String' },
  varchar: { prisma: 'String' },
  char: { prisma: 'String' },
  string: { prisma: 'String' },
  int: { prisma: 'Int' },
  integer: { prisma: 'Int' },
  int4: { prisma: 'Int' },
  bigint: { prisma: 'BigInt' },
  int8: { prisma: 'BigInt' },
  float: { prisma: 'Float' },
  double: { prisma: 'Float' },
  real: { prisma: 'Float' },
  bool: { prisma: 'Boolean' },
  boolean: { prisma: 'Boolean' },
  timestamp: { prisma: 'DateTime' },
  timestamptz: { prisma: 'DateTime' },
  datetime: { prisma: 'DateTime' },
  date: { prisma: 'DateTime' },
  json: { prisma: 'Json' },
  jsonb: { prisma: 'Json' },
  bytes: { prisma: 'Bytes' },
  decimal: { prisma: 'Decimal' },
  numeric: { prisma: 'Decimal' },
}

const PRISMA_TO_TYPE: Record<string, string> = {
  String: 'text',
  Int: 'int',
  BigInt: 'bigint',
  Float: 'float',
  Boolean: 'bool',
  DateTime: 'timestamp',
  Json: 'json',
  Bytes: 'bytes',
  Decimal: 'decimal',
}

type EntityNode = CanvasNode & {
  type: 'entity'
  data: { name: string; fields: EntityField[] }
}

function isEntity(n: CanvasNode): n is EntityNode {
  return n.type === 'entity' && Array.isArray((n.data as { fields?: unknown }).fields)
}

function stripHandleSuffix(h: string | null | undefined, suffix: '-src' | '-tgt'): string | null {
  if (!h) return null
  return h.endsWith(suffix) ? h.slice(0, -suffix.length) : h
}

export function canvasToPrisma(state: CanvasState): string {
  const entities = state.nodes.filter(isEntity)
  const fks = state.edges.filter((e) => e.data?.kind === 'fk')

  const out: string[] = []
  out.push('generator client {')
  out.push('  provider = "prisma-client-js"')
  out.push('}')
  out.push('')
  out.push('datasource db {')
  out.push('  provider = "postgresql"')
  out.push('  url      = env("DATABASE_URL")')
  out.push('}')

  for (const ent of entities) {
    const modelName = ent.data.name
    out.push('')
    out.push(`model ${modelName} {`)

    for (const field of ent.data.fields) {
      const mapping = TYPE_TO_PRISMA[field.type.toLowerCase()] ?? { prisma: 'String' }
      const parts: string[] = [
        `  ${field.name}`,
        `${mapping.prisma}${field.isNullable ? '?' : ''}`,
      ]
      const attrs: string[] = []
      if (field.isPrimary) attrs.push('@id')
      if (mapping.dbAttr) attrs.push(mapping.dbAttr)
      if (attrs.length) parts.push(attrs.join(' '))
      out.push(parts.join(' '))
    }

    // Forward relations (this entity points to parents via a FK column)
    for (const fk of fks.filter((e) => e.source === ent.id)) {
      const childCol = stripHandleSuffix(fk.sourceHandle, '-src')
      const parentCol = stripHandleSuffix(fk.targetHandle, '-tgt')
      const parent = entities.find((e) => e.id === fk.target)
      if (!childCol || !parentCol || !parent) continue
      out.push(
        `  ${parent.data.name} ${parent.data.name} @relation(fields: [${childCol}], references: [${parentCol}])`,
      )
    }

    // Back-relations (other entities point to this one)
    for (const fk of fks.filter((e) => e.target === ent.id)) {
      const child = entities.find((e) => e.id === fk.source)
      if (!child) continue
      out.push(`  ${child.data.name} ${child.data.name}[]`)
    }

    out.push('}')
  }

  return out.join('\n') + '\n'
}

export function prismaToCanvas(source: string): CanvasState {
  const schema = getSchema(source) as { list?: unknown[] }
  const blocks = (schema.list ?? []) as Array<Record<string, unknown>>
  const models = blocks.filter(
    (b) => b.type === 'model' && typeof b.name === 'string',
  ) as Array<{ name: string; properties?: Array<Record<string, unknown>> }>

  const modelNames = new Set(models.map((m) => m.name))

  const nodes: CanvasNode[] = []
  const edges: CanvasEdge[] = []

  let col = 0
  for (const model of models) {
    const modelName = model.name
    const fields: EntityField[] = []
    const relations: Array<{
      childCols: string[]
      parentModel: string
      parentCols: string[]
    }> = []

    for (const rawProp of model.properties ?? []) {
      const prop = rawProp as {
        type?: string
        name?: string
        fieldType?: unknown
        array?: boolean
        optional?: boolean
        attributes?: Array<Record<string, unknown>>
      }
      if (prop.type !== 'field') continue
      const fieldName = String(prop.name ?? '')
      const rawType =
        typeof prop.fieldType === 'string' ? prop.fieldType : String(prop.fieldType ?? '')
      const attrs = prop.attributes ?? []

      const hasRelationAttr = attrs.some((a) => a.name === 'relation')
      const pointsToModel = modelNames.has(rawType)

      if (hasRelationAttr && pointsToModel) {
        const relAttr = attrs.find((a) => a.name === 'relation') as
          | { args?: Array<Record<string, unknown>> }
          | undefined
        const args = relAttr?.args ?? []
        const fromFields = findKeyedArrayArg(args, 'fields')
        const toFields = findKeyedArrayArg(args, 'references')
        if (fromFields.length && toFields.length) {
          relations.push({
            childCols: fromFields,
            parentModel: rawType,
            parentCols: toFields,
          })
        }
        continue
      }

      // Plain back-relation field (e.g. "posts posts[]" on users) — skip, it's
      // implied by the forward relation on the other side.
      if (pointsToModel && (prop.array === true || !hasRelationAttr)) continue

      // Scalar field
      const isPrimary = attrs.some((a) => a.name === 'id')
      const isOptional = prop.optional === true
      const dbAttr = attrs.find((a) => (a as { group?: string }).group === 'db') as
        | { name?: string }
        | undefined
      let resolvedType = PRISMA_TO_TYPE[rawType] ?? 'text'
      if (rawType === 'String' && dbAttr?.name === 'Uuid') resolvedType = 'uuid'

      fields.push({
        name: fieldName,
        type: resolvedType,
        ...(isPrimary ? { isPrimary: true } : {}),
        ...(isOptional ? { isNullable: true } : {}),
      })
    }

    nodes.push({
      id: modelName,
      type: 'entity',
      position: { x: 80 + col * 320, y: 80 },
      data: { name: modelName, fields },
    })
    col += 1

    for (const rel of relations) {
      const childCol = rel.childCols[0]
      const parentCol = rel.parentCols[0]
      if (!childCol || !parentCol) continue
      edges.push({
        id: `${modelName}_${childCol}__${rel.parentModel}_${parentCol}`,
        source: modelName,
        target: rel.parentModel,
        sourceHandle: `${childCol}-src`,
        targetHandle: `${parentCol}-tgt`,
        data: {
          kind: 'fk',
          label: `${modelName}.${childCol} → ${rel.parentModel}.${parentCol}`,
        },
      })
    }
  }

  return { nodes, edges }
}

/**
 * prisma-ast represents @relation(fields: [a, b]) in a nested structure that
 * varies slightly across versions. This walks the argument subtree looking for
 * a `{ type: 'array', args: [...] }` node whose ancestor key (if any) matches
 * the requested keyword.
 */
function findKeyedArrayArg(
  args: Array<Record<string, unknown>>,
  key: 'fields' | 'references',
): string[] {
  for (const arg of args) {
    const match = searchKeyedArray(arg, key)
    if (match) return match
  }
  return []
}

function searchKeyedArray(
  node: unknown,
  key: 'fields' | 'references',
  ancestorKey: string | null = null,
): string[] | null {
  if (!node || typeof node !== 'object') return null
  const n = node as Record<string, unknown>

  // Detect a keyValue wrapper: { type: 'keyValue', key: 'fields', value: {...} }
  const currentKey =
    typeof n.key === 'string' ? (n.key as string) : ancestorKey

  if (n.type === 'array' && Array.isArray((n as { args?: unknown }).args)) {
    if (currentKey === key) {
      return ((n as { args: unknown[] }).args as unknown[]).map((x) => {
        if (typeof x === 'string') return x
        if (x && typeof x === 'object' && 'name' in (x as Record<string, unknown>)) {
          return String((x as { name: string }).name)
        }
        return String(x)
      })
    }
  }

  for (const [k, v] of Object.entries(n)) {
    const inheritedKey = k === 'value' ? currentKey : currentKey
    const found = searchKeyedArray(v, key, inheritedKey)
    if (found) return found
  }
  return null
}
