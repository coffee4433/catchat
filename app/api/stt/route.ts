import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const language = (formData.get('language') as string) || 'es'

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

    // 1. Try Groq Whisper API (Ultra fast & free tier)
    if (GROQ_API_KEY) {
      try {
        const groqFormData = new FormData()
        groqFormData.append('file', file, 'audio.webm')
        groqFormData.append('model', 'whisper-large-v3-turbo')
        groqFormData.append('language', language === 'es' ? 'es' : 'en')

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: groqFormData,
        })

        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            return NextResponse.json({ text: data.text })
          }
        }
      } catch (err) {
        console.error('Groq STT failed:', err)
      }
    }

    // 2. Try OpenAI Whisper API
    if (OPENAI_API_KEY) {
      try {
        const aiFormData = new FormData()
        aiFormData.append('file', file, 'audio.webm')
        aiFormData.append('model', 'whisper-1')
        aiFormData.append('language', language === 'es' ? 'es' : 'en')

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: aiFormData,
        })

        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            return NextResponse.json({ text: data.text })
          }
        }
      } catch (err) {
        console.error('OpenAI STT failed:', err)
      }
    }

    return NextResponse.json({ error: 'No STT service configured' }, { status: 501 })
  } catch (err: any) {
    console.error('STT API Error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to transcribe audio' }, { status: 500 })
  }
}
