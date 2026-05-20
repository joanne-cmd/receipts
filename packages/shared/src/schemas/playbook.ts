import { z } from 'zod';

export const PlaybookOutcomeEnum = z.enum(['won', 'partial', 'lost', 'escalated']);

export const EscalationStepSchema = z.object({
  step: z.number(),
  channel: z.enum([
    'email',
    'chargeback',
    'bbb',
    'dot_complaint',
    'ftc_complaint',
    'small_claims',
  ]),
  template_hint: z.string(),
});

export const PlaybookSchema = z.object({
  _id: z.string(),
  doc_type: z.literal('playbook'),
  merchant: z.string().optional(),
  issue_type: z.enum([
    'undelivered_goods',
    'wrong_charge',
    'service_not_rendered',
    'cancellation_refund',
    'warranty_claim',
    'billing_error',
  ]),
  title: z.string(),
  summary: z.string(),
  outcome: PlaybookOutcomeEnum,
  amount_recovered: z.number().optional(),
  escalation_steps: z.array(EscalationStepSchema),
  embedding: z.array(z.number()).length(1024),
  source: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Playbook = z.infer<typeof PlaybookSchema>;

export type PlaybookInsert = Omit<Playbook, '_id' | 'created_at' | 'updated_at'> & {
  embedding: number[];
};
