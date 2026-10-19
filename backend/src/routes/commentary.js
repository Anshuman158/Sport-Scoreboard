import { Router } from 'express';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import { desc } from 'drizzle-orm';
import { matchIdParamSchema } from '../validation/matches.js';
import {
  listCommentaryQuerySchema,
  createCommentarySchema,
} from '../validation/commentary.js';
import { matchCommentaryCache } from '../services/real-sports-service.js';

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

/**
 * GET /matches/:id/commentary - Retrieves authentic commentary timeline for a match
 */
commentaryRouter.get('/', async (req, res) => {
  const paramParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({
      error: 'Invalid match ID parameter',
      issues: paramParsed.error.issues,
    });
  }

  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      issues: queryParsed.error.issues,
    });
  }

  const matchId = paramParsed.data.id;
  const limit = Math.min(queryParsed.data.limit || 100, MAX_LIMIT);

  // 1. Check if we have authentic live commentary cached from real match feed
  if (matchCommentaryCache.has(matchId)) {
    const list = matchCommentaryCache.get(matchId) || [];
    return res.json({ data: list.slice(0, limit) });
  }

  try {
    let data = [];
    if (typeof db.select === 'function') {
      data = await db
        .select()
        .from(commentary)
        .where((c) => c.matchId === matchId)
        .orderBy(desc(commentary.createdAt))
        .limit(limit);
    }

    res.json({ data });
  } catch (err) {
    console.error(`Failed to list commentary for match ${matchId}:`, err);
    res.status(500).json({ error: 'Failed to retrieve match commentary' });
  }
});

/**
 * POST /matches/:id/commentary - Adds a new commentary event and broadcasts it
 */
commentaryRouter.post('/', async (req, res) => {
  const paramParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({
      error: 'Invalid match ID parameter',
      issues: paramParsed.error.issues,
    });
  }

  const bodyParsed = createCommentarySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      error: 'Invalid commentary payload',
      issues: bodyParsed.error.issues,
    });
  }

  const matchId = paramParsed.data.id;
  const { minute, sequence, period, eventType, actor, team, message, metadata, tags } = bodyParsed.data;

  try {
    const newEntry = {
      id: Date.now(),
      matchId,
      minute,
      sequence: sequence || 1,
      period: period || '1st Half',
      eventType,
      actor: actor || '',
      team: team || '',
      message,
      metadata: metadata || {},
      tags: tags || [],
      createdAt: new Date().toISOString(),
    };

    // Prepend to cached list
    const existing = matchCommentaryCache.get(matchId) || [];
    matchCommentaryCache.set(matchId, [newEntry, ...existing]);

    if (req.app.locals.broadcastCommentary) {
      req.app.locals.broadcastCommentary(matchId, newEntry);
    }

    res.status(201).json({ data: newEntry });
  } catch (err) {
    console.error(`Failed to create commentary for match ${matchId}:`, err);
    res.status(500).json({ error: 'Failed to create commentary event' });
  }
});
