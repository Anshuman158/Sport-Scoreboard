import { pgTable, serial, varchar, integer, timestamp, jsonb, text, pgEnum } from 'drizzle-orm/pg-core';

export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  sport: varchar('sport', { length: 64 }).notNull(),
  homeTeam: varchar('home_team', { length: 128 }).notNull(),
  awayTeam: varchar('away_team', { length: 128 }).notNull(),
  status: matchStatusEnum('status').notNull().default('scheduled'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  homeScore: integer('home_score').notNull().default(0),
  awayScore: integer('away_score').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const commentary = pgTable('commentary', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  minute: integer('minute').notNull(),
  sequence: integer('sequence').notNull().default(1),
  period: varchar('period', { length: 64 }).default('1st Half'),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  actor: varchar('actor', { length: 128 }).default(''),
  team: varchar('team', { length: 128 }).default(''),
  message: text('message').notNull(),
  metadata: jsonb('metadata').default({}),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
