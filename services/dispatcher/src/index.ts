import http from 'node:http';
import { google } from 'googleapis';
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
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<void> {
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth });

  const approved = await disputes
    .find({ status: 'approved', 'drafts.0': { $exists: true } })
    .toArray();

  logger.info(`Found ${approved.length} approved disputes to dispatch`);

  for (const dispute of approved) {
    const latestDraft = dispute.drafts.reduce((best, d) =>
      d.version > best.version ? d : best,
    );

    const merchantEmail = dispute.receipt_parsed?.merchant_email;
    if (!merchantEmail) {
      logger.warn({ disputeId: dispute._id }, 'Skipping dispute — no merchant_email in receipt_parsed');
      continue;
    }

    const rawEmail = [
      `To: ${merchantEmail}`,
      `Subject: ${latestDraft.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      latestDraft.body,
    ].join('\r\n');

    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedEmail },
    });

    const messageId = response.data.id ?? 'unknown';

    await disputes.updateOne(
      { _id: dispute._id },
      {
        $set: {
          status: 'sent',
          updated_at: new Date().toISOString(),
        },
        $push: {
          timeline: {
            timestamp: new Date().toISOString(),
            event: 'email_sent',
            actor: 'system',
          },
        },
      },
    );

    logger.info({ disputeId: dispute._id, messageId }, 'Email sent and dispute marked as sent');
  }
}

export async function startDispatcher(): Promise<void> {
  const mongoUri = requireEnv('MONGODB_URI');
  const clientId = requireEnv('GMAIL_CLIENT_ID');
  const clientSecret = requireEnv('GMAIL_CLIENT_SECRET');
  const refreshToken = requireEnv('GMAIL_REFRESH_TOKEN');

  const port = parseInt(process.env['PORT'] ?? '8080', 10);

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });
  server.listen(port, () => {
    logger.info(`Health check listening on port ${port}`);
  });

  const client = await connectWithRetry(mongoUri);
  const db = getDb(client);
  const disputes = getDisputesCollection(db);

  logger.info('Dispatcher started, polling for approved disputes every 60s');

  const interval = setInterval(() => {
    void pollApprovedDisputes(disputes, clientId, clientSecret, refreshToken);
  }, 60_000);

  process.on('SIGTERM', () => {
    logger.info('Shutting down');
    clearInterval(interval);
    server.close();
    void client.close().then(() => process.exit(0));
  });
}

startDispatcher().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error in dispatcher');
  process.exit(1);
});
