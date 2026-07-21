'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { account, conversationParticipants, conversations, messages, session, user } from '@/lib/db/schema'
import { supabase } from '@/lib/supabase/server'
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

/** Throws if the current user is not a participant of the conversation. */
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

export type ConversationListItem = {
  id: number
  title: string
  isDirect: boolean
  otherUser: { id: string; name: string; email: string; image: string | null } | null
  createdAt: Date
  updatedAt: Date
}

export async function getConversations(): Promise<ConversationListItem[]> {
  const userId = await getUserId()

  const myConversations = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .innerJoin(
      conversationParticipants,
      eq(conversationParticipants.conversationId, conversations.id),
    )
    .where(eq(conversationParticipants.userId, userId))
    .orderBy(desc(conversations.updatedAt))

  if (myConversations.length === 0) return []

  const ids = myConversations.map((c) => c.id)
  const others = await db
    .select({
      conversationId: conversationParticipants.conversationId,
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(conversationParticipants)
    .innerJoin(user, eq(user.id, conversationParticipants.userId))
    .where(
      and(
        inArray(conversationParticipants.conversationId, ids),
        ne(conversationParticipants.userId, userId),
      ),
    )

  const othersByConversation = new Map<number, (typeof others)[number]>()
  for (const o of others) {
    if (!othersByConversation.has(o.conversationId)) othersByConversation.set(o.conversationId, o)
  }

  return myConversations.map((c) => {
    const other = othersByConversation.get(c.id) ?? null
    return {
      id: c.id,
      title: other ? other.name : c.title,
      isDirect: Boolean(other),
      otherUser: other
        ? { id: other.id, name: other.name, email: other.email, image: other.image }
        : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }
  })
}

export async function createConversation(title?: string) {
  const userId = await getUserId()
  const [conversation] = await db
    .insert(conversations)
    .values({ userId, title: title?.trim() || 'New chat' })
    .returning()
  await db
    .insert(conversationParticipants)
    .values({ conversationId: conversation.id, userId })
    .onConflictDoNothing()
  revalidatePath('/')
  return conversation
}

/**
 * Creates (or reuses) a direct 1:1 conversation with another user.
 */
export async function createDirectConversation(otherUserId: string) {
  const userId = await getUserId()
  if (otherUserId === userId) throw new Error('Cannot start a chat with yourself')

  // Verify the other user actually exists
  const [other] = await db.select({ id: user.id }).from(user).where(eq(user.id, otherUserId))
  if (!other) throw new Error('User not found')

  // Reuse an existing direct conversation between the two users if any
  const mine = db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId))
  const existing = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.userId, otherUserId),
        inArray(conversationParticipants.conversationId, mine),
      ),
    )

  if (existing.length > 0) {
    return { id: existing[0].conversationId, existing: true }
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ userId, title: 'Direct message' })
    .returning()
  await db.insert(conversationParticipants).values([
    { conversationId: conversation.id, userId },
    { conversationId: conversation.id, userId: otherUserId },
  ])
  revalidatePath('/')
  return { id: conversation.id, existing: false }
}

export async function renameConversation(id: number, title: string) {
  const userId = await getUserId()
  await assertParticipant(id, userId)
  await db
    .update(conversations)
    .set({ title: title.trim() || 'New chat', updatedAt: new Date() })
    .where(eq(conversations.id, id))
  revalidatePath('/')
}

export async function deleteConversation(id: number) {
  const userId = await getUserId()
  await assertParticipant(id, userId)
  await db.delete(messages).where(eq(messages.conversationId, id))
  await db.delete(conversationParticipants).where(eq(conversationParticipants.conversationId, id))
  await db.delete(conversations).where(eq(conversations.id, id))
  revalidatePath('/')
}

export type MessageWithSender = {
  id: number
  conversationId: number
  userId: string
  content: string
  createdAt: Date
  senderName: string
  senderImage: string | null
  replyToId: number | null
  isPinned: boolean
  pinnedBy: string | null
  reactions: string | null
  readBy: string | null
}

