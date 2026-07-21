const crypto = require('crypto')
const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const { createServer } = require('http')
const { readFileSync, existsSync, writeFileSync, mkdirSync } = require('fs')
const { join, extname, dirname } = require('path')
const { homedir } = require('os')

const DEVTOOLS = __dirname
const hasDist = existsSync(join(DEVTOOLS, 'dist', 'index.html'))

/* ─── Detect project root ─────────────────────────────────────── */

const CONFIG_DIR = join(process.env.APPDATA || join(homedir(), '.config'), 'CatChat Dev Tools')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

function hasProjectScripts(dir) {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    return pkg.scripts && pkg.scripts['desktop:build']
  } catch { return false }
}

function findProjectRoot() {
  if (hasProjectScripts(join(DEVTOOLS, '..'))) return join(DEVTOOLS, '..')
  if (process.env.CHATCAT_PROJECT_ROOT && hasProjectScripts(process.env.CHATCAT_PROJECT_ROOT)) return process.env.CHATCAT_PROJECT_ROOT
  try {
    if (existsSync(CONFIG_PATH)) {
      const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
      if (cfg.projectRoot && hasProjectScripts(cfg.projectRoot)) return cfg.projectRoot
    }
  } catch {}
  return DEVTOOLS
}

const ROOT = findProjectRoot()

/* ─── Command catalog ─────────────────────────────────────────── */

const GROUPS = [
  {
    id: 'installer',
    label: 'MSI Installer',
    icon: '📦',
    commands: [
      { id: 'build-msi',     label: 'Build MSI Installer',     icon: '📦', cmd: 'pnpm', args: ['run','desktop:build'],  cwd: ROOT },
    ],
  },
  {
    id: 'dev',
    label: 'Development',
    icon: '⚡',
    commands: [
      { id: 'dev',           label: 'Dev Server + Translator', icon: '▶',  cmd: 'pnpm', args: ['run','dev'],           cwd: ROOT },
      { id: 'dev-next',      label: 'Dev Server (next only)',  icon: '▶',  cmd: 'pnpm', args: ['run','dev:next'],      cwd: ROOT },
      { id: 'translator-t',  label: 'Translator Start',        icon: '🌐', cmd: 'pnpm', args: ['run','translator:start'], cwd: ROOT },
    ],
  },
  {
    id: 'build',
    label: 'Build & Package',
    icon: '🔨',
    commands: [
      { id: 'build',         label: 'Build (Next.js)',         icon: '📦', cmd: 'pnpm', args: ['run','build'],          cwd: ROOT },
      { id: 'build-webpack', label: 'Build (Webpack)',         icon: '📦', cmd: 'pnpm', args: ['run','build:webpack'],  cwd: ROOT },
      { id: 'translator-b',  label: 'Build Portable Translator',icon: '📦', cmd: 'pnpm', args: ['run','translator:build'],cwd: ROOT },
      { id: 'desktop-build', label: 'Build Desktop App',       icon: '🖥', cmd: 'pnpm', args: ['run','desktop:build'],  cwd: ROOT },
    ],
  },
  {
    id: 'setup',
    label: 'Setup & Database',
    icon: '🔧',
    commands: [
      { id: 'translator-s',  label: 'Translator Setup',        icon: '🌐', cmd: 'pnpm', args: ['run','translator:setup'],    cwd: ROOT },
      { id: 'migrate',       label: 'Run Migrations',          icon: '🗄',  cmd: 'pnpm', args: ['run','migrate'],             cwd: ROOT },
      { id: 'db-verify',     label: 'Verify Database',         icon: '🔍', cmd: 'pnpm', args: ['run','db:verify'],           cwd: ROOT },
      { id: 'supabase-setup',label: 'Supabase Setup',          icon: '☁️', cmd: 'pnpm', args: ['run','supabase:setup'],      cwd: ROOT },
      { id: 'supabase-test', label: 'Test Supabase Connection',icon: '🔌', cmd: 'pnpm', args: ['run','supabase:test'],       cwd: ROOT },
      { id: 'supabase-table',label: 'Create Supabase Table',   icon: '📋', cmd: 'pnpm', args: ['run','supabase:create-table'],cwd: ROOT },
      { id: 'migrate-supa',  label: 'Migrate to Supabase',     icon: '☁️', cmd: 'pnpm', args: ['run','migrate:to-supabase'],  cwd: ROOT },
    ],
  },
  {
    id: 'quality',
    label: 'Quality & Lint',
    icon: '📋',
    commands: [
      { id: 'lint',          label: 'Lint',                    icon: '🧹', cmd: 'pnpm', args: ['run','lint'],               cwd: ROOT },
    ],
  },
  {
    id: 'desktop',
    label: 'Desktop (Electron)',
    icon: '🖥',
    commands: [
      { id: 'desktop-dev',    label: 'Desktop Dev',             icon: '▶',  cmd: 'pnpm', args: ['run','desktop:dev'],       cwd: ROOT },
      { id: 'desktop-hot',    label: 'Desktop Dev (Hot Reload)',icon: '🔥', cmd: 'pnpm', args: ['run','desktop:dev:hot'],   cwd: ROOT },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: '🔧',
    commands: [
      { id: 'clear-cache',   label: 'Clear Next.js Cache',     icon: '🗑',  cmd: 'cmd', args: ['/c',`if exist "${ROOT}\\.next" rmdir /s /q "${ROOT}\\.next" & echo Cache cleared`],        cwd: ROOT },
      { id: 'kill-5000',     label: 'Kill Port 5000',          icon: '🔪', cmd: 'cmd', args: ['/c',`for /f "tokens=5" %a in ('netstat -ano ^| find ":5000" ^| find "LISTENING"') do taskkill /f /pid %a 2>nul & echo Port 5000 freed`], cwd: ROOT },
      { id: 'kill-3000',     label: 'Kill Port 3000',          icon: '🔪', cmd: 'cmd', args: ['/c',`for /f "tokens=5" %a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %a 2>nul & echo Port 3000 freed`], cwd: ROOT },
      { id: 'pnpm-install',  label: 'pnpm Install',            icon: '📥', cmd: 'pnpm', args: ['install'],                  cwd: ROOT },
      { id: 'pnpm-update',   label: 'pnpm Update',             icon: '🔄', cmd: 'pnpm', args: ['update'],                   cwd: ROOT },
      { id: 'git-status',    label: 'Git Status',              icon: '📂', cmd: 'git',  args: ['status', '--short'],         cwd: ROOT },
      { id: 'git-log',       label: 'Git Log (last 10)',       icon: '📜', cmd: 'git',  args: ['log', '--oneline', '-10'],   cwd: ROOT },
      { id: 'env-info',      label: 'Show Environment Info',   icon: 'ℹ️', cmd: 'cmd',  args: ['/c',`echo Node: & node --version & echo. & PNPM: & pnpm --version & echo. & OS: & ver`], cwd: ROOT },
    ],
  },
]

const allCommands = GROUPS.flatMap((g) => g.commands)

/* ─── Minimal WebSocket server (no ws module dependency) ──────── */

const WSCodes = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

const WSGUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

function acceptKey(key) {
  const sha1 = crypto.createHash('sha1')
  sha1.update(key + WSGUID)
  return sha1.digest('base64')
}

function createWebSocketServer(httpServer, path, onconnection) {
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url !== path) {
      socket.destroy()
      return
    }

    const key = req.headers['sec-websocket-key']
    if (!key) {
      socket.destroy()
      return
    }

    const accept = acceptKey(key)
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n')

    socket.write(headers)

    const ws = createWSConnection(socket)

    if (onconnection) onconnection(ws)
  })
}

