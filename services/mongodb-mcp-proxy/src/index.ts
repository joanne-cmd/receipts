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
    { $project: { _id: 0, title: 1, content: 1, source: 1, type: 1 } },
  ]).toArray();
}

// ── MCP server ────────────────────────────────────────────────────────────────

function createMcpServer(): Server {
  const server = new Server(
    { name: 'mongodb-mcp-proxy', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
      name: 'search_knowledge',
      description: 'Search merchant refund policies and US consumer regulations (FTC, DoT, CFPB). Use this before drafting any dispute email.',
      inputSchema: {
        type: 'object' as const,
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query'],
      },
    }],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name !== 'search_knowledge') throw new Error(`Unknown tool: ${name}`);
    const { query } = z.object({ query: z.string().min(1) }).parse(args);
    const docs = await searchKnowledge(query);
    return { content: [{ type: 'text' as const, text: JSON.stringify(docs, null, 2) }] };
  });

  return server;
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => { res.json({ status: 'ok', mongo: 'connected' }); });

app.get('/sse', async (_req, res) => {
  const transport = new SSEServerTransport('/message', res);
  await createMcpServer().connect(transport);
});

// ── Legacy REST endpoint ──────────────────────────────────────────────────────

const OPENAPI_SPEC = {
  openapi: '3.0.0',
  info: {
    title: 'Receipts Knowledge Search',
    version: '1.0.0',
    description: 'Search merchant policies and US consumer regulations',
  },
  paths: {
    '/query': {
      post: {
        operationId: 'searchKnowledge',
        summary: 'Search the knowledge base for relevant policies and regulations',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: {
                    type: 'string',
                    description: "The search query, e.g. 'Amazon undelivered package refund policy'",
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'List of relevant documents',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  },
};

app.get('/openapi.json', (_req, res) => { res.json(OPENAPI_SPEC); });

const QueryBody = z.object({ query: z.string().min(1) });

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
