import { z } from 'zod';

/** Shared validation for stored/imported banks and untrusted create-room payloads. */
export const bankSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(100),
  description: z.string().max(500),
  level: z.string().max(30),
  questions: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        text: z.string().trim().min(1).max(500),
        pinyin: z.string().max(200).optional(),
        options: z.array(z.string().trim().min(1).max(200)).length(4),
        answer: z.number().int().min(0).max(3),
      }),
    )
    .min(4)
    .max(100),
});
