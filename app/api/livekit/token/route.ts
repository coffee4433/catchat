import { AccessToken } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversationParticipants } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await req.json()
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
    }

    const [member] = await db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, session.user.id),
        ),
      )

    if (!member) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: session.user.id,
      name: session.user.name,
      ttl: '10m',
    })

    token.addGrant({
      room: `call-${conversationId}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    return NextResponse.json({
      token: await token.toJwt(),
      url: wsUrl,
    })
  } catch (e) {
    console.error('[livekit token]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
