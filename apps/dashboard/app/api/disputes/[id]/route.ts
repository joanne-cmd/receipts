import { NextResponse } from 'next/server';
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
