import { db } from '@/lib/db'
import { conversationParticipants, conversations } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Internal helper: creates (or reuses) the 1:1 conversation between two users.
 *
 * This lives outside `app/actions` on purpose — exporting it from a `'use server'`
 * module would publish it as a callable server action, letting anyone create
 * conversations between arbitrary user ids. Callers are responsible for
 * authenticating and authorising the request first.
 */
export async function ensureDirectConversation(userA: string, userB: string) {
  if (userA === userB) return null

  const mine = db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userA))
  const existing = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.userId, userB),
        inArray(conversationParticipants.conversationId, mine),
      ),
    )

  if (existing.length > 0) {
    return { id: existing[0].conversationId, existing: true }
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ userId: userA, title: 'Direct message' })
    .returning()

  await db.insert(conversationParticipants).values([
    { conversationId: conversation.id, userId: userA },
    { conversationId: conversation.id, userId: userB },
  ])
  revalidatePath('/')
  return { id: conversation.id, existing: false }
}

/** Throws if the given user is not a participant of the conversation. */
export async function assertParticipant(conversationId: number, userId: string) {
  const [row] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
  if (!row) throw new Error('Conversation not found')
}
