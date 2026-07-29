export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto',
): Promise<string> {
  if (!text || !text.trim()) return text

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      target_lang: targetLang,
      ...(sourceLang !== 'auto' ? { source_lang: sourceLang } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(`Translation error: ${response.status}`)
  }

  const data = await response.json()
  return data.translatedText
}
