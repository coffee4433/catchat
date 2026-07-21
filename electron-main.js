const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { registerCommandRunnerIPC } = require('./electron/commandRunner')

// Load environment variables from a .env file packaged with the app (if present).
// This helps the embedded Next server find `DATABASE_URL` and other runtime vars.
try {
  const exeDir = path.dirname(app.getPath('exe'))
  const possiblePaths = [
    path.join(exeDir, '.env.production'),
    path.join(exeDir, '.env.local'),
    path.join(exeDir, '.env'),
    path.join(exeDir, '..', '..', '.env.local'),
    path.join(exeDir, '..', '..', '.env.production'),
    path.join(exeDir, '..', '..', '.env'),
    path.join(process.resourcesPath || __dirname, 'app', '.env.production'),
    path.join(process.resourcesPath || __dirname, 'app', '.env.local'),
    path.join(process.resourcesPath || __dirname, 'app', '.env'),
    path.join(process.resourcesPath || __dirname, 'app.asar.unpacked', '.env.local'),
    path.join(process.resourcesPath || __dirname, 'app.asar.unpacked', '.env'),
    path.join(__dirname, '.env.production'),
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env')
  ]

  const dotenvPath = possiblePaths.find(p => fs.existsSync(p))

  if (dotenvPath) {
    require('dotenv').config({ path: dotenvPath })
  }
} catch (e) {
  // ignore failures to load env file
}

const next = require('next')
const Module = require('module')

try {
  const asarUnpackedNodeModules = path.join(process.resourcesPath || __dirname, 'app.asar.unpacked', 'node_modules')
  if (fs.existsSync(asarUnpackedNodeModules)) {
    process.env.NODE_PATH = (process.env.NODE_PATH ? process.env.NODE_PATH + path.delimiter : '') + asarUnpackedNodeModules
    Module._initPaths()
  }
} catch (e) {
  // ignore
}

let mainWindow
let splashWindow
let nextServer
let libreTranslateProcess = null

const LT_PORT = 5000

function getTranslatorConfig() {
  const isPackaged = app.isPackaged
  const baseDir = isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'build')
    : path.join(__dirname, 'build')

  const embeddedExe = process.platform === 'win32'
    ? path.join(baseDir, 'translator-runtime', 'Scripts', 'libretranslate.exe')
    : path.join(baseDir, 'translator-runtime', 'bin', 'libretranslate')

  const embeddedModels = path.join(baseDir, 'argos-packages')

  // Check if embedded libretranslate executable exists
  if (fs.existsSync(embeddedExe)) {
    return {
      executable: embeddedExe,
      modelsDir: embeddedModels,
      isEmbedded: true,
      useModule: false
    }
  }

  // Fallback to local dev virtual environment
  const venvExe = process.platform === 'win32'
    ? path.join(__dirname, 'translator-env', 'Scripts', 'libretranslate.exe')
    : path.join(__dirname, 'translator-env', 'bin', 'libretranslate')

  if (fs.existsSync(venvExe)) {
    return {
      executable: venvExe,
      modelsDir: null,
      isEmbedded: false,
      useModule: false
    }
  }

  // Fallback to system python with module
  return {
    executable: process.platform === 'win32' ? 'python' : 'python3',
    modelsDir: null,
    isEmbedded: false,
    useModule: true
  }
}

/**
 * Inicia LibreTranslate como proceso hijo (en,es).
 * Si el puerto ya está en uso, asume que ya está corriendo.
 */
async function startLibreTranslate() {
  // Comprobar si el puerto ya está en uso
  const net = require('net')
  const inUse = await new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => { server.close(); resolve(false) })
    server.listen(LT_PORT, '127.0.0.1')
  })

  if (inUse) {
    console.log(`[LibreTranslate] Ya detectado en puerto ${LT_PORT}`)
    return
  }

  const config = getTranslatorConfig()
  console.log(`[LibreTranslate] Iniciando en puerto ${LT_PORT} (en,es)...`)
  console.log(`   Ejecutable: ${config.executable}`)
  if (config.modelsDir && fs.existsSync(config.modelsDir)) {
    console.log(`   Modelos: ${config.modelsDir}`)
  }

  let runArgs
  let runCommand
  
  if (config.useModule) {
    // Use python -m libretranslate for system python
    runCommand = config.executable
    runArgs = ['-m', 'libretranslate', '--load-only', 'en,es', '--host', '127.0.0.1', '--port', String(LT_PORT)]
  } else {
    // Use libretranslate.exe directly
    runCommand = config.executable
    runArgs = ['--load-only', 'en,es', '--host', '127.0.0.1', '--port', String(LT_PORT)]
  }
  
  const runEnv = { ...process.env }
  
  // Only set ARGOS_PACKAGES_DIR if the directory exists and has models
  if (config.modelsDir && fs.existsSync(config.modelsDir)) {
    const files = fs.readdirSync(config.modelsDir)
    if (files.length > 0) {
      runEnv.ARGOS_PACKAGES_DIR = config.modelsDir
      console.log(`   Usando modelos embebidos (${files.length} paquetes)`)
    }
  }

  const { spawn } = require('child_process')
  libreTranslateProcess = spawn(
    runCommand,
    runArgs,
    { stdio: ['ignore', 'pipe', 'pipe'], shell: false, detached: false, env: runEnv }
  )

  libreTranslateProcess.stdout.on('data', (d) => console.log(`[LibreTranslate] ${d.toString().trim()}`))
  libreTranslateProcess.stderr.on('data', (d) => console.log(`[LibreTranslate] ${d.toString().trim()}`))
  libreTranslateProcess.on('error', (err) => {
    console.error('[LibreTranslate] Error:', err.message)
    libreTranslateProcess = null
  })
  libreTranslateProcess.on('close', (code) => { 
    console.log(`[LibreTranslate] Proceso terminado con código ${code}`)
    libreTranslateProcess = null 
  })
}

