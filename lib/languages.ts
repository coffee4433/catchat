export interface Language {
  code: string
  deeplCode: string
  nameEn: string
  nameEs: string
  flag: string
}

export const LANGUAGES: Language[] = [
  { code: 'bg', deeplCode: 'BG', nameEn: 'Bulgarian', nameEs: 'Búlgaro', flag: '🇧🇬' },
  { code: 'cs', deeplCode: 'CS', nameEn: 'Czech', nameEs: 'Checo', flag: '🇨🇿' },
  { code: 'da', deeplCode: 'DA', nameEn: 'Danish', nameEs: 'Danés', flag: '🇩🇰' },
  { code: 'de', deeplCode: 'DE', nameEn: 'German', nameEs: 'Alemán', flag: '🇩🇪' },
  { code: 'el', deeplCode: 'EL', nameEn: 'Greek', nameEs: 'Griego', flag: '🇬🇷' },
  { code: 'en', deeplCode: 'EN', nameEn: 'English', nameEs: 'Inglés', flag: '🇬🇧' },
  { code: 'es', deeplCode: 'ES', nameEn: 'Spanish', nameEs: 'Español', flag: '🇪🇸' },
  { code: 'et', deeplCode: 'ET', nameEn: 'Estonian', nameEs: 'Estonio', flag: '🇪🇪' },
  { code: 'fi', deeplCode: 'FI', nameEn: 'Finnish', nameEs: 'Finlandés', flag: '🇫🇮' },
  { code: 'fr', deeplCode: 'FR', nameEn: 'French', nameEs: 'Francés', flag: '🇫🇷' },
  { code: 'hu', deeplCode: 'HU', nameEn: 'Hungarian', nameEs: 'Húngaro', flag: '🇭🇺' },
  { code: 'id', deeplCode: 'ID', nameEn: 'Indonesian', nameEs: 'Indonesio', flag: '🇮🇩' },
  { code: 'it', deeplCode: 'IT', nameEn: 'Italian', nameEs: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', deeplCode: 'JA', nameEn: 'Japanese', nameEs: 'Japonés', flag: '🇯🇵' },
  { code: 'ko', deeplCode: 'KO', nameEn: 'Korean', nameEs: 'Coreano', flag: '🇰🇷' },
  { code: 'lt', deeplCode: 'LT', nameEn: 'Lithuanian', nameEs: 'Lituano', flag: '🇱🇹' },
  { code: 'lv', deeplCode: 'LV', nameEn: 'Latvian', nameEs: 'Letón', flag: '🇱🇻' },
  { code: 'nb', deeplCode: 'NB', nameEn: 'Norwegian', nameEs: 'Noruego', flag: '🇳🇴' },
  { code: 'nl', deeplCode: 'NL', nameEn: 'Dutch', nameEs: 'Holandés', flag: '🇳🇱' },
  { code: 'pl', deeplCode: 'PL', nameEn: 'Polish', nameEs: 'Polaco', flag: '🇵🇱' },
  { code: 'pt', deeplCode: 'PT', nameEn: 'Portuguese', nameEs: 'Portugués', flag: '🇵🇹' },
  { code: 'ro', deeplCode: 'RO', nameEn: 'Romanian', nameEs: 'Rumano', flag: '🇷🇴' },
  { code: 'ru', deeplCode: 'RU', nameEn: 'Russian', nameEs: 'Ruso', flag: '🇷🇺' },
  { code: 'sk', deeplCode: 'SK', nameEn: 'Slovak', nameEs: 'Eslovaco', flag: '🇸🇰' },
  { code: 'sl', deeplCode: 'SL', nameEn: 'Slovenian', nameEs: 'Esloveno', flag: '🇸🇮' },
  { code: 'sv', deeplCode: 'SV', nameEn: 'Swedish', nameEs: 'Sueco', flag: '🇸🇪' },
  { code: 'tr', deeplCode: 'TR', nameEn: 'Turkish', nameEs: 'Turco', flag: '🇹🇷' },
  { code: 'uk', deeplCode: 'UK', nameEn: 'Ukrainian', nameEs: 'Ucraniano', flag: '🇺🇦' },
  { code: 'zh', deeplCode: 'ZH', nameEn: 'Chinese', nameEs: 'Chino', flag: '🇨🇳' },
]

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code)
}

export function getLanguageName(code: string, lang: 'en' | 'es'): string {
  const language = getLanguage(code)
  if (!language) return code.toUpperCase()
  return lang === 'es' ? language.nameEs : language.nameEn
}
