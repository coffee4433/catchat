export type Theme = {
  id: string
  name: string
  dark: boolean
  /* Preview swatches for the settings picker */
  preview: { bg: string; card: string; accent: string; text: string }
}

export const themes: Theme[] = [
  {
    id: 'light',
    name: 'Claro',
    dark: false,
    preview: { bg: '#f6f6f4', card: '#ffffff', accent: '#1f1f1f', text: '#1f1f1f' },
  },
  {
    id: 'dark',
    name: 'Oscuro',
    dark: true,
    preview: { bg: '#141519', card: '#1e2026', accent: '#e8e8e8', text: '#ececec' },
  },
  {
    id: 'midnight',
    name: 'Medianoche',
    dark: true,
    preview: { bg: '#0d1526', card: '#141f38', accent: '#5b8cff', text: '#e6ecff' },
  },
  {
    id: 'ocean',
    name: 'Oc\u00e9ano',
    dark: false,
    preview: { bg: '#ecf5f9', card: '#ffffff', accent: '#0e7490', text: '#16323d' },
  },
  {
    id: 'forest',
    name: 'Bosque',
    dark: true,
    preview: { bg: '#0f1d15', card: '#16281c', accent: '#34d399', text: '#e4f2e9' },
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    dark: false,
    preview: { bg: '#fbf1e7', card: '#fffaf4', accent: '#ea580c', text: '#3b2a20' },
  },
  {
    id: 'rose',
    name: 'Ros\u00e9',
    dark: false,
    preview: { bg: '#faeff2', card: '#fffafb', accent: '#e11d63', text: '#3d2229' },
  },
  {
    id: 'coffee',
    name: 'Caf\u00e9',
    dark: true,
    preview: { bg: '#1e1610', card: '#2a1f16', accent: '#d3a05e', text: '#f0e6dc' },
  },
  {
    id: 'cyber',
    name: 'Cyber',
    dark: true,
    preview: { bg: '#0a120c', card: '#101c13', accent: '#22ff88', text: '#d8ffe8' },
  },
  {
    id: 'mint',
    name: 'Menta',
    dark: false,
    preview: { bg: '#ecf8f2', card: '#ffffff', accent: '#059669', text: '#12291d' },
  },
]
