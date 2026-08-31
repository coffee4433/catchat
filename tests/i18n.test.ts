import { describe, expect, it } from 'vitest'
import { translations } from '@/lib/i18n'

/**
 * The UI reads `translations[lang][key]`, so a key that exists in one language and
 * not the other renders as `undefined` instead of falling back. Keep them in sync.
 */
describe('translations', () => {
  const enKeys = Object.keys(translations.en).sort()
  const esKeys = Object.keys(translations.es).sort()

  it('ships the same keys for every language', () => {
    expect(esKeys.filter((k) => !enKeys.includes(k))).toEqual([])
    expect(enKeys.filter((k) => !esKeys.includes(k))).toEqual([])
  })

  it('has no empty strings', () => {
    for (const lang of ['en', 'es'] as const) {
      const empty = Object.entries(translations[lang])
        .filter(([, value]) => typeof value === 'string' && value.trim() === '')
        .map(([key]) => key)
      expect(empty, `empty ${lang} strings`).toEqual([])
    }
  })
})