function stopLibreTranslate() {
  if (libreTranslateProcess) {
    console.log('[LibreTranslate] Deteniendo...')
    try {
      if (process.platform === 'win32') {
        require('child_process').spawnSync('taskkill', ['/pid', String(libreTranslateProcess.pid), '/f', '/t'], { stdio: 'ignore', shell: true })
      } else {
        libreTranslateProcess.kill('SIGTERM')
      }
    } catch {}
    libreTranslateProcess = null
  }
}

function getAppDir() {
  if (app.isPackaged) {
    return app.getAppPath()
  }

  return __dirname
}

function createSplashWindow() {
  const appDir = getAppDir()

  splashWindow = new BrowserWindow({
    width: 320,
    height: 350,
    frame: false, // Sin bordes de Windows
    resizable: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#1e1f22',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  splashWindow.loadFile(path.join(appDir, 'build', 'splash.html')).catch(err => {
    console.error('Error loading splash.html:', err)
  })
  splashWindow.on('closed', () => {
    splashWindow = null
  })
}

function createWindow() {
  const appDir = getAppDir()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "CatChat",
    autoHideMenuBar: true, // Oculta la barra de menú para que parezca una app nativa estilo Discord
    show: false, // Inicialmente invisible para que cargue por detrás del splash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  // Register command runner IPC handlers
  registerCommandRunnerIPC(mainWindow)

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('Electron failed to load URL:', validatedURL, errorCode, errorDescription)
  })

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Electron console:', level, message, line, sourceId)
  })

  // Cuando la app web haya cargado y esté lista para mostrarse
  mainWindow.once('ready-to-show', () => {
    // Damos un pequeño retraso (1.2 segundos) para que la animación del splash se luzca
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close()
      }
      mainWindow.show()
      mainWindow.focus()
    }, 1200)
  })

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  // Carga la URL del servidor local de desarrollo o la URL de producción
  const startUrl = process.env.ELECTRON_START_URL || process.env.BETTER_AUTH_URL || 'http://127.0.0.1:3000'
  mainWindow.loadURL(startUrl)
}

async function startNextServer() {
  if (process.env.ELECTRON_START_URL) {
    return
  }

  const appDir = getAppDir()
  process.env.NODE_ENV = process.env.NODE_ENV || 'production'
  const nextApp = next({ dev: false, dir: appDir })
  const handle = nextApp.getRequestHandler()

  await nextApp.prepare()

  nextServer = http.createServer((req, res) => {
    return handle(req, res)
  })

  return new Promise((resolve, reject) => {
    nextServer.once('error', (err) => {
      reject(err)
    })
    nextServer.listen(3000, '127.0.0.1', () => {
      resolve()
    })
  })
}

app.on('ready', async () => {
  createSplashWindow()
  try {
    // Iniciar LibreTranslate en paralelo (no bloqueante)
    startLibreTranslate().catch((err) => {
      console.warn('[LibreTranslate] No se pudo iniciar:', err.message)
    })
    await startNextServer()
    createWindow()
  } catch (error) {
    console.error('Failed to start Next.js server:', error)
    const { dialog } = require('electron')
    if (splashWindow) {
      splashWindow.close()
    }
    dialog.showErrorBox(
      'Error de inicio',
      `No se pudo iniciar el servidor embebido de Next.js.\n\nEsto suele suceder si el puerto 3000 ya está siendo utilizado por otra aplicación (como tu servidor de desarrollo local).\n\nDetalles: ${error.message}`
    )
    app.quit()
  }
})

app.on('window-all-closed', function () {
  stopLibreTranslate()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopLibreTranslate()
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
