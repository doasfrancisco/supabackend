import type {
  CanvasEdge,
  CanvasNode,
  CanvasState,
  EndpointNode,
  EntityField,
  EntityNode,
  JobNode,
  ServiceNode,
  StateMachineNode,
} from '../types'

export type FileEntry = { path: string; language: CodeLanguage; code: string }
export type CodeLanguage =
  | 'typescript'
  | 'prisma'
  | 'yaml'
  | 'json'
  | 'markdown'
  | 'bash'
  | 'text'

const isEntity = (n: CanvasNode): n is EntityNode => n.type === 'entity'
const isEndpoint = (n: CanvasNode): n is EndpointNode => n.type === 'endpoint'
const isJob = (n: CanvasNode): n is JobNode => n.type === 'job'
const isMachine = (n: CanvasNode): n is StateMachineNode => n.type === 'state_machine'
const isService = (n: CanvasNode): n is ServiceNode => n.type === 'service'

const TYPE_TO_PRISMA: Record<string, { prisma: string; dbAttr?: string }> = {
  uuid: { prisma: 'String', dbAttr: '@db.Uuid' },
  text: { prisma: 'String' },
  varchar: { prisma: 'String' },
  string: { prisma: 'String' },
  int: { prisma: 'Int' },
  integer: { prisma: 'Int' },
  bigint: { prisma: 'BigInt' },
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

function lower(s: string): string {
  return s.length ? s[0]!.toLowerCase() + s.slice(1) : s
}

function indent(block: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return block
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}

function stripHandleSuffix(h: string | null | undefined, suffix: '-src' | '-tgt'): string | null {
  if (!h) return null
  return h.endsWith(suffix) ? h.slice(0, -suffix.length) : h
}

function prismaHeader(): string[] {
  return [
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    '',
    'datasource db {',
    '  provider = "postgresql"',
    '  url      = env("DATABASE_URL")',
    '}',
  ]
}

function prismaModelBlock(ent: EntityNode, entities: EntityNode[], fks: CanvasEdge[]): string[] {
  const out: string[] = []
  out.push(`// canvas node: ${ent.id}`)
  out.push(`model ${ent.data.name} {`)
  for (const field of ent.data.fields as EntityField[]) {
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
  for (const fk of fks.filter((e) => e.source === ent.id)) {
    const childCol = stripHandleSuffix(fk.sourceHandle, '-src')
    const parentCol = stripHandleSuffix(fk.targetHandle, '-tgt')
    const parent = entities.find((e) => e.id === fk.target)
    if (!childCol || !parentCol || !parent) continue
    out.push(
      `  ${parent.data.name} ${parent.data.name} @relation(fields: [${childCol}], references: [${parentCol}])`,
    )
  }
  for (const fk of fks.filter((e) => e.target === ent.id)) {
    const child = entities.find((e) => e.id === fk.source)
    if (!child) continue
    out.push(`  ${child.data.name} ${child.data.name}[]`)
  }
  out.push('}')
  return out
}

export function canvasToPrisma(state: CanvasState): string {
  const entities = state.nodes.filter(isEntity)
  const fks = state.edges.filter((e) => e.data?.kind === 'fk')
  const out: string[] = [...prismaHeader()]
  for (const ent of entities) {
    out.push('')
    out.push(...prismaModelBlock(ent, entities, fks))
  }
  return out.join('\n') + '\n'
}

function autoStub(
  method: string,
  path: string,
  reads: EntityNode[],
  writes: EntityNode[],
  fallbackName: string,
): string {
  if (method === 'get' && reads.length) {
    const model = lower(reads[0]!.data.name)
    if (path.includes(':id')) {
      return [
        `const ${model} = await prisma.${model}.findUnique({ where: { id: req.params.id } })`,
        `if (!${model}) return res.status(404).json({ error: 'not found' })`,
        `res.json(${model})`,
      ].join('\n')
    }
    return [
      `const items = await prisma.${model}.findMany()`,
      'res.json(items)',
    ].join('\n')
  }
  if (method === 'post' && writes.length) {
    const model = lower(writes[0]!.data.name)
    return [
      `const created = await prisma.${model}.create({ data: req.body })`,
      'res.status(201).json(created)',
    ].join('\n')
  }
  if ((method === 'put' || method === 'patch') && writes.length) {
    const model = lower(writes[0]!.data.name)
    return [
      `const updated = await prisma.${model}.update({`,
      '  where: { id: req.params.id },',
      '  data: req.body,',
      '})',
      'res.json(updated)',
    ].join('\n')
  }
  if (method === 'delete' && writes.length) {
    const model = lower(writes[0]!.data.name)
    return [
      `await prisma.${model}.delete({ where: { id: req.params.id } })`,
      'res.status(204).send()',
    ].join('\n')
  }
  return `res.json({ message: 'TODO: implement ${fallbackName}' })`
}

function endpointBlock(ep: EndpointNode, state: CanvasState): string[] {
  const entities = state.nodes.filter(isEntity)
  const method = (ep.data.method ?? 'GET').toLowerCase()
  const path = ep.data.path ?? '/'
  const reads = state.edges
    .filter((e) => e.source === ep.id && e.data?.kind === 'reads')
    .map((e) => entities.find((ent) => ent.id === e.target))
    .filter((e): e is EntityNode => !!e)
  const writes = state.edges
    .filter((e) => e.source === ep.id && e.data?.kind === 'writes')
    .map((e) => entities.find((ent) => ent.id === e.target))
    .filter((e): e is EntityNode => !!e)

  const out: string[] = []
  out.push(`// ${method.toUpperCase()} ${path} — canvas node: ${ep.id}`)
  out.push(`router.${method}('${path}', async (req, res) => {`)
  if (ep.data.auth) out.push('  // TODO: auth required')
  out.push('  try {')
  if (ep.data.handler) out.push(indent(ep.data.handler, 4))
  else out.push(indent(autoStub(method, path, reads, writes, ep.data.name), 4))
  out.push('  } catch (err) {')
  out.push(`    console.error('[${method.toUpperCase()} ${path}]', err)`)
  out.push('    res.status(500).json({ error: (err as Error).message })')
  out.push('  }')
  out.push('})')
  return out
}

export function canvasToRoutes(state: CanvasState): string {
  const endpoints = state.nodes.filter(isEndpoint)
  const out: string[] = []
  out.push('// Generated by supabackend canvas. Edit the canvas, not this file.')
  out.push("import { Router } from 'express'")
  out.push("import { PrismaClient } from '@prisma/client'")
  out.push('')
  out.push('export const router = Router()')
  out.push('const prisma = new PrismaClient()')
  out.push('')
  if (!endpoints.length) {
    out.push('// No endpoints defined on the canvas.')
    return out.join('\n') + '\n'
  }
  for (const ep of endpoints) {
    out.push(...endpointBlock(ep, state))
    out.push('')
  }
  return out.join('\n')
}

function jobBlock(job: JobNode): string[] {
  const name = job.data.name
  const out: string[] = []
  out.push(`  // ${name} — canvas node: ${job.id}`)
  if (job.data.kind === 'cron') {
    const schedule = job.data.schedule ?? '0 * * * *'
    out.push(`  new CronJob('${schedule}', async () => {`)
    const body = job.data.handler ?? `console.log('[cron] ${name} tick')`
    out.push(indent(body, 4))
    out.push('  }).start()')
  } else {
    const queue = job.data.queue ?? name
    out.push(`  new Worker('${queue}', async (job) => {`)
    const body = job.data.handler ?? `console.log('[worker] ${name}', job.data)`
    out.push(indent(body, 4))
    out.push(`  }, { connection: { host: 'localhost', port: 6379 } })`)
  }
  return out
}

export function canvasToJobs(state: CanvasState): string {
  const jobs = state.nodes.filter(isJob)
  const hasCron = jobs.some((j) => j.data.kind === 'cron')
  const hasQueue = jobs.some((j) => j.data.kind === 'queue')
  const out: string[] = []
  out.push('// Generated by supabackend canvas. Edit the canvas, not this file.')
  if (hasCron) out.push("import { CronJob } from 'cron'")
  if (hasQueue) out.push("import { Worker } from 'bullmq'")
  out.push("import { PrismaClient } from '@prisma/client'")
  out.push('')
  out.push('const prisma = new PrismaClient()')
  out.push('')
  if (!jobs.length) {
    out.push('export function startJobs() {}')
    return out.join('\n') + '\n'
  }
  out.push('export function startJobs() {')
  for (const job of jobs) {
    out.push(...jobBlock(job))
    out.push('')
  }
  out.push('  // canvas node: __jobs_end__')
  out.push('}')
  return out.join('\n') + '\n'
}

function machineBlock(m: StateMachineNode): string[] {
  const name = m.data.name
  const states = m.data.states ?? []
  const transitions = m.data.transitions ?? []
  const initial = m.data.initial ?? states[0] ?? 'start'
  const out: string[] = []
  out.push(`// ${name} — canvas node: ${m.id}`)
  out.push(`export const ${name}Machine = createMachine({`)
  out.push(`  id: '${name}',`)
  out.push(`  initial: '${initial}',`)
  out.push('  states: {')
  for (const s of states) {
    const outgoing = transitions.filter((t) => t.from === s)
    if (outgoing.length) {
      out.push(`    ${s}: {`)
      out.push('      on: {')
      for (const t of outgoing) out.push(`        ${t.event}: '${t.to}',`)
      out.push('      },')
      out.push('    },')
    } else {
      out.push(`    ${s}: { type: 'final' },`)
    }
  }
  out.push('  },')
  out.push('})')
  return out
}

export function canvasToMachines(state: CanvasState): string {
  const machines = state.nodes.filter(isMachine)
  const out: string[] = []
  out.push('// Generated by supabackend canvas. Edit the canvas, not this file.')
  if (!machines.length) return out.join('\n') + '\n'
  out.push("import { createMachine } from 'xstate'")
  out.push('')
  for (const m of machines) {
    out.push(...machineBlock(m))
    out.push('')
  }
  return out.join('\n')
}

function serviceBlock(svc: ServiceNode): string[] {
  const name = svc.data.name
  const kind = svc.data.kind ?? 'http-service'
  const out: string[] = []
  out.push(`  ${name}:  # canvas node: ${svc.id}`)
  if (['postgres', 'database', 'db'].includes(kind)) {
    out.push('    image: postgres:16')
    out.push('    environment:')
    out.push('      POSTGRES_PASSWORD: dev')
    out.push('      POSTGRES_DB: app')
    out.push('    ports: ["5432:5432"]')
  } else if (kind === 'redis') {
    out.push('    image: redis:7')
    out.push('    ports: ["6379:6379"]')
  } else {
    out.push(`    build: ./${name}`)
    out.push('    ports: ["3000:3000"]')
  }
  return out
}

export function canvasToCompose(state: CanvasState): string {
  const services = state.nodes.filter(isService)
  const entities = state.nodes.filter(isEntity)
  const jobs = state.nodes.filter(isJob)
  const hasQueue = jobs.some((j) => j.data.kind === 'queue')
  const out: string[] = []
  out.push('# Generated by supabackend canvas. Edit the canvas, not this file.')
  out.push('version: "3.9"')
  out.push('services:')
  for (const svc of services) out.push(...serviceBlock(svc))
  const hasDb = services.some((s) => ['postgres', 'database', 'db'].includes(s.data.kind ?? ''))
  if (entities.length && !hasDb) {
    out.push('  db:  # canvas node: __auto_db__')
    out.push('    image: postgres:16')
    out.push('    environment:')
    out.push('      POSTGRES_PASSWORD: dev')
    out.push('      POSTGRES_DB: app')
    out.push('    ports: ["5432:5432"]')
  }
  const hasRedis = services.some((s) => s.data.kind === 'redis')
  if (hasQueue && !hasRedis) {
    out.push('  redis:  # canvas node: __auto_redis__')
    out.push('    image: redis:7')
    out.push('    ports: ["6379:6379"]')
  }
  return out.join('\n') + '\n'
}

function generateIndex(state: CanvasState): string {
  const hasEndpoints = state.nodes.some(isEndpoint)
  const hasJobs = state.nodes.some(isJob)
  const lines: string[] = [
    '// Generated by supabackend canvas.',
    "import express from 'express'",
  ]
  if (hasEndpoints) lines.push("import { router } from './routes.js'")
  if (hasJobs) lines.push("import { startJobs } from './jobs.js'")
  lines.push('')
  lines.push('const app = express()')
  lines.push('app.use(express.json())')
  if (hasEndpoints) lines.push('app.use(router)')
  lines.push('')
  if (hasJobs) lines.push('startJobs()')
  lines.push('')
  lines.push('const port = Number(process.env.PORT ?? 3000)')
  lines.push('app.listen(port, () => console.log(`server on :${port}`))')
  return lines.join('\n') + '\n'
}

function generateEnvExample(): string {
  return 'DATABASE_URL=postgresql://postgres:dev@localhost:5432/app\n'
}

function generatePackageJson(state: CanvasState): string {
  const jobs = state.nodes.filter(isJob)
  const hasCron = jobs.some((j) => j.data.kind === 'cron')
  const hasQueue = jobs.some((j) => j.data.kind === 'queue')
  const hasMachines = state.nodes.some(isMachine)
  const deps: Record<string, string> = {
    '@prisma/client': '^5.22.0',
    express: '^4.21.1',
  }
  if (hasCron) deps.cron = '^3.1.7'
  if (hasQueue) deps.bullmq = '^5.21.2'
  if (hasMachines) deps.xstate = '^5.19.0'
  const pkg = {
    name: 'supabackend-app',
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      'db:push': 'prisma db push',
    },
    dependencies: deps,
  }
  return JSON.stringify(pkg, null, 2) + '\n'
}

export function canvasToFiles(state: CanvasState): FileEntry[] {
  const files: FileEntry[] = []
  files.push({ path: 'package.json', language: 'json', code: generatePackageJson(state) })
  files.push({ path: '.env.example', language: 'bash', code: generateEnvExample() })
  files.push({ path: 'docker-compose.yml', language: 'yaml', code: canvasToCompose(state) })
  if (state.nodes.some(isEntity)) {
    files.push({
      path: 'prisma/schema.prisma',
      language: 'prisma',
      code: canvasToPrisma(state),
    })
  }
  files.push({ path: 'src/index.ts', language: 'typescript', code: generateIndex(state) })
  if (state.nodes.some(isEndpoint)) {
    files.push({ path: 'src/routes.ts', language: 'typescript', code: canvasToRoutes(state) })
  }
  if (state.nodes.some(isJob)) {
    files.push({ path: 'src/jobs.ts', language: 'typescript', code: canvasToJobs(state) })
  }
  if (state.nodes.some(isMachine)) {
    files.push({ path: 'src/machines.ts', language: 'typescript', code: canvasToMachines(state) })
  }
  return files
}

export type NodeCode = { code: string; language: CodeLanguage; file: string }

export function codeForNode(state: CanvasState, nodeId: string): NodeCode | null {
  const n = state.nodes.find((x) => x.id === nodeId)
  if (!n) return null
  if (isEntity(n)) {
    const entities = state.nodes.filter(isEntity)
    const fks = state.edges.filter((e) => e.data?.kind === 'fk')
    return {
      code: prismaModelBlock(n, entities, fks).join('\n') + '\n',
      language: 'prisma',
      file: 'prisma/schema.prisma',
    }
  }
  if (isEndpoint(n)) {
    return {
      code: endpointBlock(n, state).join('\n') + '\n',
      language: 'typescript',
      file: 'src/routes.ts',
    }
  }
  if (isJob(n)) {
    return {
      code: jobBlock(n).join('\n') + '\n',
      language: 'typescript',
      file: 'src/jobs.ts',
    }
  }
  if (isMachine(n)) {
    return {
      code: machineBlock(n).join('\n') + '\n',
      language: 'typescript',
      file: 'src/machines.ts',
    }
  }
  if (isService(n)) {
    return {
      code: serviceBlock(n).join('\n') + '\n',
      language: 'yaml',
      file: 'docker-compose.yml',
    }
  }
  return null
}

export type BlockRange = { nodeId: string; start: number; end: number }

export function blockRangesForFile(code: string): BlockRange[] {
  const lines = code.split('\n')
  const starts: Array<{ id: string; line: number }> = []
  lines.forEach((line, i) => {
    const m = line.match(/canvas node:\s*([\w.-]+)/)
    if (m) starts.push({ id: m[1]!, line: i + 1 })
  })
  const ranges: BlockRange[] = []
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]!.line
    const next = starts[i + 1]?.line ?? lines.length + 1
    let end = next - 1
    while (end > start && lines[end - 1] !== undefined && lines[end - 1]!.trim() === '') end--
    ranges.push({ nodeId: starts[i]!.id, start, end })
  }
  return ranges
}