export async function getMessages(conversationId: number): Promise<MessageWithSender[]> {
  const userId = await getUserId()
  await assertParticipant(conversationId, userId)

  return db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      userId: messages.userId,
      content: messages.content,
      createdAt: messages.createdAt,
      senderName: user.name,
      senderImage: user.image,
      replyToId: messages.replyToId,
      isPinned: messages.isPinned,
      pinnedBy: messages.pinnedBy,
      reactions: messages.reactions,
      readBy: messages.readBy,
    })
    .from(messages)
    .innerJoin(user, eq(user.id, messages.userId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
}

export async function sendMessage(conversationId: number, content: string, replyToId?: number) {
  const userId = await getUserId()
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Message cannot be empty')

  await assertParticipant(conversationId, userId)

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))

  const [message] = await db
    .insert(messages)
    .values({ 
      conversationId, 
      userId, 
      role: 'user', 
      content: trimmed,
      replyToId: replyToId ?? null
    })
    .returning()

  // Auto-title new solo conversations from the first message
  const updates: { updatedAt: Date; title?: string } = { updatedAt: new Date() }
  if (conversation?.title === 'New chat') {
    updates.title = trimmed.slice(0, 60)
  }
  await db.update(conversations).set(updates).where(eq(conversations.id, conversationId))

  revalidatePath('/')
  return message
}

// --- User search -------------------------------------------------------------

export type UserSearchResult = {
  id: string
  name: string
  email: string
  image: string | null
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const userId = await getUserId()
  const q = query.trim()
  if (!q) return []

  return db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(
      and(
        ne(user.id, userId),
        or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)),
      ),
    )
    .orderBy(asc(user.name))
    .limit(12)
}

// --- Conversation info (for the info panel) ----------------------------------

export type ConversationInfo = {
  id: number
  title: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  participants: { id: string; name: string; email: string; image: string | null }[]
}

export async function getConversationInfo(conversationId: number): Promise<ConversationInfo> {
  const userId = await getUserId()
  await assertParticipant(conversationId, userId)

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
  if (!conversation) throw new Error('Conversation not found')

  const participants = await db
    .select({ id: user.id, name: user.name, email: user.email, image: user.image })
    .from(conversationParticipants)
    .innerJoin(user, eq(user.id, conversationParticipants.userId))
    .where(eq(conversationParticipants.conversationId, conversationId))
    .orderBy(asc(user.name))

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: count,
    participants,
  }
}

// --- Profile ------------------------------------------------------------------

export async function updateProfile(input: { name?: string; image?: string | null }) {
  const userId = await getUserId()
  const updates: { name?: string; image?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  }
  if (typeof input.name === 'string') {
    const name = input.name.trim()
    if (!name) throw new Error('El nombre no puede estar vacío')
    updates.name = name.slice(0, 80)
  }
  if (input.image !== undefined) {
    const image = input.image?.trim() || null
    updates.image = image
  }
  const [updated] = await db
    .update(user)
    .set(updates)
    .where(eq(user.id, userId))
    .returning({ id: user.id, name: user.name, email: user.email, image: user.image })
  revalidatePath('/')
  return updated
}

export async function uploadProfileImage(base64: string, type: 'avatar' | 'banner') {
  const userId = await getUserId()

  const matches = base64.match(/^data:(.+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid image data')

  const contentType = matches[1]
  const data = matches[2]
  const buffer = Buffer.from(data, 'base64')

  const ext = contentType.split('/')[1] || 'png'
  const filename = `${userId}/${type}-${Date.now()}.${ext}`

  const bucketName = 'user-content'
  await supabase.storage.createBucket(bucketName, { public: true }).catch(() => {})

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filename, buffer, { contentType, upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketName).getPublicUrl(filename)

  if (type === 'avatar') {
    await db
      .update(user)
      .set({ image: publicUrl, updatedAt: new Date() })
      .where(eq(user.id, userId))
  } else {
    await db
      .update(user)
      .set({ banner: publicUrl, updatedAt: new Date() })
      .where(eq(user.id, userId))
  }

  revalidatePath('/')
  return publicUrl
}

// --- Add members to conversation ----------------------------------------------

export async function addConversationMembers(conversationId: number, userIds: string[]) {
  const currentUserId = await getUserId()
  await assertParticipant(conversationId, currentUserId)

  // Filter out users already in the conversation
  const existing = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId))

  const existingIds = new Set(existing.map((p) => p.userId))
  const newIds = userIds.filter((id) => !existingIds.has(id))

  if (newIds.length === 0) return { added: 0 }

  await db.insert(conversationParticipants).values(
    newIds.map((userId) => ({ conversationId, userId })),
  )

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))

  revalidatePath('/')
  return { added: newIds.length }
}

