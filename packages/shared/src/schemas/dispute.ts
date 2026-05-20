import { z } from 'zod';

export const DisputeStatusEnum = z.enum([
  'pending_classification',
  'pending_approval',
  'approved',
  'sent',
  'awaiting_response',
  'drafting_escalation',
  'resolved_won',
  'resolved_lost',
  'resolved_partial',
  'referred_to_lawyer',
  'cancelled',
]);

export const IssueTypeEnum = z.enum([
  'undelivered_goods',
  'wrong_charge',
  'service_not_rendered',
  'cancellation_refund',
  'warranty_claim',
  'billing_error',
]);

export const ResponseClassificationEnum = z.enum([
  'refund_granted',
  'partial_refund',
  'denial',
  'stalling',
  'request_for_info',
  'no_response',
]);

export const MerchantResponseSchema = z.object({
  received_at: z.string(),
  raw_text: z.string(),
  classification: ResponseClassificationEnum,
  amount_offered: z.number().optional(),
});

export const DraftSchema = z.object({
  version: z.number(),
  created_at: z.string(),
  subject: z.string(),
  body: z.string(),
  citations: z.array(
    z.object({
      type: z.enum(['policy', 'regulation', 'playbook']),
      id: z.string(),
      label: z.string(),
    }),
  ),
  approved_at: z.string().optional(),
  rejected_at: z.string().optional(),
  rejection_reason: z.string().optional(),
});

export const DisputeSchema = z.object({
  _id: z.string(),
  user_id: z.string(),
  status: DisputeStatusEnum,
  issue_type: IssueTypeEnum.optional(),
  merchant: z.string().optional(),
  merchant_display: z.string().optional(),
  amount_disputed: z.number().optional(),
  amount_recovered: z.number().optional(),
  currency: z.literal('USD').default('USD'),
  receipt_raw: z.string(),
  receipt_parsed: z
    .object({
      order_id: z.string().optional(),
      order_date: z.string().optional(),
      items: z
        .array(
          z.object({
            description: z.string(),
            amount: z.number(),
          }),
        )
        .optional(),
      total: z.number().optional(),
      merchant_email: z.string().optional(),
    })
    .optional(),
  drafts: z.array(DraftSchema),
  current_draft_version: z.number(),
  merchant_responses: z.array(MerchantResponseSchema),
  safety_flag: z.boolean().default(false),
  timeline: z.array(
    z.object({
      timestamp: z.string(),
      event: z.string(),
      actor: z.enum(['agent', 'user', 'merchant', 'system']),
    }),
  ),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Dispute = z.infer<typeof DisputeSchema>;

export type DisputeInsert = Omit<Dispute, '_id' | 'created_at' | 'updated_at'>;

export const DisputeUpdate = DisputeSchema.partial().extend({
  _id: z.string(),
});
export type DisputeUpdate = z.infer<typeof DisputeUpdate>;
