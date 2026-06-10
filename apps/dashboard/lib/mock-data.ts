// Local types mirroring @receipts/shared Zod schemas — no build dep required

export type DisputeStatus =
  | 'pending_classification'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'awaiting_response'
  | 'drafting_escalation'
  | 'resolved_won'
  | 'resolved_lost'
  | 'resolved_partial'
  | 'referred_to_lawyer'
  | 'cancelled';

export type IssueType =
  | 'undelivered_goods'
  | 'wrong_charge'
  | 'service_not_rendered'
  | 'cancellation_refund'
  | 'warranty_claim'
  | 'billing_error';

export interface Citation {
  type: 'policy' | 'regulation' | 'playbook';
  id: string;
  label: string;
}

export interface Draft {
  version: number;
  created_at: string;
  subject: string;
  body: string;
  citations: Citation[];
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
  actor: 'agent' | 'user' | 'merchant' | 'system';
}

export interface MerchantResponse {
  received_at: string;
  raw_text: string;
  classification:
    | 'refund_granted'
    | 'partial_refund'
    | 'denial'
    | 'stalling'
    | 'request_for_info'
    | 'no_response';
  amount_offered?: number;
}

export interface Dispute {
  _id: string;
  user_id: string;
  status: DisputeStatus;
  issue_type?: IssueType;
  merchant?: string;
  merchant_display?: string;
  amount_disputed?: number;
  amount_recovered?: number;
  currency?: string;
  receipt_raw: string;
  receipt_parsed?: {
    order_id?: string;
    order_date?: string;
    items?: { description: string; amount: number }[];
    total?: number;
    merchant_email?: string;
  };
  drafts: Draft[];
  current_draft_version: number;
  merchant_responses: MerchantResponse[];
  safety_flag: boolean;
  timeline: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

// ── Sample disputes ───────────────────────────────────────────────────────────

export const MOCK_DISPUTES: Dispute[] = [
  {
    _id: 'dispute-001',
    user_id: 'user-001',
    status: 'pending_approval',
    issue_type: 'undelivered_goods',
    merchant: 'amazon',
    merchant_display: 'Amazon',
    amount_disputed: 89.99,
    currency: 'USD',
    receipt_raw: `---------- Forwarded message ----------
From: auto-confirm@amazon.com
Subject: Your Amazon.com order #112-3456789-0123456 has shipped

Hello,
Your order of "Sony WH-1000XM5 Headphones" has shipped.
Estimated delivery: May 10, 2026
Order total: $89.99

Tracking: 1Z999AA10123456784
`,
    receipt_parsed: {
      order_id: '112-3456789-0123456',
      order_date: '2026-05-03',
      items: [{ description: 'Sony WH-1000XM5 Headphones', amount: 89.99 }],
      total: 89.99,
      merchant_email: 'auto-confirm@amazon.com',
    },
    drafts: [
      {
        version: 1,
        created_at: '2026-05-20T09:15:00.000Z',
        subject:
          'Formal Dispute — Undelivered Order #112-3456789-0123456 ($89.99)',
        body: `Dear Amazon Customer Service,

I am writing to formally dispute a charge of $89.99 for Order #112-3456789-0123456, placed on May 3, 2026. As of today, May 20, 2026 — ten days past your stated delivery date of May 10 — the item has not been delivered and tracking shows no update since May 9.

Under the FTC Mail Order Rule (16 C.F.R. Part 435), you are required to ship within the promised timeframe or offer me the choice of a full refund. I am requesting a full refund of $89.99 to my original payment method within 7 business days.

If I do not receive a satisfactory response by May 27, 2026, I will file a chargeback with my card issuer and submit a complaint to the FTC at reportfraud.ftc.gov.

Order details:
  - Item: Sony WH-1000XM5 Headphones
  - Order #: 112-3456789-0123456
  - Order date: May 3, 2026
  - Expected delivery: May 10, 2026
  - Amount: $89.99

Sincerely,
[Customer Name]`,
        citations: [
          {
            type: 'regulation',
            id: 'reg-ftc-mail-order',
            label: 'FTC Mail Order Rule, 16 C.F.R. Part 435',
          },
          {
            type: 'policy',
            id: 'pol-amazon-return-001',
            label: 'Amazon A-to-z Guarantee — undelivered items',
          },
        ],
      },
    ],
    current_draft_version: 1,
    merchant_responses: [],
    safety_flag: false,
    timeline: [
      {
        timestamp: '2026-05-20T08:00:00.000Z',
        event: 'Receipt forwarded to receipts inbox',
        actor: 'user',
      },
      {
        timestamp: '2026-05-20T08:01:30.000Z',
        event: 'Receipt parsed — undelivered_goods detected',
        actor: 'agent',
      },
      {
        timestamp: '2026-05-20T09:15:00.000Z',
        event: 'Draft v1 generated with 2 citations',
        actor: 'agent',
      },
    ],
    created_at: '2026-05-20T08:00:00.000Z',
    updated_at: '2026-05-20T09:15:00.000Z',
  },

  {
    _id: 'dispute-002',
    user_id: 'user-001',
    status: 'awaiting_response',
    issue_type: 'cancellation_refund',
    merchant: 'delta',
    merchant_display: 'Delta Air Lines',
    amount_disputed: 432.0,
    currency: 'USD',
    receipt_raw: `---------- Forwarded message ----------
From: no-reply@delta.com
Subject: Important update about your flight DL 2047

Your flight DL 2047 (Atlanta → New York, May 18) has been cancelled by Delta Air Lines.
Booking ref: XGTK92
Ticket total: $432.00

We apologize for the inconvenience.
`,
    receipt_parsed: {
      order_id: 'XGTK92',
      order_date: '2026-04-30',
      items: [{ description: 'DL 2047 ATL→JFK May 18', amount: 432.0 }],
      total: 432.0,
      merchant_email: 'no-reply@delta.com',
    },
    drafts: [
      {
        version: 1,
        created_at: '2026-05-18T14:00:00.000Z',
        subject:
          'Refund Demand — Delta-Cancelled Flight DL 2047 (Booking XGTK92, $432.00)',
        body: `Dear Delta Air Lines Customer Relations,

I am writing to demand a full cash refund of $432.00 for booking XGTK92 (DL 2047, Atlanta to New York, May 18, 2026), which Delta cancelled without rebooking me on an acceptable alternative flight within 3 hours.

Under DOT regulations (14 C.F.R. § 259.5 and DOT Enforcement Guidance on Airline Ticket Refunds), passengers are entitled to a full cash refund — not a voucher — when the airline cancels the flight. Delta's own Customer Commitment reaffirms this right.

I am requesting a cash refund of $432.00 within 7 business days. Please do not offer a travel credit; I am exercising my right to a monetary refund.

Booking: XGTK92
Flight: DL 2047, ATL→JFK, May 18 2026
Amount: $432.00

Sincerely,
[Customer Name]`,
        citations: [
          {
            type: 'regulation',
            id: 'reg-dot-refund',
            label: 'DOT 14 C.F.R. § 259.5 — Ticket refund right',
          },
          {
            type: 'policy',
            id: 'pol-delta-cancellation',
            label: 'Delta Customer Commitment — cancelled flights',
          },
          {
            type: 'playbook',
            id: 'pb-delta-cancel-001',
            label: 'r/delta: full refund won after airline cancellation',
          },
        ],
        approved_at: '2026-05-18T14:30:00.000Z',
      },
    ],
    current_draft_version: 1,
    merchant_responses: [],
    safety_flag: false,
    timeline: [
      {
        timestamp: '2026-05-18T13:45:00.000Z',
        event: 'Cancellation notice forwarded',
        actor: 'user',
      },
      {
        timestamp: '2026-05-18T14:00:00.000Z',
        event: 'Draft v1 generated — DOT regulations cited',
        actor: 'agent',
      },
      {
        timestamp: '2026-05-18T14:30:00.000Z',
        event: 'Draft v1 approved by user',
        actor: 'user',
      },
      {
        timestamp: '2026-05-18T14:31:00.000Z',
        event: 'Dispute email sent to Delta Customer Relations',
        actor: 'agent',
      },
    ],
    created_at: '2026-05-18T13:45:00.000Z',
    updated_at: '2026-05-18T14:31:00.000Z',
  },

  {
    _id: 'dispute-003',
    user_id: 'user-001',
    status: 'resolved_won',
    issue_type: 'wrong_charge',
    merchant: 'doordash',
    merchant_display: 'DoorDash',
    amount_disputed: 12.5,
    amount_recovered: 12.5,
    currency: 'USD',
    receipt_raw: `---------- Forwarded message ----------
From: receipts@doordash.com
Subject: Your DoorDash receipt — $37.50

Order from Chipotle (May 15, 2026)
Burrito Bowl          $12.50
Chips & Guac           $5.00
Subtotal              $17.50
Delivery fee           $5.99
Service fee            $2.01
Tip                    $4.00
Total                 $29.50

Your card was charged $37.50.
`,
    receipt_parsed: {
      order_date: '2026-05-15',
      items: [
        { description: 'Burrito Bowl', amount: 12.5 },
        { description: 'Chips & Guac', amount: 5.0 },
      ],
      total: 29.5,
      merchant_email: 'receipts@doordash.com',
    },
    drafts: [
      {
        version: 1,
        created_at: '2026-05-15T20:10:00.000Z',
        subject: 'Overcharge Dispute — DoorDash May 15 Order ($8.00 excess)',
        body: `Dear DoorDash Support,

My May 15, 2026 order from Chipotle shows a receipt total of $29.50, yet my card was charged $37.50 — an excess of $8.00. This constitutes a billing error under the Fair Credit Billing Act (15 U.S.C. § 1666).

Please refund the $8.00 overcharge within 7 business days. If unresolved, I will file a chargeback and an FTC complaint.

Sincerely,
[Customer Name]`,
        citations: [
          {
            type: 'regulation',
            id: 'reg-fcba',
            label: 'Fair Credit Billing Act, 15 U.S.C. § 1666',
          },
        ],
        approved_at: '2026-05-15T20:20:00.000Z',
      },
    ],
    current_draft_version: 1,
    merchant_responses: [
      {
        received_at: '2026-05-16T09:00:00.000Z',
        raw_text:
          'Hi there! We have reviewed your order and confirmed an overcharge. A refund of $12.50 has been issued to your original payment method. We apologize for the inconvenience.',
        classification: 'refund_granted',
        amount_offered: 12.5,
      },
    ],
    safety_flag: false,
    timeline: [
      {
        timestamp: '2026-05-15T20:05:00.000Z',
        event: 'Receipt forwarded — overcharge detected',
        actor: 'user',
      },
      {
        timestamp: '2026-05-15T20:10:00.000Z',
        event: 'Draft v1 generated',
        actor: 'agent',
      },
      {
        timestamp: '2026-05-15T20:20:00.000Z',
        event: 'Draft approved and sent to DoorDash',
        actor: 'user',
      },
      {
        timestamp: '2026-05-16T09:00:00.000Z',
        event: 'DoorDash responded — full refund of $12.50 granted',
        actor: 'merchant',
      },
      {
        timestamp: '2026-05-16T09:05:00.000Z',
        event: 'Dispute marked resolved_won — $12.50 recovered',
        actor: 'system',
      },
    ],
    created_at: '2026-05-15T20:05:00.000Z',
    updated_at: '2026-05-16T09:05:00.000Z',
  },
];
