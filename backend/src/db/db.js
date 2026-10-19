import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const { Pool } = pg;

let dbInstance = null;
let isPostgres = false;

// In-memory fallback repository when DATABASE_URL is not set or Neon is offline
class MemoryStore {
  constructor() {
    this.matches = [
      {
        id: 1,
        sport: 'football',
        homeTeam: 'Real Madrid',
        awayTeam: 'Manchester City',
        status: 'live',
        startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        homeScore: 2,
        awayScore: 1,
        createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        sport: 'football',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        status: 'live',
        startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 70 * 60 * 1000).toISOString(),
        homeScore: 1,
        awayScore: 0,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        sport: 'cricket',
        homeTeam: 'India',
        awayTeam: 'Australia',
        status: 'live',
        startTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
        homeScore: 184,
        awayScore: 142,
        createdAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        sport: 'basketball',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Golden State Warriors',
        status: 'scheduled',
        startTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
        homeScore: 0,
        awayScore: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    this.commentaries = [
      {
        id: 1,
        matchId: 1,
        minute: 12,
        sequence: 1,
        period: '1st Half',
        eventType: 'goal',
        actor: 'Vinicius Jr.',
        team: 'Real Madrid',
        message: 'GOAL! Vinicius cuts inside from the left wing and curls a thunderous shot into the top right corner!',
        metadata: { shotSpeedKmh: 104, assist: 'Jude Bellingham' },
        tags: ['goal', 'highlight', 'curler'],
        createdAt: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        matchId: 1,
        minute: 29,
        sequence: 2,
        period: '1st Half',
        eventType: 'goal',
        actor: 'Erling Haaland',
        team: 'Manchester City',
        message: 'GOAL! Haaland towers over the defense to head in De Bruyne’s pinpoint corner cross!',
        metadata: { shotSpeedKmh: 88, assist: 'Kevin De Bruyne' },
        tags: ['goal', 'header'],
        createdAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        matchId: 1,
        minute: 41,
        sequence: 3,
        period: '1st Half',
        eventType: 'goal',
        actor: 'Jude Bellingham',
        team: 'Real Madrid',
        message: 'GOAL! Bellingham taps in the rebound after Courtois launched a quick counterattack!',
        metadata: { shotSpeedKmh: 72 },
        tags: ['goal', 'counterattack'],
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        matchId: 2,
        minute: 18,
        sequence: 1,
        period: '1st Half',
        eventType: 'goal',
        actor: 'Bukayo Saka',
        team: 'Arsenal',
        message: 'GOAL! Bukayo Saka slots home a low left-footed drive inside the near post!',
        metadata: { assist: 'Martin Odegaard' },
        tags: ['goal', 'derby'],
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        id: 5,
        matchId: 3,
        minute: 18,
        sequence: 1,
        period: '1st Innings',
        eventType: 'six',
        actor: 'Virat Kohli',
        team: 'India',
        message: 'SIX! Glorious lofted drive over long-off against Starc, sends the crowd wild!',
        metadata: { distanceMeters: 96 },
        tags: ['six', 'boundary'],
        createdAt: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
      },
    ];

    this.nextMatchId = 5;
    this.nextCommentaryId = 6;
  }

  // Drizzle-like chaining emulator for zero-friction local development
  select() {
    const store = this;
    return {
      from(table) {
        const isMatchTable = table === schema.matches;
        let data = isMatchTable ? [...store.matches] : [...store.commentaries];

        return {
          where(conditionFn) {
            if (typeof conditionFn === 'function') {
              data = data.filter(conditionFn);
            }
            return this;
          },
          orderBy(orderDesc) {
            // Sort newest first by default
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return this;
          },
          limit(num) {
            data = data.slice(0, num);
            return Promise.resolve(data);
          },
          then(resolve, reject) {
            return Promise.resolve(data).then(resolve, reject);
          },
        };
      },
    };
  }

  insert(table) {
    const store = this;
    const isMatchTable = table === schema.matches;

    return {
      values(row) {
        return {
          returning() {
            let inserted;
            if (isMatchTable) {
              inserted = {
                id: store.nextMatchId++,
                sport: row.sport,
                homeTeam: row.homeTeam,
                awayTeam: row.awayTeam,
                status: row.status || 'scheduled',
                startTime: row.startTime ? new Date(row.startTime).toISOString() : new Date().toISOString(),
                endTime: row.endTime ? new Date(row.endTime).toISOString() : null,
                homeScore: Number(row.homeScore) || 0,
                awayScore: Number(row.awayScore) || 0,
                createdAt: new Date().toISOString(),
              };
              store.matches.unshift(inserted);
            } else {
              inserted = {
                id: store.nextCommentaryId++,
                matchId: Number(row.matchId),
                minute: Number(row.minute),
                sequence: Number(row.sequence) || 1,
                period: row.period || '1st Half',
                eventType: row.eventType,
                actor: row.actor || '',
                team: row.team || '',
                message: row.message,
                metadata: row.metadata || {},
                tags: row.tags || [],
                createdAt: new Date().toISOString(),
              };
              store.commentaries.unshift(inserted);
            }
            return Promise.resolve([inserted]);
          },
        };
      },
    };
  }

  update(table) {
    const store = this;
    return {
      set(updates) {
        return {
          where(filterFn) {
            return {
              returning() {
                const target = store.matches.find(filterFn);
                if (target) {
                  Object.assign(target, updates);
                  return Promise.resolve([target]);
                }
                return Promise.resolve([]);
              },
            };
          },
        };
      },
    };
  }
}

if (process.env.DATABASE_URL) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    });
    dbInstance = drizzle(pool, { schema });
    isPostgres = true;
    console.log('Connected to PostgreSQL database with Drizzle ORM');
  } catch (err) {
    console.warn('PostgreSQL connection attempt failed, using in-memory store:', err.message);
    dbInstance = new MemoryStore();
  }
} else {
  console.log('DATABASE_URL not set: using sports in-memory store with Drizzle-compatible API');
  dbInstance = new MemoryStore();
}

export const db = dbInstance;
export { isPostgres };