function createWSConnection(socket) {
  const state = { readyState: WSCodes.OPEN }
  const listeners = {}

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(fn)
  }

  function emit(event, ...args) {
    const fns = listeners[event] || []
    for (const fn of fns) fn(...args)
  }

  let buffer = Buffer.alloc(0)

  socket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data])

    while (buffer.length >= 2) {
      const firstByte = buffer[0]
      const secondByte = buffer[1]
      const opcode = firstByte & 0x0F
      const masked = (secondByte & 0x80) !== 0
      let payloadLen = secondByte & 0x7F
      let offset = 2

      if (payloadLen === 126) {
        if (buffer.length < 4) return
        payloadLen = buffer.readUInt16BE(2)
        offset = 4
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return
        payloadLen = Number(buffer.readBigUInt64BE(2))
        offset = 10
      }

      const totalLen = offset + (masked ? 4 : 0) + payloadLen
      if (buffer.length < totalLen) return

      const payload = Buffer.alloc(payloadLen)
      if (masked) {
        const mask = buffer.slice(offset, offset + 4)
        for (let i = 0; i < payloadLen; i++) {
          payload[i] = buffer[offset + 4 + i] ^ mask[i % 4]
        }
      } else {
        buffer.copy(payload, 0, offset, offset + payloadLen)
      }

      buffer = buffer.slice(totalLen)

      if (opcode === 0x08) {
        emit('close')
        state.readyState = WSCodes.CLOSED
        try { socket.end() } catch {}
        return
      }

      if (opcode === 0x09) {
        sendPong()
        continue
      }

      if (opcode === 0x01 || opcode === 0x02) {
        const text = payload.toString('utf8')
        emit('message', text)
      }
    }
  })

  function send(data) {
    if (state.readyState !== WSCodes.OPEN) return
    const payload = Buffer.from(data, 'utf8')
    const len = payload.length
    let header

    if (len < 126) {
      header = Buffer.alloc(2)
      header[0] = 0x81
      header[1] = len
    } else if (len < 65536) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 126
      header.writeUInt16BE(len, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 127
      header.writeBigUInt64BE(BigInt(len), 2)
    }

    try { socket.write(Buffer.concat([header, payload])) } catch {}
  }

  function sendPong() {
    const header = Buffer.alloc(2)
    header[0] = 0x8A
    header[1] = 0
    try { socket.write(header) } catch {}
  }

  function close() {
    if (state.readyState === WSCodes.OPEN) {
      state.readyState = WSCodes.CLOSING
      const header = Buffer.alloc(2)
      header[0] = 0x88
      header[1] = 0
      try { socket.write(header); socket.end() } catch {}
      state.readyState = WSCodes.CLOSED
      emit('close')
    }
  }

  socket.on('close', () => {
    if (state.readyState === WSCodes.OPEN) {
      state.readyState = WSCodes.CLOSED
      emit('close')
    }
  })

  socket.on('error', () => {})

  return { on, send, close, get readyState() { return state.readyState } }
}

