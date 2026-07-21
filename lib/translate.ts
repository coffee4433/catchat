const LIBRETRANSLATE_URL =
  process.env.NEXT_PUBLIC_TRANSLATE_URL || 'http://localhost:5000'

/**
 * Traduce un texto usando LibreTranslate.
 * @param text - Texto a traducir.
 * @param targetLang - Idioma destino ('en' o 'es').
 * @param sourceLang - Idioma origen ('auto' para detectar).
 * @returns Texto traducido.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
): Promise<string> {
  if (!text || !text.trim()) return text

  const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text',
    }),
  })

  if (!response.ok) {
    throw new Error(`Translation error: ${response.status}`)
  }

  const data = await response.json()
  return data.translatedText
}
