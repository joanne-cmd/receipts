import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const client = await clientPromise;
  const col = client.db('receipts').collection('disputes');

  // Try ObjectId first, then fall back to plain string _id
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
  return NextResponse.json(dispute);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { action, rejection_reason } = body as {
    action: unknown;
    rejection_reason?: string;
  };

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 },
    );
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

  const now = new Date().toISOString();
  const timelineEntry =
    action === 'approve'
      ? { timestamp: now, event: 'draft_approved', actor: 'user' }
      : { timestamp: now, event: 'draft_rejected', actor: 'user' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setFields: Record<string, any> = {
    status: action === 'approve' ? 'pending_approval' : 'pending_classification',
    updated_at: now,
  };

  if (action === 'reject' && rejection_reason !== undefined) {
    const draftIndex: number =
      Array.isArray(dispute.drafts) && dispute.drafts.length > 0
        ? dispute.drafts.length - 1
        : 0;
    setFields[`drafts.${draftIndex}.rejection_reason`] = rejection_reason;
  }

  const filter = ObjectId.isValid(params.id)
    ? { _id: new ObjectId(params.id) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : { _id: params.id as any };

  await col.updateOne(filter, {
    $set: setFields,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $push: { timeline: timelineEntry as any },
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
