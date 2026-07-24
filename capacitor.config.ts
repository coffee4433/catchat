import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.catchat.chat',
  appName: 'CatChat',
  webDir: 'out',
  server: {
    url: 'https://catchat-one.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
