const { TwaGenerator, TwaManifest, AndroidSdkTools, GradleWrapper } = require('@bubblewrap/core')
const { ConsoleLog } = require('@bubblewrap/core/dist/lib/util/Log')
const fs = require('fs')
const path = require('path')

process.env.JAVA_HOME = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.18.8-hotspot'
process.env.ANDROID_HOME = process.env.LOCALAPPDATA + '\\Android\\Sdk'

const jdkPath = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.18.8-hotspot'
const androidSdkPath = process.env.LOCALAPPDATA + '\\Android\\Sdk'

async function main() {
  const androidDir = path.join(__dirname, '..', 'android')

  // Create TWA manifest
  const twaManifest = new TwaManifest({
    packageId: 'app.catchat.chat',
    name: 'CatChat',
    launcherName: 'CatChat',
    display: 'standalone',
    backgroundColor: '#0d0e14',
    themeColor: '#0d0e14',
    startUrl: 'https://catchat-three.vercel.app/',
    host: 'catchat-three.vercel.app',
    webManifestUrl: 'https://catchat-three.vercel.app/manifest.json',
    iconUrl: 'https://catchat-three.vercel.app/placeholder-logo.png',
    maskableIconUrl: 'https://catchat-three.vercel.app/placeholder-logo.png',
    splashScreenFadeOutDuration: 300,
    signingKey: {
      path: path.join(androidDir, 'release.keystore'),
      alias: 'catchat',
    },
    generatorApp: 'bubblewrap-cli',
    fallbackType: 'customtabs',
    features: {
      locationDelegation: { enabled: false },
      playBilling: { enabled: false },
    },
  })

  const log = new ConsoleLog('init')
  const generator = new TwaGenerator()

  // Initialize the project
  console.log('Generating TWA project...')
  await generator.createTwaProject(androidDir, twaManifest, log)

  // Generate signing key
  console.log('Generating signing key...')
  const sdkTools = await AndroidSdkTools.create(jdkPath, androidSdkPath, log)
  
  try {
    const keytool = path.join(jdkPath, 'bin', 'keytool')
    const { execSync } = require('child_process')
    const keystorePath = path.join(androidDir, 'release.keystore')
    
    if (!fs.existsSync(keystorePath)) {
      execSync(
        `"${keytool}" -genkey -v -keystore "${keystorePath}" -alias catchat -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=CatChat, OU=Dev, O=CatChat, L=City, ST=State, C=US"`,
        { encoding: 'utf-8' },
      )
      console.log('Keystore created at', keystorePath)
    }
  } catch (e) {
    console.log('Keystore creation skipped (may already exist):', e.message?.slice(0, 100))
  }

  // Update project with signing key info
  twaManifest.signingKey = {
    path: path.join(androidDir, 'release.keystore'),
    alias: 'catchat',
    password: 'android',
    keyPassword: 'android',
  }
  
  await generator.createTwaProject(androidDir, twaManifest, log)

  console.log('\nTWA project created at', androidDir)
  console.log('To build the APK, run: cd android && gradlew assembleRelease')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
