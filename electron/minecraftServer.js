// electron/minecraftServer.js
const { ipcMain, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const http = require('http')

const GAME_DIR = path.join(__dirname, '..', 'apps', 'react-minecraft')
const GAME_PORT = 3231
let gameProcess = null
let gameRunning = false

function getGameUrl() {
  return `http://localhost:${GAME_PORT}`
}

function depsInstalled() {
  return fs.existsSync(path.join(GAME_DIR, 'node_modules'))
}

function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('El servidor del juego no respondió a tiempo'))
          return
        }
        setTimeout(attempt, 800)
      })
      req.setTimeout(5000, () => {
        req.destroy()
        setTimeout(attempt, 800)
      })
    }
    attempt()
  })
}

function sendStatus(mainWindow, payload) {
  mainWindow?.webContents.send('minecraft:status', payload)
}

function sendOutput(mainWindow, stream, chunk) {
  mainWindow?.webContents.send('minecraft:output', { stream, chunk })
}

async function installDeps(win) {
  if (depsInstalled()) {
    return { ok: true, installed: true }
  }
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['install'], {
      cwd: GAME_DIR,
      shell: process.platform === 'win32',
      env: { ...process.env, NODE_ENV: 'development' },
    })
    child.stdout.on('data', (d) => sendOutput(win, 'stdout', d.toString()))
    child.stderr.on('data', (d) => sendOutput(win, 'stderr', d.toString()))
    child.on('close', (code) => resolve(code === 0 ? { ok: true, installed: true } : { ok: false, error: `pnpm install failed (${code})` }))
    child.on('error', (err) => resolve({ ok: false, error: err.message }))
  })
}

function registerMinecraftServerIPC(mainWindow) {
  const win = () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : BrowserWindow.getFocusedWindow())

  ipcMain.handle('minecraft:install-deps', async () => {
    return installDeps(win())
  })

  ipcMain.handle('minecraft:start', async () => {
    if (gameRunning && gameProcess) {
      return { ok: true, url: getGameUrl(), alreadyRunning: true }
    }

    if (!depsInstalled()) {
      const installResult = await installDeps(win())
      if (!installResult.ok) {
        return { ok: false, error: `Por favor instala dependencias primero. ${installResult.error || ''}` }
      }
    }

    return new Promise((resolve) => {
      const child = spawn('pnpm', ['start'], {
        cwd: GAME_DIR,
        shell: process.platform === 'win32',
        env: { ...process.env, PORT: String(GAME_PORT), BROWSER: 'none', NODE_ENV: 'development' },
      })

      gameProcess = child
      gameRunning = true

      child.stdout.on('data', (d) => {
        sendOutput(win(), 'stdout', d.toString())
        const chunk = d.toString().toLowerCase()
        if (chunk.includes('compiled successfully') || chunk.includes('available on')) {
          sendStatus(win(), { running: true, url: getGameUrl(), message: 'El servidor del juego está listo.' })
        }
      })
      child.stderr.on('data', (d) => sendOutput(win(), 'stderr', d.toString()))

      child.on('close', (code) => {
        gameRunning = false
        if (gameProcess === child) gameProcess = null
        sendStatus(win(), { running: false, exited: true, code })
      })
      child.on('error', (err) => {
        gameRunning = false
        if (gameProcess === child) gameProcess = null
        sendStatus(win(), { running: false, error: err.message })
      })

      // Confirm the server eventually accepts connections, then resolve.
      waitForServer(getGameUrl())
        .then(() => resolve({ ok: true, url: getGameUrl() }))
        .catch((err) => resolve({ ok: false, error: err.message }))
    })
  })

  ipcMain.handle('minecraft:status', () => {
    return { running: gameRunning, url: getGameUrl() }
  })

  ipcMain.handle('minecraft:stop', () => {
    if (!gameProcess) return { ok: true, alreadyStopped: true }
    const pid = gameProcess.pid
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'])
    } else {
      gameProcess.kill('SIGTERM')
    }
    gameProcess = null
    gameRunning = false
    return { ok: true }
  })
}

module.exports = {
  registerMinecraftServerIPC,
  getGameDir: () => GAME_DIR,
  getGameUrl,
}