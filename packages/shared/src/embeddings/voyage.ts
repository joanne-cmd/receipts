import { z } from 'zod';

export const VoyageEmbeddingRequest = z.object({
  input: z.array(z.string()),
  model: z.string().default('voyage-3'),
});
export type VoyageEmbeddingRequest = z.infer<typeof VoyageEmbeddingRequest>;

export const VoyageEmbeddingResponse = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
      index: z.number(),
    }),
  ),
  usage: z.object({
    total_tokens: z.number(),
  }),
});
export type VoyageEmbeddingResponse = z.infer<typeof VoyageEmbeddingResponse>;

/**
 * Returns 1024-dimensional embeddings for each input text.
 *
 * STUB: returns zero vectors. Replace with real Voyage API call when
 * VOYAGE_API_KEY is available.
 *
 * Real call:
 *   POST https://api.voyageai.com/v1/embeddings
 *   Authorization: Bearer <apiKey>
 *   Content-Type: application/json
 *   body: { input: texts, model }
 */
export async function embedTexts(
  texts: string[],
  _apiKey: string,
  model = 'voyage-3',
): Promise<number[][]> {
  VoyageEmbeddingRequest.parse({ input: texts, model });

  console.warn(`STUB: would call Voyage API for ${texts.length} texts`);

  // Mock: 1024 zeros per input — replace with VoyageEmbeddingResponse.parse(await res.json())
  return texts.map(() => Array<number>(1024).fill(0));
}
