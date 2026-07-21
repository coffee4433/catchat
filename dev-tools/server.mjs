import { spawn, execSync } from 'child_process'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { WebSocketServer } from 'ws'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEVTOOLS = __dirname

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
      { id: 'build-msi',     label: 'Build MSI Installer',     icon: '📦', cmd: 'powershell', args: ['-ExecutionPolicy','Bypass','-File',join(DEVTOOLS,'installer','build-installer.ps1')],  cwd: DEVTOOLS },
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
      { id: 'env-info',      label: 'Show Environment Info',   icon: 'ℹ️', cmd: 'cmd',  args: ['/c',`echo Node: & node --version & echo. & echo PNPM: & pnpm --version & echo. & echo OS: & ver`], cwd: ROOT },
    ],
  },
]

const allCommands = GROUPS.flatMap((g) => g.commands)

/* ─── HTTP + WebSocket server ─────────────────────────────────── */

const hasDist = existsSync(join(__dirname, 'dist', 'index.html'))

let viteProcess = null
if (!hasDist) {
  console.log('  ⚡ Starting Vite dev server...')
  viteProcess = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '3333'], {
    cwd: __dirname, shell: true, stdio: 'inherit',
  })
}

const httpServer = createServer((req, res) => {
  if (!hasDist) {
    res.writeHead(302, { Location: 'http://localhost:3333' })
    res.end()
    return
  }

  const dist = join(__dirname, 'dist')
  let filePath = join(dist, req.url === '/' ? 'index.html' : req.url)
  if (!existsSync(filePath)) filePath = join(dist, 'index.html')

  const extMap = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
    '.json': 'application/json',
  }
  const ext = filePath.slice(filePath.lastIndexOf('.'))
  const contentType = extMap[ext] || 'application/octet-stream'

  try {
    const content = readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

/* ─── Terminal sessions ────────────────────────────────────────── */

const terminals = {}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'groups', groups: GROUPS }))

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }

    if (msg.type === 'run') {
      const cmd = allCommands.find((c) => c.id === msg.commandId)
      if (!cmd) return
      const tid = msg.terminalId
      if (terminals[tid]) {
        terminals[tid].child.kill('SIGTERM')
        delete terminals[tid]
      }

      ws.send(JSON.stringify({ type: 'start', terminalId: tid, commandId: cmd.id, label: cmd.label, icon: cmd.icon }))

      const needsShell = cmd.cmd === 'cmd' || cmd.cmd === 'powershell'
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
      if (t) { t.child.kill('SIGTERM'); delete terminals[msg.terminalId] }
    }

    if (msg.type === 'stdin') {
      const t = terminals[msg.terminalId]
      if (t && t.child.stdin.writable) t.child.stdin.write(msg.data)
    }
  })

  ws.on('close', () => {
    for (const [tid, t] of Object.entries(terminals)) {
      if (t.ws === ws) { t.child.kill('SIGTERM'); delete terminals[tid] }
    }
  })
})

/* ─── Start ───────────────────────────────────────────────────── */

const PORT = 4444
httpServer.listen(PORT, () => {
  console.log(`\n  ┌──────────────────────────────────────┐`)
  console.log(`  │      🐱 CatChat Dev Tools v0.2      │`)
  console.log(`  └──────────────────────────────────────┘`)
  console.log(`  ${hasDist ? `  🔧 Server       → http://localhost:${PORT}` : `  ⚡ Vite Dev      → http://localhost:3333`}`)
  console.log(`  📡 WebSocket     → ws://127.0.0.1:${PORT}/ws`)
  console.log(`  ${GROUPS.length} command groups — ${allCommands.length} commands total`)
  console.log(`  Press Ctrl+C to stop\n`)
})

function cleanup() {
  for (const t of Object.values(terminals)) t.child.kill('SIGTERM')
  if (viteProcess) try { viteProcess.kill() } catch {}
  process.exit()
}
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
