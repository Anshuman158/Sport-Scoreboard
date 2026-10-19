import { z } from 'zod';

export const matchStatus = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z.object({
  sport: z.string().trim().min(1, 'Sport is required'),
  homeTeam: z.string().trim().min(1, 'Home team is required'),
  awayTeam: z.string().trim().min(1, 'Away team is required'),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO 8601 string' }),
  endTime: z.string().datetime({ message: 'End time must be a valid ISO 8601 string' }).optional().nullable(),
  homeScore: z.coerce.number().int().nonnegative().optional().default(0),
  awayScore: z.coerce.number().int().nonnegative().optional().default(0),
});

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
