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

async function pollApprovedDisputes(
  disputes: ReturnType<typeof getDisputesCollection>,
): Promise<void> {
  const approved = await disputes.find({ status: 'approved' }).toArray();
  logger.info(
    `STUB: found ${approved.length} approved disputes, would dispatch`,
  );
}

export async function startDispatcher(): Promise<void> {
  const mongoUri = requireEnv('MONGODB_URI');

  const client = await connectWithRetry(mongoUri);
  const db = getDb(client);
  const disputes = getDisputesCollection(db);

  logger.info('Dispatcher started, polling for approved disputes every 60s (STUB)');

  const interval = setInterval(() => {
    void pollApprovedDisputes(disputes);
  }, 60_000);

  process.on('SIGTERM', () => {
    logger.info('Shutting down');
    clearInterval(interval);
    void client.close().then(() => process.exit(0));
  });
}

startDispatcher().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error in dispatcher');
  process.exit(1);
});
