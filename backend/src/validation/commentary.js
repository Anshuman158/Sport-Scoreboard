import { z } from 'zod';

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(100),
});

export const createCommentarySchema = z.object({
  minute: z.coerce.number().int().nonnegative({ message: 'Minute must be a non-negative integer' }),
  sequence: z.coerce.number().int().optional().default(1),
  period: z.string().optional().default('1st Half'),
  eventType: z.string().trim().min(1, 'Event type is required'),
  actor: z.string().optional().default(''),
  team: z.string().optional().default(''),
  message: z.string().trim().min(1, 'Commentary message is required'),
  metadata: z.record(z.any()).optional().default({}),
  tags: z.array(z.string()).optional().default([]),
});