/* ─── HTTP server ─────────────────────────────────────────────── */

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json',
}

function serveFile(res, filePath) {
  try {
    const content = readFileSync(filePath)
    const ext = extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}

/* ─── Terminal sessions ────────────────────────────────────────── */

const terminals = {}

function handleWebSocket(ws) {
  ws.send(JSON.stringify({ type: 'groups', groups: GROUPS }))

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'run') {
      const cmd = allCommands.find((c) => c.id === msg.commandId)
      if (!cmd) return
      const tid = msg.terminalId
      if (terminals[tid]) {
        terminals[tid].child.kill()
        delete terminals[tid]
      }

      ws.send(JSON.stringify({ type: 'start', terminalId: tid, commandId: cmd.id, label: cmd.label, icon: cmd.icon }))

      const needsShell = cmd.cmd === 'cmd'
      const child = spawn(cmd.cmd, cmd.args, {
        cwd: cmd.cwd, shell: needsShell, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1', TERM: 'xterm-256color' },
      })

      terminals[tid] = { child, ws }

      child.stdout.on('data', (d) => {
        if (terminals[tid]) ws.send(JSON.stringify({ type: 'output', terminalId: tid, data: d.toString() }))
      })
      child.stderr.on('data', (d) => {
        if (terminals[tid]) ws.send(JSON.stringify({ type: 'output', terminalId: tid, data: d.toString() }))
      })
      child.on('close', (code) => {
        delete terminals[tid]
        try { ws.send(JSON.stringify({ type: 'exit', terminalId: tid, code })) } catch {}
      })
    }

    if (msg.type === 'kill') {
      const t = terminals[msg.terminalId]
      if (t) { t.child.kill(); delete terminals[msg.terminalId] }
    }

    if (msg.type === 'stdin') {
      const t = terminals[msg.terminalId]
      if (t && t.child.stdin.writable) t.child.stdin.write(msg.data)
    }
  })

  ws.on('close', () => {
    for (const [tid, t] of Object.entries(terminals)) {
      if (t.ws === ws) { t.child.kill(); delete terminals[tid] }
    }
  })
}

/* ─── Start server ────────────────────────────────────────────── */

const PORT = 4444

function startServer() {
  return new Promise((resolve, reject) => {
    const httpServer = createServer((req, res) => {
      if (!hasDist) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`<!DOCTYPE html><html><body>
          <h1>CatChat Dev Tools</h1>
          <p>Frontend not built. Run <code>pnpm run build</code> in the dev-tools directory.</p>
        </body></html>`)
        return
      }

      const dist = join(DEVTOOLS, 'dist')
      let filePath = join(dist, req.url === '/' ? 'index.html' : req.url)
      if (!existsSync(filePath)) filePath = join(dist, 'index.html')
      serveFile(res, filePath)
    })

    createWebSocketServer(httpServer, '/ws', handleWebSocket)

    httpServer.listen(PORT, '127.0.0.1', () => {
      console.log(`  ┌──────────────────────────────────────┐`)
      console.log(`  │      🐱 CatChat Dev Tools v0.2      │`)
      console.log(`  └──────────────────────────────────────┘`)
      console.log(`  🔧 Server       → http://localhost:${PORT}`)
      console.log(`  📡 WebSocket     → ws://127.0.0.1:${PORT}/ws`)
      console.log(`  ${GROUPS.length} command groups — ${allCommands.length} commands total`)
      resolve(httpServer)
    })

    httpServer.on('error', reject)
  })
}

/* ─── Electron window ─────────────────────────────────────────── */

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'CatChat Dev Tools',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0d0e14',
    show: false,
  })

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load URL:', errorDescription)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

/* ─── Entry point ─────────────────────────────────────────────── */

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err.message)
})

app.whenReady().then(async () => {
  console.log('App ready')
  try {
    await startServer()
    createWindow()
  } catch (err) {
    console.error('Failed to start:', err.message)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  for (const t of Object.values(terminals)) t.child.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  for (const t of Object.values(terminals)) t.child.kill()
})
