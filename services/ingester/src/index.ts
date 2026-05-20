import pino from 'pino';
import { connectWithRetry, getDb, getDisputesCollection } from '@receipts/shared';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const logger =
  process.env['NODE_ENV'] !== 'production'
    ? pino({ level: process.env['LOG_LEVEL'] ?? 'info', transport: { target: 'pino-pretty' } })
    : pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

async function pollGmail(): Promise<void> {
  logger.info('STUB: would check Gmail for new forwarded receipts');
}

export async function startIngester(): Promise<void> {
  const mongoUri = requireEnv('MONGODB_URI');
  requireEnv('RECEIPTS_EMAIL_ADDRESS');

  const client = await connectWithRetry(mongoUri);
  const db = getDb(client);
  const _disputes = getDisputesCollection(db);

  logger.info('Ingester started, polling Gmail every 30s (STUB)');

  const interval = setInterval(() => {
    void pollGmail();
  }, 30_000);

  process.on('SIGTERM', () => {
    logger.info('Shutting down');
    clearInterval(interval);
    void client.close().then(() => process.exit(0));
  });
}

startIngester().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error in ingester');
  process.exit(1);
});
