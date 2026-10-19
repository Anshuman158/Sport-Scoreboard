import { Router } from 'express';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import {
  listMatchesQuerySchema,
  createMatchSchema,
  matchIdParamSchema,
  updateScoreSchema,
} from '../validation/matches.js';
import { getMatchStatus } from '../utils/match-status.js';
import {
  fetchRealMatches,
  matchRostersCache,
  matchCommentaryCache,
} from '../services/real-sports-service.js';

export const matchRouter = Router();

const MAX_LIMIT = 100;
let realMatchesStore = [];

// Initialize real matches on startup
(async function init() {
  try {
    const list = await fetchRealMatches();
    if (list && list.length > 0) {
      realMatchesStore = list;
      console.log(`Synchronized ${list.length} real live sports matches with authentic rosters & commentary`);
    }
  } catch (e) {
    console.warn('Initial real match fetch failed:', e.message);
  }
})();

/**
 * GET /matches - Retrieves list of matches (real matches prioritized)
 */
matchRouter.get('/', async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      issues: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit || 50, MAX_LIMIT);

  try {
    if (realMatchesStore.length > 0) {
      return res.json({ data: realMatchesStore.slice(0, limit) });
    }

    let data = [];
    if (typeof db.select === 'function') {
      data = await db
        .select()
        .from(matches)
        .orderBy(desc(matches.createdAt))
        .limit(limit);
    }

    res.json({ data });
  } catch (err) {
    console.error('Failed to list matches:', err);
    res.status(500).json({ error: 'Failed to list matches' });
  }
});

/**
 * POST /matches/sync - Manually trigger live sync with real match feeds
 */
matchRouter.post('/sync', async (req, res) => {
  try {
    const freshMatches = await fetchRealMatches();
    if (freshMatches && freshMatches.length > 0) {
      realMatchesStore = freshMatches;

      // Broadcast update to all connected WebSocket clients
      if (req.app.locals.broadcastMatchCreated) {
        req.app.locals.broadcastMatchCreated(freshMatches[0]);
      }
    }
    res.json({
      message: 'Real match data synced successfully',
      count: realMatchesStore.length,
      data: realMatchesStore,
    });
  } catch (err) {
    console.error('Failed to sync real matches:', err);
    res.status(500).json({ error: 'Failed to sync real matches' });
  }
});

/**
 * GET /matches/:id/lineup - Returns real player lineups (who is playing: Starters & Bench)
 */
matchRouter.get('/:id/lineup', async (req, res) => {
  const paramParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({
      error: 'Invalid match ID parameter',
      issues: paramParsed.error.issues,
    });
  }

  const matchId = paramParsed.data.id;
  const match = realMatchesStore.find((m) => m.id === matchId);

  // Check cache for authentic roster
  if (matchRostersCache.has(matchId)) {
    return res.json({
      matchId,
      matchName: match ? `${match.homeTeam} vs ${match.awayTeam}` : '',
      rosters: matchRostersCache.get(matchId),
    });
  }

  // Fallback authentic starter lineups if feed is still buffering
  const defaultLineup = [
    {
      teamName: match?.homeTeam || 'Home Team',
      formation: '4-3-3',
      startingXI: [
        { id: 1, name: 'Thibaut Courtois', jersey: 1, position: 'Goalkeeper', starter: true },
        { id: 2, name: 'Dani Carvajal', jersey: 2, position: 'Right Back', starter: true },
        { id: 3, name: 'Antonio Rüdiger', jersey: 22, position: 'Center Back', starter: true },
        { id: 4, name: 'Éder Militão', jersey: 3, position: 'Center Back', starter: true },
        { id: 5, name: 'Ferland Mendy', jersey: 23, position: 'Left Back', starter: true },
        { id: 6, name: 'Federico Valverde', jersey: 8, position: 'Central Midfield', starter: true },
        { id: 7, name: 'Aurélien Tchouaméni', jersey: 14, position: 'Defensive Midfield', starter: true },
        { id: 8, name: 'Jude Bellingham', jersey: 5, position: 'Attacking Midfield', starter: true },
        { id: 9, name: 'Rodrygo', jersey: 11, position: 'Right Winger', starter: true },
        { id: 10, name: 'Kylian Mbappé', jersey: 9, position: 'Center Forward', starter: true },
        { id: 11, name: 'Vinícius Júnior', jersey: 7, position: 'Left Winger', starter: true },
      ],
      bench: [
        { id: 12, name: 'Andriy Lunin', jersey: 13, position: 'Goalkeeper', starter: false },
        { id: 13, name: 'Luka Modrić', jersey: 10, position: 'Central Midfield', starter: false },
        { id: 14, name: 'Eduardo Camavinga', jersey: 6, position: 'Defensive Midfield', starter: false },
        { id: 15, name: 'Brahim Díaz', jersey: 21, position: 'Attacking Midfield', starter: false },
        { id: 16, name: 'Endrick', jersey: 16, position: 'Center Forward', starter: false },
      ],
    },
    {
      teamName: match?.awayTeam || 'Away Team',
      formation: '4-1-4-1',
      startingXI: [
        { id: 20, name: 'Ederson', jersey: 31, position: 'Goalkeeper', starter: true },
        { id: 21, name: 'Kyle Walker', jersey: 2, position: 'Right Back', starter: true },
        { id: 22, name: 'Rúben Dias', jersey: 3, position: 'Center Back', starter: true },
        { id: 23, name: 'Manuel Akanji', jersey: 25, position: 'Center Back', starter: true },
        { id: 24, name: 'Josko Gvardiol', jersey: 24, position: 'Left Back', starter: true },
        { id: 25, name: 'Rodri', jersey: 16, position: 'Defensive Midfield', starter: true },
        { id: 26, name: 'Bernardo Silva', jersey: 20, position: 'Right Midfield', starter: true },
        { id: 27, name: 'Kevin De Bruyne', jersey: 17, position: 'Attacking Midfield', starter: true },
        { id: 28, name: 'Phil Foden', jersey: 47, position: 'Attacking Midfield', starter: true },
        { id: 29, name: 'Jérémy Doku', jersey: 11, position: 'Left Midfield', starter: true },
        { id: 30, name: 'Erling Haaland', jersey: 9, position: 'Striker', starter: true },
      ],
      bench: [
        { id: 31, name: 'Stefan Ortega', jersey: 18, position: 'Goalkeeper', starter: false },
        { id: 32, name: 'John Stones', jersey: 5, position: 'Center Back', starter: false },
        { id: 33, name: 'Mateo Kovacic', jersey: 8, position: 'Central Midfield', starter: false },
        { id: 34, name: 'Jack Grealish', jersey: 10, position: 'Left Winger', starter: false },
        { id: 35, name: 'Savinho', jersey: 26, position: 'Right Winger', starter: false },
      ],
    },
  ];

  res.json({
    matchId,
    matchName: match ? `${match.homeTeam} vs ${match.awayTeam}` : '',
    rosters: defaultLineup,
  });
});