// --- Global search ------------------------------------------------------------

export type GlobalSearchResults = {
  conversations: { id: number; title: string }[]
  messages: { id: number; conversationId: number; content: string; conversationTitle: string }[]
  users: UserSearchResult[]
}

export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const userId = await getUserId()
  const q = query.trim()
  if (!q) return { conversations: [], messages: [], users: [] }

  const myConversationIds = db
    .select({ id: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId))

  const [convs, msgs, users] = await Promise.all([
    db
      .select({ id: conversations.id, title: conversations.title })
      .from(conversations)
      .where(and(inArray(conversations.id, myConversationIds), ilike(conversations.title, `%${q}%`)))
      .orderBy(desc(conversations.updatedAt))
      .limit(8),
    db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        content: messages.content,
        conversationTitle: conversations.title,
      })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(and(inArray(messages.conversationId, myConversationIds), ilike(messages.content, `%${q}%`)))
      .orderBy(desc(messages.createdAt))
      .limit(10),
    searchUsers(q),
  ])

  return { conversations: convs, messages: msgs, users }
}

// --- Change password ----------------------------------------------------------

export async function changePassword(currentPassword: string, newPassword: string) {
  await getUserId()
  if (!newPassword || newPassword.length < 6)
    throw new Error('La contraseña debe tener al menos 6 caracteres')

  try {
    const response = await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword,
        newPassword,
      },
    })
    if (!response) throw new Error('No se pudo cambiar la contraseña')
    return { success: true }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('incorrect'))
      throw new Error('La contraseña actual es incorrecta')
    throw e
  }
}

// --- Delete account -----------------------------------------------------------

export async function deleteAccount() {
  const userId = await getUserId()

  // Delete all user messages
  await db.delete(messages).where(eq(messages.userId, userId))

  // Delete all conversation participations
  await db.delete(conversationParticipants).where(eq(conversationParticipants.userId, userId))

  // Delete conversations created by user that have no remaining participants
  const userConvs = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId))

  for (const c of userConvs) {
    const [remaining] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, c.id))
    if (remaining.count === 0) {
      await db.delete(messages).where(eq(messages.conversationId, c.id))
      await db.delete(conversations).where(eq(conversations.id, c.id))
    }
  }

  // Delete auth records
  await db.delete(session).where(eq(session.userId, userId))
  await db.delete(account).where(eq(account.userId, userId))
  await db.delete(user).where(eq(user.id, userId))

  revalidatePath('/')
  return { success: true }
}

// --- Export user data ---------------------------------------------------------

export type ExportedData = {
  user: { name: string; email: string; createdAt: Date }
  conversations: {
    title: string
    createdAt: Date
    messages: { sender: string; content: string; createdAt: Date }[]
  }[]
}

