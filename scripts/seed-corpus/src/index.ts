import { config as dotenvConfig } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
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

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from the monorepo root (three levels up from src/)
dotenvConfig({ path: join(__dirname, '..', '..', '..', '.env') });

async function readJsonFile(relativePath: string): Promise<unknown[]> {
  const fullPath = join(__dirname, '..', relativePath);
  const raw = await readFile(fullPath, 'utf-8');
  return JSON.parse(raw) as unknown[];
}

export async function seedCorpus(): Promise<void> {
  const mongoUri = requireEnv('MONGODB_URI');

  const [policies, regulations] = await Promise.all([
    readJsonFile('data/policies.json'),
    readJsonFile('data/regulations.json'),
  ]);

  const docs = [...policies, ...regulations];
  logger.info(`Read ${policies.length} policies and ${regulations.length} regulations (${docs.length} total)`);

  const client = await connectWithRetry(mongoUri);
  const db = getDb(client);
  const collection = db.collection('knowledge');

  const result = await collection.insertMany(docs as object[]);
  logger.info(`Inserted ${result.insertedCount} documents into the 'knowledge' collection`);

  await client.close();
}

seedCorpus().catch((err: unknown) => {
  logger.error({ err }, 'seed-corpus failed');
  process.exit(1);
});
