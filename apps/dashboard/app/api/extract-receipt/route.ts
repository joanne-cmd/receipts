import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const VERTEX_ENDPOINT =
  'https://us-central1-aiplatform.googleapis.com/v1/projects/receipts-agent-2026/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent';

const NULL_RESULT = {
  merchant_name: null,
  merchant_support_email: null,
  amount: null,
  issue_type: null,
  currency: null,
};

export async function POST(req: NextRequest) {
  const body = await req.json() as { receipt_raw?: unknown };
  if (typeof body.receipt_raw !== 'string' || !body.receipt_raw.trim()) {
    return NextResponse.json(NULL_RESULT);
  }

  try {
    const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
    if (!keyB64) return NextResponse.json(NULL_RESULT);

    const auth = new GoogleAuth({
      credentials: JSON.parse(Buffer.from(keyB64, 'base64').toString()),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const token = await auth.getAccessToken();

    const prompt =
      `Extract the following from this receipt/order email. Return ONLY valid JSON, no markdown, no explanation:\n` +
      `{\n` +
      `  "merchant_name": "company name e.g. Amazon, Udemy",\n` +
      `  "merchant_support_email": "support email address if found, else null",\n` +
      `  "amount": numeric amount as number or null,\n` +
      `  "issue_type": one of: undelivered_goods, wrong_charge, service_not_rendered, cancellation_refund, warranty_claim, billing_error,\n` +
      `  "currency": "3-letter currency code e.g. USD, KES, GBP, EUR — default to USD if not found"\n` +
      `}\n\nReceipt text:\n${body.receipt_raw}`;

    const geminiRes = await fetch(VERTEX_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiRes.ok) return NextResponse.json(NULL_RESULT);

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonText) as {
      merchant_name?: unknown;
      merchant_support_email?: unknown;
      amount?: unknown;
      issue_type?: unknown;
      currency?: unknown;
    };

    return NextResponse.json({
      merchant_name: typeof parsed.merchant_name === 'string' ? parsed.merchant_name : null,
      merchant_support_email:
        typeof parsed.merchant_support_email === 'string' ? parsed.merchant_support_email : null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      issue_type: typeof parsed.issue_type === 'string' ? parsed.issue_type : null,
      currency: typeof parsed.currency === 'string' ? parsed.currency : null,
    });
  } catch {
    return NextResponse.json(NULL_RESULT);
  }
}
