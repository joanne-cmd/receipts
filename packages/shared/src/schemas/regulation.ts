import { z } from 'zod';

export const RegulationSchema = z.object({
  _id: z.string(),
  doc_type: z.literal('regulation'),
  jurisdiction: z.literal('US'),
  authority: z.enum(['FTC', 'DoT', 'CFPB', 'FRB']),
  citation: z.string(),
  title: z.string(),
  plain_english: z.string(),
  content: z.string(),
  source_url: z.string().url(),
  effective_date: z.string().optional(),
  embedding: z.array(z.number()).length(1024),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Regulation = z.infer<typeof RegulationSchema>;

export type RegulationInsert = Omit<Regulation, '_id' | 'created_at' | 'updated_at'> & {
  embedding: number[];
};