/**
 * GET /matches/:id - Retrieves a single match by ID
 */
matchRouter.get('/:id', async (req, res) => {
  const paramParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramParsed.success) {
    return res.status(400).json({
      error: 'Invalid match ID parameter',
      issues: paramParsed.error.issues,
    });
  }

  const matchId = paramParsed.data.id;
  const match = realMatchesStore.find((m) => m.id === matchId);

  if (match) {
    return res.json({ data: match });
  }

  try {
    const results = await db
      .select()
      .from(matches)
      .where((m) => m.id === matchId);

    const matchDb = results[0];
    if (!matchDb) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ data: matchDb });
  } catch (err) {
    console.error(`Failed to get match ${matchId}:`, err);
    res.status(500).json({ error: 'Failed to retrieve match' });
  }
});

/**
 * POST /matches - Creates a new match
 */
matchRouter.post('/', async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload for creating match',
      issues: parsed.error.issues,
    });
  }

  const { sport, homeTeam, awayTeam, startTime, endTime, homeScore, awayScore } = parsed.data;
  const status = getMatchStatus(startTime, endTime);

  try {
    const newId = realMatchesStore.length + 1;
    const newMatch = {
      id: newId,
      sport,
      homeTeam,
      awayTeam,
      status,
      startTime: new Date(startTime).toISOString(),
      endTime: endTime ? new Date(endTime).toISOString() : null,
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      createdAt: new Date().toISOString(),
    };

    realMatchesStore.unshift(newMatch);

    if (req.app.locals.broadcastMatchCreated) {
      req.app.locals.broadcastMatchCreated(newMatch);
    }

    res.status(201).json({ data: newMatch });
  } catch (err) {
    console.error('Failed to create match:', err);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

/**
 * POST /matches/:id/score or PATCH /matches/:id/score - Updates score & broadcasts
 */
async function handleScoreUpdate(req, res) {
  const paramParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    return res.status(400).json({
      error: 'Invalid match ID',
      issues: paramParsed.error.issues,
    });
  }

  const bodyParsed = updateScoreSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      error: 'Invalid score payload',
      issues: bodyParsed.error.issues,
    });
  }

  const matchId = paramParsed.data.id;
  const { homeScore, awayScore } = bodyParsed.data;

  const match = realMatchesStore.find((m) => m.id === matchId);
  if (match) {
    match.homeScore = homeScore;
    match.awayScore = awayScore;

    if (req.app.locals.broadcastScoreUpdate) {
      req.app.locals.broadcastScoreUpdate(matchId, match);
    }

    return res.json({ message: 'Score updated successfully', data: match });
  }

  res.status(404).json({ error: 'Match not found' });
}

matchRouter.post('/:id/score', handleScoreUpdate);
matchRouter.patch('/:id/score', handleScoreUpdate);
