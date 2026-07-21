/**
 * start-translator.mjs
 *
 * Inicia LibreTranslate como proceso hijo en el puerto 5000 (solo en,es).
 * Usa el entorno virtual 'translator-env' dentro del proyecto.
 * Exporta funciones para arrancar/parar el servidor.
 */
import { spawn } from 'child_process'
import { createServer } from 'net'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

/**
 * Busca el ejecutable de LibreTranslate en el venv.
 * Retorna { exe, args, env } donde exe es el path al ejecutable y args los argumentos base.
 */
function getLibreTranslateCmd() {
  // Opción 1: ejecutable directo del venv (más fiable que python -m)
  const venvExe = process.platform === 'win32'
    ? join(PROJECT_ROOT, 'translator-env', 'Scripts', 'libretranslate.exe')
    : join(PROJECT_ROOT, 'translator-env', 'bin', 'libretranslate')

  if (existsSync(venvExe)) {
    return { exe: venvExe, args: [], env: {} }
  }

  // Opción 2: Runtime portable embebido en build/
  const embeddedPython = process.platform === 'win32'
    ? join(PROJECT_ROOT, 'build', 'translator-runtime', 'python.exe')
    : join(PROJECT_ROOT, 'build', 'translator-runtime', 'bin', 'python')

  const embeddedModels = join(PROJECT_ROOT, 'build', 'argos-packages')

  if (existsSync(embeddedPython)) {
    return {
      exe: embeddedPython,
      args: ['-m', 'libretranslate'],
      env: { ARGOS_PACKAGES_DIR: embeddedModels }
    }
  }

  // Opción 3: fallback al comando global
  return { exe: 'libretranslate', args: [], env: {} }
}

const LT_PORT = parseInt(process.env.LT_PORT || '5000', 10)

let ltProcess = null

/**
 * Comprueba si un puerto está en uso.
 */
export function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port, '127.0.0.1')
  })
}

/**
 * Espera hasta que el servidor esté respondiendo.
 */
async function waitForServer(port, timeout = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/languages`)
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

/**
 * Inicia LibreTranslate en background. Retorna true si arrancó correctamente.
 */
export async function startTranslator() {
  // Si ya hay algo en el puerto, asumimos que ya está corriendo
  const inUse = await isPortInUse(LT_PORT)
  if (inUse) {
    console.log(`🌐 LibreTranslate ya detectado en puerto ${LT_PORT}`)
    return true
  }

  const { exe, args, env } = getLibreTranslateCmd()
  const fullArgs = [...args, '--load-only', 'en,es', '--host', '127.0.0.1', '--port', String(LT_PORT)]
  const fullEnv = { ...process.env, ...env }

  console.log(`🌐 Iniciando LibreTranslate en puerto ${LT_PORT} (solo en,es)...`)
  console.log(`   Ejecutable: ${exe}`)
  if (env.ARGOS_PACKAGES_DIR) {
    console.log(`   Modelos: ${env.ARGOS_PACKAGES_DIR}`)
  }

  ltProcess = spawn(exe, fullArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    detached: false,
    env: fullEnv
  })

  ltProcess.stdout.on('data', (data) => {
    const line = data.toString().trim()
    if (line) console.log(`   [LibreTranslate] ${line}`)
  })

  ltProcess.stderr.on('data', (data) => {
    const line = data.toString().trim()
    if (line) console.log(`   [LibreTranslate] ${line}`)
  })

  ltProcess.on('error', (err) => {
    console.error(`❌ No se pudo iniciar LibreTranslate: ${err.message}`)
    console.error('   Ejecuta primero: pnpm run translator:setup')
    ltProcess = null
  })

  ltProcess.on('close', (code) => {
    if (code !== null && code !== 0) {
      console.error(`⚠️  LibreTranslate terminó con código ${code}`)
    }
    ltProcess = null
  })

  // Esperar a que esté listo (hasta 2 min)
  console.log('   Esperando a que el servidor esté listo...')
  const ready = await waitForServer(LT_PORT)

  if (ready) {
    console.log(`✅ LibreTranslate listo en http://127.0.0.1:${LT_PORT}`)
    return true
  } else {
    console.error('❌ LibreTranslate no respondió a tiempo.')
    console.error('   Ejecuta primero: pnpm run translator:setup')
    stopTranslator()
    return false
  }
}

/**
 * Detiene el proceso de LibreTranslate.
 */
export function stopTranslator() {
  if (ltProcess) {
    console.log('🛑 Deteniendo LibreTranslate...')
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(ltProcess.pid), '/f', '/t'], { stdio: 'ignore', shell: true })
      } else {
        ltProcess.kill('SIGTERM')
      }
    } catch {
      // ignore
    }
    ltProcess = null
  }
}

// Si se ejecuta directamente (no como import), arranca el servidor
const isMain = process.argv[1] && (
  process.argv[1].endsWith('start-translator.mjs') ||
  process.argv[1].endsWith('start-translator')
)

if (isMain) {
  process.on('exit', stopTranslator)
  process.on('SIGINT', () => { stopTranslator(); process.exit() })
  process.on('SIGTERM', () => { stopTranslator(); process.exit() })

  startTranslator().then((ok) => {
    if (!ok) process.exit(1)
    console.log('   (Presiona Ctrl+C para detener)')
  })
}
