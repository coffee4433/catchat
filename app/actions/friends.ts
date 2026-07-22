'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { friendRequests, user } from '@/lib/db/schema'
import { and, desc, eq, or, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export type FriendRequestWithUser = {
  id: number
  fromUserId: string
  toUserId: string
  status: string
  createdAt: Date
  fromUser: { id: string; name: string; email: string; image: string | null }
  toUser: { id: string; name: string; email: string; image: string | null }
}

export async function sendFriendRequest(toUserId: string) {
  const userId = await getUserId()
  if (userId === toUserId) throw new Error('Cannot send request to yourself')

  const existing = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.fromUserId, userId),
        eq(friendRequests.toUserId, toUserId),
        eq(friendRequests.status, 'pending'),
      ),
    )
  if (existing.length > 0) throw new Error('Request already sent')

  const [request] = await db
    .insert(friendRequests)
    .values({ fromUserId: userId, toUserId })
    .returning()

  revalidatePath('/')
  return request
}

export async function acceptFriendRequest(requestId: number) {
  const userId = await getUserId()
  const [req] = await db
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.id, requestId),
        eq(friendRequests.toUserId, userId),
      ),
    )
  if (!req) throw new Error('Request not found')

  await db
    .update(friendRequests)
    .set({ status: 'accepted' })
    .where(eq(friendRequests.id, requestId))

  revalidatePath('/')
}

export async function rejectFriendRequest(requestId: number) {
  const userId = await getUserId()
  await db
    .update(friendRequests)
    .set({ status: 'rejected' })
    .where(
      and(
        eq(friendRequests.id, requestId),
        eq(friendRequests.toUserId, userId),
      ),
    )
  revalidatePath('/')
}

export async function getPendingRequests(): Promise<FriendRequestWithUser[]> {
  const userId = await getUserId()

  const incoming = await db
    .select({
      id: friendRequests.id,
      fromUserId: friendRequests.fromUserId,
      toUserId: friendRequests.toUserId,
      status: friendRequests.status,
      createdAt: friendRequests.createdAt,
    })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.toUserId, userId),
        eq(friendRequests.status, 'pending'),
      ),
    )
    .orderBy(desc(friendRequests.createdAt))

  const outgoing = await db
    .select({
      id: friendRequests.id,
      fromUserId: friendRequests.fromUserId,
      toUserId: friendRequests.toUserId,
      status: friendRequests.status,
      createdAt: friendRequests.createdAt,
    })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.fromUserId, userId),
        eq(friendRequests.status, 'pending'),
      ),
    )
    .orderBy(desc(friendRequests.createdAt))

  const allRequests = [...incoming, ...outgoing]
  const allUserIds = new Set<string>()
  for (const r of allRequests) {
    allUserIds.add(r.fromUserId)
    allUserIds.add(r.toUserId)
  }

  const users = await db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(inArray(user.id, Array.from(allUserIds)))

  const userMap = new Map(users.map((u) => [u.id, u]))

  return allRequests.map((r) => ({
    ...r,
    fromUser: userMap.get(r.fromUserId) || { id: r.fromUserId, name: 'Unknown', email: '', image: null },
    toUser: userMap.get(r.toUserId) || { id: r.toUserId, name: 'Unknown', email: '', image: null },
  }))
}
