const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

process.env.JAVA_HOME = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.18.8-hotspot'
process.env.ANDROID_HOME = process.env.LOCALAPPDATA + '\\Android\\Sdk'

const androidDir = path.join(__dirname, '..', 'android')
if (!fs.existsSync(androidDir)) fs.mkdirSync(androidDir)

const cmd = `npx bubblewrap init --manifest https://catchat-three.vercel.app/manifest.json --directory android --skipPrompts`

console.log('Running:', cmd)

try {
  const result = execSync(cmd, {
    encoding: 'utf-8',
    timeout: 120000,
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
  })
  console.log(result)
} catch (e) {
  console.log('stdout:', e.stdout?.toString())
  console.log('stderr:', e.stderr?.toString())
}
