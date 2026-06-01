import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { body: draftBody } = await req.json() as { body: unknown };

  if (typeof draftBody !== 'string' || !draftBody.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

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

  const draftIndex: number =
    Array.isArray(dispute.drafts) && dispute.drafts.length > 0
      ? dispute.drafts.length - 1
      : 0;

  const now = new Date().toISOString();

  const filter = ObjectId.isValid(params.id)
    ? { _id: new ObjectId(params.id) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : { _id: params.id as any };

  await col.updateOne(filter, {
    $set: {
      [`drafts.${draftIndex}.body`]: draftBody,
      updated_at: now,
    },
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
