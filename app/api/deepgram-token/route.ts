import { NextRequest, NextResponse } from 'next/server'

/**
 * Returns a temporary Deepgram API key for client-side streaming.
 * Requires DEEPGRAM_API_KEY environment variable.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY || ''

  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPGRAM_API_KEY not configured' },
      { status: 500 }
    )
  }

  // Return the API key for the client to use with WebSocket
  // In production, you'd create a temporary scoped key via Deepgram's API
  return NextResponse.json({ apiKey })
}
