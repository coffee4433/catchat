import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawnSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.join(__dirname, '..')
const BUILD_DIR = path.join(PROJECT_ROOT, 'build')
const RUNTIME_DIR = path.join(BUILD_DIR, 'translator-runtime')
const MODELS_DIR = path.join(BUILD_DIR, 'argos-packages')

async function downloadFile(url, dest) {
  console.log(`Downloading ${url} to ${dest}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download: ${res.statusText}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
}

function extractZip(zipPath, destDir) {
  console.log(`Extracting ${zipPath} to ${destDir}...`)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  // Use PowerShell Expand-Archive on Windows
  if (process.platform === 'win32') {
    execSync(`powershell.exe -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'inherit' })
  } else {
    // Unix fallback
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' })
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   📦 Build Portable Python Translator (win)  ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true })
  }

  // 1. Download Python embeddable zip (Windows 64-bit)
  const pythonZip = path.join(BUILD_DIR, 'python-embed.zip')
  if (!fs.existsSync(pythonZip)) {
    await downloadFile('https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip', pythonZip)
  } else {
    console.log('✅ Python embeddable zip already downloaded.')
  }

  // 2. Extract Python
  if (!fs.existsSync(path.join(RUNTIME_DIR, 'python.exe'))) {
    extractZip(pythonZip, RUNTIME_DIR)
  } else {
    console.log('✅ Python already extracted in translator-runtime.')
  }

  // 3. Enable site-packages in python310._pth
  const pthFile = path.join(RUNTIME_DIR, 'python310._pth')
  if (fs.existsSync(pthFile)) {
    let content = fs.readFileSync(pthFile, 'utf8')
    if (content.includes('#import site')) {
      content = content.replace('#import site', 'import site')
      fs.writeFileSync(pthFile, content, 'utf8')
      console.log('✅ Enabled site-packages in python310._pth')
    }
  }

  // 4. Download get-pip.py and install pip
  const pythonExe = path.join(RUNTIME_DIR, 'python.exe')
  const getPipPy = path.join(RUNTIME_DIR, 'get-pip.py')
  if (!fs.existsSync(path.join(RUNTIME_DIR, 'Lib', 'site-packages', 'pip'))) {
    if (!fs.existsSync(getPipPy)) {
      await downloadFile('https://bootstrap.pypa.io/get-pip.py', getPipPy)
    }
    console.log('Installing pip in portable Python...')
    execSync(`"${pythonExe}" "${getPipPy}" --no-warn-script-location`, { stdio: 'inherit' })
  } else {
    console.log('✅ Pip already installed.')
  }

  // 5. Install LibreTranslate and setuptools in portable Python
  console.log('Installing LibreTranslate and dependencies in portable Python...')
  // We force setuptools to be a stable version compatible with flask-swagger
  execSync(`"${pythonExe}" -m pip install "setuptools<81" wheel`, { stdio: 'inherit' })
  execSync(`"${pythonExe}" -m pip install libretranslate`, { stdio: 'inherit' })
  console.log('✅ LibreTranslate installed successfully.')

  // 6. Pre-download language models (en ↔ es) to build/argos-packages/
  console.log('\n🌍 Pre-downloading language models (en ↔ es)...')
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true })
  }

  const pythonCode = `
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
from argostranslate import package
print("Updating package index...")
package.update_package_index()
pkgs = package.get_available_packages()
en_es = [p for p in pkgs if p.from_code=='en' and p.to_code=='es']
es_en = [p for p in pkgs if p.from_code=='es' and p.to_code=='en']
print(f"Found models: en->es ({len(en_es)}), es->en ({len(es_en)})")
for p in en_es + es_en:
    print(f"Downloading: {p.from_code}->{p.to_code}")
    try:
        downloaded_path = p.download()
        print(f"Installing: {downloaded_path}")
        package.install_from_path(downloaded_path)
        print(f"Success: {p.from_code}->{p.to_code}")
    except Exception as e:
        print(f"Error installing {p.from_code}->{p.to_code}: {e}")
installed_pkgs = package.get_installed_packages()
print(f"Total installed packages: {len(installed_pkgs)}")
for pkg in installed_pkgs:
    print(f"  - {pkg.from_code}->{pkg.to_code}")
`.trim()

  const tempPyScript = path.join(RUNTIME_DIR, 'download_models.py')
  fs.writeFileSync(tempPyScript, pythonCode, 'utf8')

  try {
    execSync(`"${pythonExe}" "${tempPyScript}"`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ARGOS_PACKAGES_DIR: MODELS_DIR,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1'
      }
    })
    fs.unlinkSync(tempPyScript)
  } catch (error) {
    console.error('Error downloading models:', error)
    if (fs.existsSync(tempPyScript)) fs.unlinkSync(tempPyScript)
    throw error
  }

  // Verify models were downloaded
  const modelFiles = fs.readdirSync(MODELS_DIR)
  if (modelFiles.length === 0) {
    throw new Error('No models were downloaded! Check your internet connection.')
  }
  console.log(`✅ ${modelFiles.length} model packages downloaded to ${MODELS_DIR}`)


  console.log('\n🎉 Portable Python Translator build completed successfully!')
  console.log(`- Runtime: ${RUNTIME_DIR}`)
  console.log(`- Language models: ${MODELS_DIR}`)
}

main().catch(err => {
  console.error('❌ Error building portable translator:', err)
  process.exit(1)
})
