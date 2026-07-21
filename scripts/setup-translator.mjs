/**
 * setup-translator.mjs
 *
 * Crea un entorno virtual 'translator-env', instala LibreTranslate
 * y pre-descarga los modelos de español e inglés.
 * Ejecutar una sola vez: pnpm run translator:setup
 */
import { execSync, spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

const GLOBAL_PYTHON = process.platform === 'win32' ? 'python' : 'python3'
const VENV_DIR = join(PROJECT_ROOT, 'translator-env')
const VENV_PYTHON = process.platform === 'win32'
  ? join(VENV_DIR, 'Scripts', 'python.exe')
  : join(VENV_DIR, 'bin', 'python')

function run(cmd, label) {
  console.log(`\n🔧 ${label}...`)
  console.log(`   $ ${cmd}\n`)
  try {
    execSync(cmd, { stdio: 'inherit' })
    return true
  } catch (err) {
    console.error(`❌ Error: ${label} falló.`)
    return false
  }
}

function checkPython() {
  try {
    const version = execSync(`${GLOBAL_PYTHON} --version`, { encoding: 'utf-8' }).trim()
    console.log(`✅ ${version} encontrado`)
    return true
  } catch {
    console.error('❌ Python no encontrado. Instálalo desde https://python.org/downloads/')
    return false
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   🌐 CatChat Translator Setup (en + es)     ║')
  console.log('╚══════════════════════════════════════════════╝')

  // 1. Check Python
  if (!checkPython()) {
    process.exit(1)
  }

  // 2. Create venv if not exists
  if (!existsSync(VENV_PYTHON)) {
    const ok = run(`${GLOBAL_PYTHON} -m venv "${VENV_DIR}"`, 'Creando entorno virtual (translator-env)')
    if (!ok) {
      process.exit(1)
    }
  } else {
    console.log('✅ Entorno virtual ya existe')
  }

  // 3. Install LibreTranslate in the venv
  const checkCmd = `"${VENV_PYTHON}" -c "import libretranslate"`
  let installed = false
  try {
    execSync(checkCmd, { stdio: 'ignore' })
    installed = true
  } catch {}

  if (installed) {
    console.log('✅ LibreTranslate ya está instalado en el venv')
  } else {
    const ok = run(`"${VENV_PYTHON}" -m pip install libretranslate`, 'Instalando LibreTranslate en el venv')
    if (!ok) {
      console.error('\n💡 Revisa los errores arriba. Puede necesitar permisos o espacio en disco.')
      process.exit(1)
    }
  }

  // 4. Pre-download models using Argos Translate programmatically
  console.log('\n🌍 Pre-descargando modelos de idioma (en ↔ es)...')
  console.log('   Esto descarga ~200 MB la primera vez. Las siguientes veces es instantáneo.\n')

  try {
    const pythonCode = `
import sys
from argostranslate import package
package.update_package_index()
pkgs = package.get_available_packages()
en_es = [p for p in pkgs if p.from_code=='en' and p.to_code=='es']
es_en = [p for p in pkgs if p.from_code=='es' and p.to_code=='en']
print(f"Modelos encontrados en el indice: en->es ({len(en_es)}), es->en ({len(es_en)})")
for p in en_es + es_en:
    print(f"Descargando e instalando: {p}")
    package.install_from_path(p.download())
print("Download complete!")
`.trim()

    // Escape double quotes for shell execution
    const escapedCode = pythonCode.replace(/"/g, '\\"')
    
    const { execSync } = await import('child_process')
    execSync(`"${VENV_PYTHON}" -c "${escapedCode}"`, {
      stdio: 'inherit',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })

    console.log('\n✅ Modelos descargados y verificados correctamente.')
    console.log('\n╔══════════════════════════════════════════════╗')
    console.log('║   ✅ Setup completado con éxito              ║')
    console.log('║                                              ║')
    console.log('║   Usa: pnpm run dev                          ║')
    console.log('║   LibreTranslate se iniciará automáticamente ║')
    console.log('╚══════════════════════════════════════════════╝\n')
  } catch (err) {
    console.error(`\n❌ Falló la descarga de modelos: ${err.message}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
