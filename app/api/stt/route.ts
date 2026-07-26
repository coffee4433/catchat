import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const language = (formData.get('language') as string) || 'es'

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const audioBuffer = await file.arrayBuffer()

    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '512940b2828fc1442427e857ff23d49b5b4b6012'
    const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

    // 1. Try Deepgram Nova-2 REST API with smart formatting & diacritics
    if (DEEPGRAM_API_KEY) {
      try {
        const langCode = language === 'es' ? 'es' : 'en'
        const dgUrl = `https://api.deepgram.com/v1/listen?model=nova-2&language=${langCode}&smart_format=true&punctuate=true&diacritize=true`

        const res = await fetch(dgUrl, {
          method: 'POST',
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': file.type || 'audio/webm',
          },
          body: audioBuffer,
        })

        if (res.ok) {
          const data = await res.json()
          const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript
          if (transcript && transcript.trim()) {
            return NextResponse.json({ text: transcript.trim() })
          }
        } else {
          console.warn('Deepgram REST status:', res.status)
        }
      } catch (e) {
        console.warn('Deepgram REST API error:', e)
      }
    }

    // 2. Try Groq Whisper API (whisper-large-v3-turbo)
    if (GROQ_API_KEY) {
      try {
        const groqFormData = new FormData()
        groqFormData.append('file', file, 'audio.webm')
        groqFormData.append('model', 'whisper-large-v3-turbo')
        groqFormData.append('language', language === 'es' ? 'es' : 'en')

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
          body: groqFormData,
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.text) return NextResponse.json({ text: data.text.trim() })
        }
      } catch (e) {
        console.warn('Groq STT error:', e)
      }
    }

    // 3. Try OpenAI API if key present
    if (OPENAI_API_KEY) {
      try {
        const aiFormData = new FormData()
        aiFormData.append('file', file, 'audio.webm')
        aiFormData.append('model', 'whisper-1')
        aiFormData.append('language', language === 'es' ? 'es' : 'en')

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: aiFormData,
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.text) return NextResponse.json({ text: data.text.trim() })
        }
      } catch (e) {
        console.warn('OpenAI STT error:', e)
      }
    }

    return NextResponse.json({ text: '' })
  } catch (err: any) {
    console.error('STT API error:', err)
    return NextResponse.json({ text: '' })
  }
}
