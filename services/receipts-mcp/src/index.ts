import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pino from 'pino';

const logger =
  process.env['NODE_ENV'] !== 'production'
    ? pino({ level: process.env['LOG_LEVEL'] ?? 'info', transport: { target: 'pino-pretty' } })
    : pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

// ── Tool input schemas ────────────────────────────────────────────────────────

const SendEmailInput = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  dispute_id: z.string(),
  draft_version: z.number().int().positive(),
});

const GetResponsesInput = z.object({
  dispute_id: z.string(),
  since: z.string().datetime().optional(),
});

// ── MCP Server ────────────────────────────────────────────────────────────────

function createServer(): Server {
  const server = new Server(
    { name: 'receipts-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'send_email',
        description:
          'Send a dispute email to a merchant on behalf of the user.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            to: { type: 'string', format: 'email', description: 'Merchant email address' },
            subject: { type: 'string', maxLength: 200 },
            body: { type: 'string', maxLength: 5000 },
            dispute_id: { type: 'string' },
            draft_version: { type: 'integer', minimum: 1 },
          },
          required: ['to', 'subject', 'body', 'dispute_id', 'draft_version'],
        },
      },
      {
        name: 'get_responses',
        description:
          'Check Gmail for merchant replies to a dispute thread.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            dispute_id: { type: 'string' },
            since: {
              type: 'string',
              format: 'date-time',
              description: 'Only return responses after this ISO timestamp',
            },
          },
          required: ['dispute_id'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'send_email') {
        const input = SendEmailInput.parse(args);
        logger.info(
          { dispute_id: input.dispute_id, to: input.to },
          'STUB: would send email',
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message_id: `stub-msg-id-${Date.now()}`,
                sent_at: new Date().toISOString(),
              }),
            },
          ],
        };
      }

      if (name === 'get_responses') {
        const input = GetResponsesInput.parse(args);
        logger.info(
          { dispute_id: input.dispute_id },
          'STUB: would check Gmail for replies',
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                responses: [],
                checked_at: new Date().toISOString(),
              }),
            },
          ],
        };
      }

      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: message }],
      };
    }
  });

  return server;
}

// ── Transport selection ───────────────────────────────────────────────────────

const args = process.argv.slice(2);
const transportIdx = args.indexOf('--transport');
const rawTransport = transportIdx >= 0 ? (args[transportIdx + 1] ?? 'stdio') : 'stdio';
const transportMode = rawTransport === 'sse' ? 'sse' : 'stdio';

if (transportMode === 'stdio') {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('receipts-mcp running on stdio');
} else {
  const port = Number(process.env['PORT'] ?? '8080');
  const server = createServer();

  // One active SSE session at a time (single-user consumer app)
  let activeTransport: SSEServerTransport | null = null;

  const httpServer = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/sse') {
      activeTransport = new SSEServerTransport('/messages', res);
      await server.connect(activeTransport);
      logger.info('SSE client connected');
    } else if (req.method === 'POST' && req.url?.startsWith('/messages')) {
      if (activeTransport) {
        await activeTransport.handlePostMessage(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No active session' }));
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(port, () => {
    logger.info(`receipts-mcp SSE server listening on port ${port}`);
  });
}