export type FileImport = {
  from: string
  to: string
  label: string
}

export function fileImports(files: FileEntry[]): FileImport[] {
  const paths = new Set(files.map((f) => f.path))
  const out: FileImport[] = []
  for (const f of files) {
    if (f.language !== 'typescript') continue
    const importMatches = f.code.matchAll(/from '(\.\.?\/[^']+)'/g)
    for (const m of importMatches) {
      const rel = m[1]!
      const resolved = resolveRelative(f.path, rel)
      if (resolved && paths.has(resolved)) {
        out.push({ from: f.path, to: resolved, label: 'import' })
      }
    }
    if (f.code.includes("from '@prisma/client'") && paths.has('prisma/schema.prisma')) {
      out.push({ from: f.path, to: 'prisma/schema.prisma', label: 'prisma' })
    }
  }
  return out
}

function resolveRelative(fromPath: string, rel: string): string | null {
  const fromParts = fromPath.split('/')
  fromParts.pop()
  let relClean = rel.replace(/\.js$/, '').replace(/\.ts$/, '')
  for (const part of relClean.split('/')) {
    if (part === '..') fromParts.pop()
    else if (part !== '.') fromParts.push(part)
  }
  const base = fromParts.join('/')
  for (const ext of ['.ts', '.js', '']) {
    const candidate = base + ext
    if (candidate) return candidate
  }
  return null
}
