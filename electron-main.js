const { app, BrowserWindow, ipcMain, desktopCapturer, session } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { autoUpdater } = require('electron-updater')
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
let pendingDisplayMediaCallback = null
let pendingScreenSources = []

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://catchat-one.vercel.app/updates/',
  })

  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return result?.updateInfo || null
    } catch (err) {
      console.error('[AutoUpdater] Check failed:', err.message)
      return null
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      console.error('[AutoUpdater] Download failed:', err.message)
      throw err
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('app:version', () => app.getVersion())

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', info)
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:download-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:downloaded', info)
  })

  autoUpdater.on('error', (error) => {
    const msg = error?.message || ''
    if (msg.includes('No published versions') || msg.includes('404') || msg.includes('ENOENT')) {
      console.log('[AutoUpdater] No updates available')
      return
    }
    mainWindow?.webContents.send('update:error', error.message)
  })
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

  // Auto-grant media permissions for local origin
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const allowedPermissions = ['media', 'mediaKeySystem']
      callback(allowedPermissions.includes(permission))
    },
  )

  // Set up display media request handler for screen sharing
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        pendingScreenSources = sources
        pendingDisplayMediaCallback = callback
        mainWindow.webContents.send('screen-share:sources',
          sources.map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() })))
      }).catch(() => {
        callback(undefined)
      })
    },
    { useSystemPicker: false },
  )

  ipcMain.handle('screen-share:select', (_e, sourceId) => {
    if (pendingDisplayMediaCallback) {
      if (sourceId) {
        const source = pendingScreenSources.find(s => s.id === sourceId)
        pendingDisplayMediaCallback(source ? { video: source } : undefined)
      } else {
        pendingDisplayMediaCallback(undefined)
      }
      pendingDisplayMediaCallback = null
      pendingScreenSources = []
    }
  })

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
    setupAutoUpdater()
    await startNextServer()
    createWindow()
    function checkUpdate() {
      try {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.log('[AutoUpdater] Check skipped:', err?.message || err)
        })
      } catch (err) {
        console.log('[AutoUpdater] Not configured:', err?.message || err)
      }
    }

    setTimeout(checkUpdate, 6000)
    setInterval(checkUpdate, 10 * 1000)
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
