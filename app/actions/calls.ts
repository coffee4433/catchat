'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { calls } from '@/lib/db/schema'
import { conversationParticipants } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function assertParticipant(conversationId: number, userId: string) {
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

export type CallRecord = {
  id: string
  conversationId: number
  callerId: string
  calleeId: string
  type: string
  status: string
  startedAt: Date
  answeredAt: Date | null
  endedAt: Date | null
}

export async function startCall(conversationId: number, type: 'audio' | 'video', callId: string) {
  const userId = await getUserId()
  await assertParticipant(conversationId, userId)

  const participants = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId))

  const calleeId = participants.find((p) => p.userId !== userId)?.userId
  if (!calleeId) throw new Error('No other participant found')

  await db.insert(calls).values({
    id: callId,
    conversationId,
    callerId: userId,
    calleeId,
    type,
    status: 'ringing',
  })

  revalidatePath('/')
  return { callId, calleeId }
}

export async function answerCall(callId: string) {
  const userId = await getUserId()
  await db
    .update(calls)
    .set({ status: 'accepted', answeredAt: new Date() })
    .where(and(eq(calls.id, callId), eq(calls.calleeId, userId)))
  revalidatePath('/')
}

export async function endCall(callId: string, status: 'missed' | 'rejected' | 'ended') {
  const userId = await getUserId()
  await db
    .update(calls)
    .set({ status, endedAt: new Date() })
    .where(
      and(
        eq(calls.id, callId),
        eq(calls.status, 'ringing'),
      ),
    )
  await db
    .update(calls)
    .set({ status, endedAt: new Date() })
    .where(
      and(
        eq(calls.id, callId),
        eq(calls.status, 'accepted'),
      ),
    )
  revalidatePath('/')
}

export async function getCallHistory(conversationId: number): Promise<CallRecord[]> {
  const userId = await getUserId()
  await assertParticipant(conversationId, userId)

  return db
    .select()
    .from(calls)
    .where(eq(calls.conversationId, conversationId))
    .orderBy(desc(calls.startedAt))
    .limit(50)
}
