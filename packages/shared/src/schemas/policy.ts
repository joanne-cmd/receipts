import { z } from 'zod';

export const PolicyDocTypeEnum = z.enum(['merchant_policy']);

export const PolicySchema = z.object({
  _id: z.string(),
  doc_type: PolicyDocTypeEnum,
  merchant: z.string(),
  merchant_display: z.string(),
  category: z.enum(['return', 'refund', 'cancellation', 'warranty', 'delivery', 'billing']),
  title: z.string(),
  content: z.string().max(1000),
  source_url: z.string().url(),
  effective_date: z.string().optional(),
  embedding: z.array(z.number()).length(1024),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Policy = z.infer<typeof PolicySchema>;

export type PolicyInsert = Omit<Policy, '_id' | 'created_at' | 'updated_at'> & {
  embedding: number[];
};
