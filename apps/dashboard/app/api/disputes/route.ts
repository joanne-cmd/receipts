import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db';

export async function GET() {
  const client = await clientPromise;
  const disputes = await client
    .db('receipts')
    .collection('disputes')
    .find({})
    .sort({ updated_at: -1 })
    .toArray();
  return NextResponse.json(disputes);
}
