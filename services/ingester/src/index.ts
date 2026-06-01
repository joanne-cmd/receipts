import pino from 'pino';
import { connectWithRetry, getDb, getDisputesCollection } from '@receipts/shared';
import { google } from 'googleapis';
import { randomUUID } from 'node:crypto';
import http from 'node:http';

type DisputesCollection = ReturnType<typeof getDisputesCollection>;

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const logger =
  process.env['NODE_ENV'] !== 'production'
    ? pino({ level: process.env['LOG_LEVEL'] ?? 'info', transport: { target: 'pino-pretty' } })
    : pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

async function pollGmail(
  disputes: DisputesCollection,
  credentials: GmailCredentials,
): Promise<void> {
  const auth = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret);
  auth.setCredentials({ refresh_token: credentials.refreshToken });

  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread (from:amazon OR from:jumia OR from:airbnb OR from:uber OR from:netflix OR from:carrefour) (subject:receipt OR subject:order OR subject:invoice OR subject:refund OR subject:charge OR subject:delivered)',
    maxResults: 10,
  });

  const messages = listRes.data.messages ?? [];
  let newCount = 0;

  for (const msg of messages) {
    if (!msg.id) continue;

    const fullMsg = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const payload = fullMsg.data.payload;
    if (!payload) continue;

    const firstPart = payload.parts?.[0];
    const bodyData = firstPart?.body?.data ?? payload.body?.data;
    const bodyText = bodyData ? Buffer.from(bodyData, 'base64url').toString('utf-8') : '';

    const headers = payload.headers ?? [];
    const subject = headers.find((h) => h.name === 'Subject')?.value ?? '';
    const from = headers.find((h) => h.name === 'From')?.value ?? '';
    const replyTo = headers.find((h) => h.name === 'Reply-To')?.value;

    const fromMatch = from.match(/^(.*?)\s*<(.+)>$/);
    const merchantDisplay = fromMatch?.[1]?.trim() ?? from;
    const fromEmail = fromMatch?.[2] ?? from;
    const merchantDomain = fromEmail.split('@')[1] ?? fromEmail;

    const merchantEmail = replyTo
      ? (replyTo.match(/<(.+)>/)?.[1] ?? replyTo)
      : fromEmail;

    const skipKeywords = ['learn', 'course', 'hacking', 'news', 'trial', 'sanity', 'meal', 'scam alert'];
    if (skipKeywords.some((kw) => subject.toLowerCase().includes(kw))) continue;

    const existing = await disputes.findOne({ receipt_raw: msg.id });
    if (existing) continue;

    const now = new Date().toISOString();

    await disputes.insertOne({
      _id: randomUUID(),
      user_id: 'default',
      status: 'pending_classification',
      receipt_raw: bodyText,
      receipt_parsed: { merchant_email: merchantEmail },
      merchant: merchantDomain,
      merchant_display: merchantDisplay,
      drafts: [],
      current_draft_version: 0,
      merchant_responses: [],
      safety_flag: false,
      currency: 'USD',
      timeline: [{ timestamp: now, event: 'dispute_created', actor: 'system' }],
      created_at: now,
      updated_at: now,
    });

    await gmail.users.messages.modify({
      userId: 'me',
      id: msg.id,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });

    newCount++;
    logger.info({ messageId: msg.id, subject }, 'New dispute created');
  }

  logger.info(`Polled Gmail: ${newCount} new dispute(s) created`);
}

export async function startIngester(): Promise<void> {
  const port = Number(process.env['PORT'] ?? '8080');
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  }).listen(port, () => {
    logger.info({ port }, 'Health check server listening');
  });

  const mongoUri = requireEnv('MONGODB_URI');
  requireEnv('RECEIPTS_EMAIL_ADDRESS');
  const clientId = requireEnv('GMAIL_CLIENT_ID');
  const clientSecret = requireEnv('GMAIL_CLIENT_SECRET');
  const refreshToken = requireEnv('GMAIL_REFRESH_TOKEN');

  const client = await connectWithRetry(mongoUri);
  const db = getDb(client);
  const disputes = getDisputesCollection(db);

  const credentials: GmailCredentials = { clientId, clientSecret, refreshToken };

  logger.info('Ingester started, polling Gmail every 30s');

  const interval = setInterval(() => {
    void pollGmail(disputes, credentials).catch((err: unknown) => {
      logger.error({ err }, 'Error polling Gmail');
    });
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
