import pino from 'pino';
import { connectWithRetry, getDb } from '@receipts/shared';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const logger =
  process.env['NODE_ENV'] !== 'production'
    ? pino({ level: process.env['LOG_LEVEL'] ?? 'info', transport: { target: 'pino-pretty' } })
    : pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

export async function seedCorpus(): Promise<void> {
  const mongoUri = requireEnv('MONGODB_URI');

  logger.info(
    [
      'STUB: seed-corpus is a placeholder.',
      'In Week 1, this script will:',
      '  1) Read policies/regulations/playbooks from ./data/*.json',
      '  2) Call the Voyage API to embed each document (voyage-3, 1024 dims)',
      '  3) Upsert documents into MongoDB with their embeddings',
      '  4) Verify Atlas Vector Search indexes exist on each collection',
    ].join('\n'),
  );

  const client = await connectWithRetry(mongoUri);
  const _db = getDb(client);

  logger.info('Connected to MongoDB — ready to seed (STUB)');

  await client.close();
}

seedCorpus().catch((err: unknown) => {
  logger.error({ err }, 'seed-corpus failed');
  process.exit(1);
});
