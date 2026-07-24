const { TwaGenerator, TwaManifest, GradleWrapper, JarSigner, AndroidSdkTools, JdkHelper, ConsoleLog } = require('@bubblewrap/core')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const JDK = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.18.8-hotspot'
const SDK = process.env.LOCALAPPDATA + '\\Android\\Sdk'
process.env.JAVA_HOME = JDK
process.env.ANDROID_HOME = SDK

const androidDir = path.join(__dirname, '..', 'android')
const log = new ConsoleLog('twa')

async function run() {
  if (fs.existsSync(androidDir)) {
    fs.rmSync(androidDir, { recursive: true, force: true })
  }
  fs.mkdirSync(androidDir, { recursive: true })

  const keystorePath = path.join(androidDir, 'release.keystore')

  const twaManifest = new TwaManifest({
    packageId: 'app.catchat.chat',
    name: 'CatChat',
    launcherName: 'CatChat',
    display: 'standalone',
    backgroundColor: '#0D0E14',
    themeColor: '#0D0E14',
    navigationColor: '#0D0E14',
    startUrl: 'https://catchat-one.vercel.app/',
    host: 'catchat-one.vercel.app',
    webManifestUrl: 'https://catchat-one.vercel.app/manifest.json',
    iconUrl: 'https://catchat-one.vercel.app/placeholder-logo.png',
    maskableIconUrl: 'https://catchat-one.vercel.app/placeholder-logo.png',
    splashScreenFadeOutDuration: 300,
    signingKey: {
      path: keystorePath,
      alias: 'catchat',
      password: 'android',
      keyPassword: 'android',
    },
    generatorApp: 'bubblewrap-cli',
    fallbackType: 'customtabs',
    features: { locationDelegation: { enabled: false }, playBilling: { enabled: false } },
    alphaDependencies: { enabled: false },
    enableNotifications: false,
    appVersionName: '1.0.0',
    appVersionCode: 1,
    shortcuts: [],
  })

  log.info('Generating TWA project...')
  const generator = new TwaGenerator()
  await generator.createTwaProject(androidDir, twaManifest, log)

  log.info('Generating keystore...')
  if (!fs.existsSync(keystorePath)) {
    const keytool = path.join(JDK, 'bin', 'keytool')
    execSync(
      `"${keytool}" -genkey -v -keystore "${keystorePath}" -alias catchat -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=CatChat, OU=Dev, O=CatChat, L=City, S=State, C=US"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    )
    log.info('Keystore created')
  }

  log.info('Building APK (may take a few minutes)...')
  const jdkHelper = new JdkHelper(JDK, log)
  const androidSdkTools = await AndroidSdkTools.create(
    process,
    { androidSdkPath: SDK },
    jdkHelper,
    log,
  )
  const gradleWrapper = new GradleWrapper(process, androidSdkTools, androidDir)
  await gradleWrapper.assembleRelease()

  const unsignedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk')
  const signedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')

  if (fs.existsSync(unsignedApk)) {
    log.info('Signing APK...')
    const jarSigner = new JarSigner(jdkHelper)
    await jarSigner.sign(unsignedApk, signedApk, keystorePath, 'catchat', 'android', 'android')
    log.info(`\nDone! Signed APK: ${signedApk}\n`)
  } else {
    log.error('APK build failed - unsigned APK not found. Check Gradle output above.')
  }
}

run().catch(e => {
  console.error(e?.message || e)
  process.exit(1)
})
