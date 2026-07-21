const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const os = require('os')

const CONFIG_PATH = path.join(os.homedir(), '.catchat-release-config.json')

function loadConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    if (!cfg.ghToken) cfg.ghToken = ''
    return cfg
  }
  catch { return { projectPath: '', ghToken: '' } }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
}

function findPackageJson(dir) {
  const p = path.join(dir, 'package.json')
  return fs.existsSync(p) ? p : null
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 580,
    resizable: false,
    frame: false,
    transparent: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))
  mainWindow.on('closed', () => { mainWindow = null })
}

ipcMain.handle('get:version', () => {
  const cfg = loadConfig()
  if (!cfg.projectPath) return null
  const pkgPath = findPackageJson(cfg.projectPath)
  if (!pkgPath) return null
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
})

ipcMain.handle('select:project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select CatChat project folder',
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths.length) return null
  const dir = result.filePaths[0]
  const pkgPath = findPackageJson(dir)
  if (!pkgPath) return { error: 'No package.json found in selected folder' }
  const cfg = { ...loadConfig(), projectPath: dir }
  saveConfig(cfg)
  const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
  return { path: dir, version }
})

ipcMain.handle('save:token', async (_event, token) => {
  const cfg = { ...loadConfig(), ghToken: token }
  saveConfig(cfg)
  return true
})

ipcMain.handle('get:config', () => {
  const cfg = loadConfig()
  return { projectPath: cfg.projectPath || '', hasToken: !!cfg.ghToken }
})

ipcMain.handle('release', async (_event, version, notes) => {
  const cfg = loadConfig()
  if (!cfg.projectPath) throw new Error('No project selected')

  const releaseScript = path.join(cfg.projectPath, 'scripts', 'release.cjs')

  return new Promise((resolve, reject) => {
    const child = spawn('node', [releaseScript], {
      cwd: cfg.projectPath,
      env: { ...process.env, RELEASE_VERSION: version, RELEASE_NOTES: notes || '', GH_TOKEN: cfg.ghToken || process.env.GH_TOKEN || '' },
      shell: true,
    })

    child.stdout.on('data', (d) => {
      mainWindow?.webContents.send('release:output', d.toString())
    })

    child.stderr.on('data', (d) => {
      mainWindow?.webContents.send('release:output', d.toString())
    })

    child.on('close', (code) => {
      const success = code === 0
      mainWindow?.webContents.send('release:output', success ? '\n✓ Completed\n' : '\n✕ Failed\n')
      mainWindow?.webContents.send('release:done', success)
      resolve({ success })
    })

    child.on('error', (err) => {
      mainWindow?.webContents.send('release:output', '\n✕ Error: ' + err.message + '\n')
      mainWindow?.webContents.send('release:done', false)
      reject(err)
    })
  })
})

app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit())
