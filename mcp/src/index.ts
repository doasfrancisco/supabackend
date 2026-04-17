#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server.js'

async function main() {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // server runs until stdin closes
}

main().catch((err) => {
  // MCP uses stdout for protocol, so errors must go to stderr
  console.error('[supabackend-mcp] fatal:', err)
  process.exit(1)
})
