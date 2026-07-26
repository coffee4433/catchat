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

    // 1. Try Hugging Face Free Inference API (Whisper Large V3 Turbo)
    try {
      const hfRes = await fetch('https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'audio/webm',
        },
        body: audioBuffer,
      })

      if (hfRes.ok) {
        const data = await hfRes.json()
        if (data && typeof data.text === 'string' && data.text.trim()) {
          return NextResponse.json({ text: data.text.trim() })
        }
      }
    } catch (e) {
      console.warn('HF Whisper free API error:', e)
    }

    // 2. Try Hugging Face secondary free model (Whisper Small)
    try {
      const hfRes = await fetch('https://api-inference.huggingface.co/models/openai/whisper-small', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'audio/webm',
        },
        body: audioBuffer,
      })

      if (hfRes.ok) {
        const data = await hfRes.json()
        if (data && typeof data.text === 'string' && data.text.trim()) {
          return NextResponse.json({ text: data.text.trim() })
        }
      }
    } catch (e) {
      console.warn('HF Whisper small fallback error:', e)
    }

    // 3. Try Groq API if key configured
    const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
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
        console.warn('Groq STT fallback error:', e)
      }
    }

    // 4. Try OpenAI API if key configured
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
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
        console.warn('OpenAI STT fallback error:', e)
      }
    }

    return NextResponse.json({ error: 'No transcription available' }, { status: 500 })
  } catch (err: any) {
    console.error('STT API error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to transcribe' }, { status: 500 })
  }
}