export async function exportUserData(): Promise<ExportedData> {
  const userId = await getUserId()

  const [me] = await db
    .select({ name: user.name, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))

  const myConvIds = await db
    .select({ id: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId))

  const ids = myConvIds.map((c) => c.id)
  if (ids.length === 0) return { user: me, conversations: [] }

  const convs = await db
    .select({ id: conversations.id, title: conversations.title, createdAt: conversations.createdAt })
    .from(conversations)
    .where(inArray(conversations.id, ids))
    .orderBy(desc(conversations.createdAt))

  const allMsgs = await db
    .select({
      conversationId: messages.conversationId,
      content: messages.content,
      createdAt: messages.createdAt,
      senderName: user.name,
    })
    .from(messages)
    .innerJoin(user, eq(user.id, messages.userId))
    .where(inArray(messages.conversationId, ids))
    .orderBy(asc(messages.createdAt))

  const msgsByConv = new Map<number, typeof allMsgs>()
  for (const m of allMsgs) {
    const arr = msgsByConv.get(m.conversationId) ?? []
    arr.push(m)
    msgsByConv.set(m.conversationId, arr)
  }

  return {
    user: me,
    conversations: convs.map((c) => ({
      title: c.title,
      createdAt: c.createdAt,
      messages: (msgsByConv.get(c.id) ?? []).map((m) => ({
        sender: m.senderName,
        content: m.content,
        createdAt: m.createdAt,
      })),
    })),
  }
}

// --- Typing indicator logic --------------------------------------------------

export async function reportTyping(conversationId: number) {
  const userId = await getUserId()
  await assertParticipant(conversationId, userId)

  await db
    .update(conversationParticipants)
    .set({ lastTypingAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
}

export async function getTypingUsers(conversationId: number): Promise<string[]> {
  const userId = await getUserId()
  await assertParticipant(conversationId, userId)

  // Consider typing active if reported in the last 4 seconds
  const fourSecondsAgo = new Date(Date.now() - 4000)

  const activeTypers = await db
    .select({ name: user.name })
    .from(conversationParticipants)
    .innerJoin(user, eq(user.id, conversationParticipants.userId))
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        ne(conversationParticipants.userId, userId), // exclude myself
        sql`${conversationParticipants.lastTypingAt} > ${fourSecondsAgo}`,
      ),
    )

  return activeTypers.map((t) => t.name)
}

// --- Message mutation actions ------------------------------------------------

export async function deleteMessage(messageId: number) {
  const userId = await getUserId()

  // Verify message exists and belongs to the user
  const [msg] = await db.select().from(messages).where(eq(messages.id, messageId))
  if (!msg) throw new Error('Mensaje no encontrado')
  if (msg.userId !== userId) throw new Error('No tienes permiso para eliminar este mensaje')

  // Desvincular todas las respuestas que apunten a este mensaje
  await db
    .update(messages)
    .set({ replyToId: null })
    .where(eq(messages.replyToId, messageId))

  // Eliminar físicamente el mensaje
  await db.delete(messages).where(eq(messages.id, messageId))

  revalidatePath('/')
  return { success: true }
}

export async function editMessage(messageId: number, content: string) {
  const userId = await getUserId()
  const trimmed = content.trim()
  if (!trimmed) throw new Error('El mensaje no puede estar vacío')

  // Verify message exists and belongs to the user
  const [msg] = await db.select().from(messages).where(eq(messages.id, messageId))
  if (!msg) throw new Error('Mensaje no encontrado')
  if (msg.userId !== userId) throw new Error('No tienes permiso para editar este mensaje')

  await db.update(messages).set({ content: trimmed }).where(eq(messages.id, messageId))
  revalidatePath('/')
  return { success: true }
}

export async function togglePinMessage(messageId: number) {
  const userId = await getUserId()

  const [msg] = await db.select().from(messages).where(eq(messages.id, messageId))
  if (!msg) throw new Error('Mensaje no encontrado')
  await assertParticipant(msg.conversationId, userId)

  await db
    .update(messages)
    .set({ isPinned: !msg.isPinned, pinnedBy: !msg.isPinned ? userId : null })
    .where(eq(messages.id, messageId))

  revalidatePath('/')
}

export type ReactionData = { emoji: string; userIds: string[]; usernames: string[] }

