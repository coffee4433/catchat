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

    const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || ''
    const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

    // 1. Try Groq Whisper API if key present
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

    // 2. Try OpenAI API if key present
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

    // 3. Try Hugging Face free public models
    const hfHeaders: Record<string, string> = {
      'Content-Type': file.type || 'audio/webm',
    }
    if (HF_TOKEN) {
      hfHeaders.Authorization = `Bearer ${HF_TOKEN}`
    }

    const hfModels = [
      'https://api-inference.huggingface.co/models/openai/whisper-small',
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo',
      'https://api-inference.huggingface.co/models/facebook/wav2vec2-base-960h',
    ]

    for (const modelUrl of hfModels) {
      try {
        const hfRes = await fetch(modelUrl, {
          method: 'POST',
          headers: hfHeaders,
          body: audioBuffer,
        })

        if (hfRes.ok) {
          const data = await hfRes.json()
          if (data && typeof data.text === 'string' && data.text.trim()) {
            return NextResponse.json({ text: data.text.trim() })
          }
        }
      } catch (e) {
        console.warn(`HF STT model ${modelUrl} failed:`, e)
      }
    }

    // Return empty text cleanly without showing alert dialogs
    return NextResponse.json({ text: '' })
  } catch (err: any) {
    console.error('STT API error:', err)
    return NextResponse.json({ text: '' })
  }
}
