import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Document } from 'mongodb';
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

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    receipt_raw?: unknown;
    merchant_email?: unknown;
    merchant_display?: unknown;
    amount_disputed?: unknown;
    issue_type?: unknown;
  };

  const { receipt_raw, merchant_email, merchant_display, amount_disputed, issue_type } = body;

  if (typeof receipt_raw !== 'string' || !receipt_raw.trim()) {
    return NextResponse.json({ error: 'receipt_raw is required' }, { status: 400 });
  }

  const MERCHANT_EMAILS: Record<string, string> = {
    'amazon': 'cs@amazon.com',
    'jumia': 'support@jumia.co.ke',
    'airbnb': 'support@airbnb.com',
    'uber': 'support@uber.com',
    'netflix': 'help@netflix.com',
    'udemy': 'support@udemy.com',
    'coursera': 'learner-help@coursera.org',
    'carrefour': 'customerservice@carrefour.com',
    'safaricom': 'customercare@safaricom.co.ke',
  };

  const rawEmail = typeof merchant_email === 'string' ? merchant_email.trim() : '';
  const displayName = typeof merchant_display === 'string' ? merchant_display.trim() : '';

  const lookupKey = displayName.toLowerCase().split(/\s+/)[0];
  const lookedUpEmail = !rawEmail && displayName ? (MERCHANT_EMAILS[lookupKey] ?? '') : '';
  const email = rawEmail || lookedUpEmail;

  const merchant = email.includes('@')
    ? email.split('@')[1]
    : (displayName || 'unknown');

  const now = new Date().toISOString();

  const dispute = {
    _id: randomUUID(),
    user_id: 'default',
    status: 'pending_classification',
    receipt_raw,
    receipt_parsed: { merchant_email: email },
    merchant,
    merchant_display: displayName || merchant,
    ...(typeof amount_disputed === 'number' ? { amount_disputed } : {}),
    ...(typeof issue_type === 'string' && issue_type ? { issue_type } : {}),
    drafts: [],
    current_draft_version: 0,
    merchant_responses: [],
    safety_flag: false,
    timeline: [{ timestamp: now, event: 'dispute_created', actor: 'user' }],
    created_at: now,
    updated_at: now,
  };

  const client = await clientPromise;
  await client.db('receipts').collection('disputes').insertOne(dispute as Document);

  return NextResponse.json(dispute, { status: 201 });
}
