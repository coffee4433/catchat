/**
 * Local Whisper Speech-to-Text Transcriber
 * 
 * Uses @huggingface/transformers to run Whisper AI model
 * 100% locally in the browser/Electron — no API keys, no server, no Google.
 */

let pipeline: any = null
let isLoading = false

/**
 * Transcribe an audio blob to text using local Whisper model.
 * The model is loaded once and cached for subsequent calls.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language: string = 'es'
): Promise<string> {
  const { pipeline: createPipeline } = await import('@huggingface/transformers')

  // Load the pipeline once (subsequent calls reuse it)
  if (!pipeline && !isLoading) {
    isLoading = true
    try {
      pipeline = await createPipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny',
        {
          dtype: 'fp32',
          device: 'wasm',
        }
      )
    } catch (err) {
      console.error('Failed to load Whisper model:', err)
      isLoading = false
      throw err
    }
    isLoading = false
  }

  // Wait if another call is loading the model
  while (isLoading) {
    await new Promise((r) => setTimeout(r, 100))
  }

  if (!pipeline) {
    throw new Error('Whisper model failed to load')
  }

  // Convert blob to Float32Array (16kHz mono PCM)
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  })
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  const float32Data = audioBuffer.getChannelData(0) // mono

  const result = await pipeline(float32Data, {
    language: language === 'es' ? 'spanish' : 'english',
    task: 'transcribe',
  })

  await audioContext.close()

  return (result?.text || '').trim()
}

/**
 * Check if the Whisper model is already loaded and ready.
 */
export function isWhisperReady(): boolean {
  return pipeline !== null
}