export async function addMessageReaction(messageId: number, emoji: string) {
  const userId = await getUserId()

  const [msg] = await db.select().from(messages).where(eq(messages.id, messageId))
  if (!msg) throw new Error('Mensaje no encontrado')
  await assertParticipant(msg.conversationId, userId)

  const [me] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId))
  const myUsername = me?.name || 'Usuario'

  // Parse existing reactions JSON string
  let reactionsList: ReactionData[] = []
  if (msg.reactions) {
    try {
      reactionsList = JSON.parse(msg.reactions)
    } catch {
      reactionsList = []
    }
  }

  // Find if emoji already has reactions
  const existingReaction = reactionsList.find((r) => r.emoji === emoji)

  if (existingReaction) {
    if (!existingReaction.userIds) existingReaction.userIds = []
    if (!existingReaction.usernames) existingReaction.usernames = []

    const userIndex = existingReaction.userIds.indexOf(userId)
    if (userIndex > -1) {
      existingReaction.userIds.splice(userIndex, 1)
      const nameIndex = existingReaction.usernames.indexOf(myUsername)
      if (nameIndex > -1) existingReaction.usernames.splice(nameIndex, 1)
    } else {
      // User hasn't reacted yet, add them
      existingReaction.userIds.push(userId)
      if (!existingReaction.usernames.includes(myUsername)) {
        existingReaction.usernames.push(myUsername)
      }
    }
  } else {
    // New emoji reaction
    reactionsList.push({ emoji, userIds: [userId], usernames: [myUsername] })
  }

  // Clean empty reaction lists
  reactionsList = reactionsList.filter((r) => r.userIds && r.userIds.length > 0)

  await db
    .update(messages)
    .set({ reactions: reactionsList.length > 0 ? JSON.stringify(reactionsList) : null })
    .where(eq(messages.id, messageId))

  revalidatePath('/')
}

export async function forwardMessage(messageId: number, targetConversationId: number) {
  const userId = await getUserId()
  await assertParticipant(targetConversationId, userId)

  const [msg] = await db.select().from(messages).where(eq(messages.id, messageId))
  if (!msg) throw new Error('Mensaje no encontrado')
  await assertParticipant(msg.conversationId, userId)

  // Copy message to target conversation
  await db.insert(messages).values({
    conversationId: targetConversationId,
    userId,
    role: 'user',
    content: `[Mensaje reenviado]:\n${msg.content}`,
    reactions: msg.reactions,
  })

  revalidatePath('/')
}





// --- Read Receipts -----------------------------------------------------------

export async function markMessagesAsRead(messageIds: number[], skipOwn = true) {
  const userId = await getUserId()
  
  if (messageIds.length === 0) return { success: true }

  for (const messageId of messageIds) {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId))
    if (!msg) continue
    
    await assertParticipant(msg.conversationId, userId)
    
    // Don't mark own messages as read (unless skipOwn is false)
    if (skipOwn && msg.userId === userId) continue

    // Parse existing readBy list
    let readByList: string[] = []
    if (msg.readBy) {
      try {
        readByList = JSON.parse(msg.readBy)
      } catch {
        readByList = []
      }
    }

    // Add user if not already in the list
    if (!readByList.includes(userId)) {
      readByList.push(userId)
      await db
        .update(messages)
        .set({ readBy: JSON.stringify(readByList) })
        .where(eq(messages.id, messageId))
    }
  }

  revalidatePath('/')
  return { success: true }
}

export async function markConversationAsRead(conversationId: number) {
  const userId = await getUserId()
  await assertParticipant(conversationId, userId)

  // Get all messages in the conversation that aren't from this user and haven't been read yet
  const unreadMessages = await db
    .select({ id: messages.id, readBy: messages.readBy })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.userId, userId)
      )
    )

  for (const msg of unreadMessages) {
    let readByList: string[] = []
    if (msg.readBy) {
      try {
        readByList = JSON.parse(msg.readBy)
      } catch {
        readByList = []
      }
    }

    if (!readByList.includes(userId)) {
      readByList.push(userId)
      await db
        .update(messages)
        .set({ readBy: JSON.stringify(readByList) })
        .where(eq(messages.id, msg.id))
    }
  }

  revalidatePath('/')
  return { success: true }
}


