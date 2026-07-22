import { pgTable, text, timestamp, boolean, serial, integer } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  banner: text('banner'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull().default('New chat'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const conversationParticipants = pgTable('conversation_participants', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversationId').notNull(),
  userId: text('userId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  lastTypingAt: timestamp('lasttypingat'),
})

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversationId').notNull(),
  userId: text('userId').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  replyToId: integer('replytoid'),
  isPinned: boolean('ispinned').notNull().default(false),
  pinnedBy: text('pinnedby'),
  reactions: text('reactions'), // Armacenará un string JSON estructurado
  readBy: text('readBy'), // JSON array de user IDs que han leído el mensaje
})

export const calls = pgTable('calls', {
  id: text('id').primaryKey(),
  conversationId: integer('conversationId').notNull(),
  callerId: text('callerId').notNull(),
  calleeId: text('calleeId').notNull(),
  type: text('type').notNull(), // 'audio' | 'video'
  status: text('status').notNull(), // 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended'
  startedAt: timestamp('startedAt').notNull().defaultNow(),
  answeredAt: timestamp('answeredAt'),
  endedAt: timestamp('endedAt'),
})
