import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { GoogleAuth } from 'google-auth-library';
import clientPromise from '@/lib/db';

const VERTEX_ENDPOINT =
  'https://us-central1-aiplatform.googleapis.com/v1/projects/920248197749/locations/us-central1/reasoningEngines/3908520294918127616:streamQuery';

function parseAgentOutput(raw: string): { subject: string; body: string } {
  const subjectMatch = raw.match(/^SUBJECT:\s*(.+)$/m);
  const subject = subjectMatch ? subjectMatch[1].trim() : '';
  const sepIdx = raw.indexOf('---');
  const body = sepIdx !== -1 ? raw.slice(sepIdx + 3).trim() : raw.trim();
  return { subject, body };
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const client = await clientPromise;
  const col = client.db('receipts').collection('disputes');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dispute: any = null;
  if (ObjectId.isValid(params.id)) {
    dispute = await col.findOne({ _id: new ObjectId(params.id) });
  }
  if (!dispute) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispute = await col.findOne({ _id: params.id as any });
  }

  if (!dispute) return NextResponse.json(null, { status: 404 });

  const auth = new GoogleAuth({
    credentials: JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64 || '', 'base64').toString()
    ),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const token = await auth.getAccessToken();

  const agentRes = await fetch(VERTEX_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        user_id: 'default',
        message: dispute.receipt_raw ?? '',
      },
    }),
  });

  if (!agentRes.ok) {
    const errText = await agentRes.text();
    return NextResponse.json(
      { error: 'Agent call failed', detail: errText },
      { status: 502 },
    );
  }

  const fullText = await agentRes.text();
  console.log('[generate-draft] raw response (first 500):', fullText.slice(0, 500));

  const fullResponse = fullText
    .split('\n')
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line.trim());
        return typeof parsed === 'string' ? [parsed] : [];
      } catch {
        return [];
      }
    })
    .join('');

  let subject: string;
  let body: string;
  if (fullResponse.includes('SUBJECT:')) {
    ({ subject, body } = parseAgentOutput(fullResponse));
  } else {
    subject = 'Dispute Letter';
    body = fullResponse.trim();
  }

  const now = new Date().toISOString();
  const newVersion = (dispute.current_draft_version ?? 0) + 1;

  const draft = {
    version: newVersion,
    created_at: now,
    subject,
    body,
    citations: [] as string[],
  };

  const filter = ObjectId.isValid(params.id)
    ? { _id: new ObjectId(params.id) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : { _id: params.id as any };

  await col.updateOne(filter, {
    $set: {
      current_draft_version: newVersion,
      status: 'pending_approval',
      updated_at: now,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $push: {
      drafts: draft,
      timeline: { timestamp: now, event: 'draft_generated', actor: 'agent' },
    } as any,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updated: any = null;
  if (ObjectId.isValid(params.id)) {
    updated = await col.findOne({ _id: new ObjectId(params.id) });
  }
  if (!updated) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updated = await col.findOne({ _id: params.id as any });
  }

  return NextResponse.json(updated);
}
