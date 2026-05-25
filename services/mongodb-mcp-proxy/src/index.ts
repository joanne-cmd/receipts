import 'dotenv/config';
import express from 'express';
import { MongoClient } from 'mongodb';
import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const PORT = parseInt(process.env['PORT'] ?? '8080', 10);
const MONGODB_URI = process.env['MONGODB_URI'];

if (!MONGODB_URI) throw new Error('MONGODB_URI is required');

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db('receipts');

async function searchKnowledge(query: string) {
  return db.collection('knowledge').aggregate([
    { $search: { index: 'knowledge_text_index', text: { query, path: 'content' } } },
    { $limit: 5 },
    { $project: { content: 0 } },
  ]).toArray();
}

// ── MCP server ────────────────────────────────────────────────────────────────

const mcpServer = new Server(
  { name: 'mongodb-mcp-proxy', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'search_knowledge',
    description: 'Full-text search over policies, regulations, and playbooks',
    inputSchema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
  }],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name !== 'search_knowledge') throw new Error(`Unknown tool: ${name}`);
  const { query } = z.object({ query: z.string().min(1) }).parse(args);
  const docs = await searchKnowledge(query);
  return { content: [{ type: 'text' as const, text: JSON.stringify(docs, null, 2) }] };
});

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const transports = new Map<string, SSEServerTransport>();

app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });

app.get('/', async (_req, res) => {
  const transport = new SSEServerTransport('/message', res);
  transports.set(transport.sessionId, transport);
  res.on('close', () => transports.delete(transport.sessionId));
  await mcpServer.connect(transport);
});

app.post('/message', async (req, res) => {
  const sessionId = req.query['sessionId'] as string;
  const transport = transports.get(sessionId);
  if (!transport) { res.status(404).json({ error: 'Session not found' }); return; }
  await transport.handlePostMessage(req, res);
});

// ── Legacy REST endpoint ──────────────────────────────────────────────────────

const QueryBody = z.object({ query: z.string().min(1), collection: z.enum(['knowledge']) });

app.post('/query', async (req, res) => {
  const parsed = QueryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  try {
    res.json(await searchKnowledge(parsed.data.query));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

app.listen(PORT, () => console.log(`mongodb-mcp-proxy listening on :${PORT}`));
