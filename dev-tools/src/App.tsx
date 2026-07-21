import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

type CmdDef = { id: string; label: string; icon: string; cmd: string; args: string[]; cwd: string }
type Group = { id: string; label: string; icon: string; commands: CmdDef[] }
type ServerMsg =
  | { type: 'groups'; groups: Group[] }
  | { type: 'start'; terminalId: string; commandId: string; label: string; icon: string }
  | { type: 'output'; terminalId: string; data: string }
  | { type: 'exit'; terminalId: string; code: number | null }

function uid() { return Math.random().toString(36).slice(2, 10) }
function wsUrl() {
  const p = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${p}//${location.host}/ws`
}

const PAGE_ICONS: Record<string, string> = {
  installer: '📦', dev: '⚡', build: '🔨', setup: '🔧', quality: '📋', desktop: '🖥', utilities: '🔧',
}

export function App() {
  const [groups, setGroups] = useState<Group[]>([])
  const [activePage, setActivePage] = useState('installer')
  const [runningCmds, setRunningCmds] = useState<Record<string, { commandId: string; label: string; icon: string; running: boolean; exitCode: number | null }>>({})
  const [outputBuf, setOutputBuf] = useState<Record<string, string[]>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const termRefs = useRef<Record<string, { term: Terminal; fit: FitAddon }>>({})
  const termContainers = useRef<Record<string, HTMLDivElement | null>>({})
  const reconnectRef = useRef(0)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(wsUrl())
    wsRef.current = ws

    ws.onopen = () => { reconnectRef.current = 0 }

    ws.onmessage = (event) => {
      try {
        const msg: ServerMsg = JSON.parse(event.data)
        if (msg.type === 'groups') { setGroups(msg.groups); return }

        if (msg.type === 'start') {
          setRunningCmds((prev) => ({ ...prev, [msg.terminalId]: { commandId: msg.commandId, label: msg.label, icon: msg.icon, running: true, exitCode: null } }))
          setTimeout(() => {
            const buf = outputBufRef.current[msg.terminalId]
            if (buf && termRefs.current[msg.terminalId]) {
              buf.forEach((l) => termRefs.current[msg.terminalId].term.writeln(l))
              delete outputBufRef.current[msg.terminalId]
            }
          }, 300)
          return
        }

        if (msg.type === 'output') {
          const t = termRefs.current[msg.terminalId]
          if (t) {
            t.term.write(msg.data.replace(/\n/g, '\r\n'))
          } else {
            if (!outputBufRef.current[msg.terminalId]) outputBufRef.current[msg.terminalId] = []
            outputBufRef.current[msg.terminalId].push(msg.data)
          }
          return
        }

        if (msg.type === 'exit') {
          setRunningCmds((prev) => ({ ...prev, [msg.terminalId]: { ...prev[msg.terminalId], running: false, exitCode: msg.code } }))
          const t = termRefs.current[msg.terminalId]
          if (t) {
            t.term.writeln('')
            if (msg.code === 0) t.term.writeln(`\x1b[32m\u2713 Completed (exit code ${msg.code})\x1b[0m`)
            else t.term.writeln(`\x1b[31m\u2717 Failed (exit code ${msg.code})\x1b[0m`)
          }
          return
        }
      } catch {}
    }

    ws.onclose = () => {
      wsRef.current = null
      if (reconnectRef.current < 10) {
        reconnectRef.current++
        setTimeout(connect, 2000 + reconnectRef.current * 500)
      }
    }
    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => { connect(); return () => wsRef.current?.close() }, [connect])

  const outputBufRef = useRef<Record<string, string[]>>({})

  const runCommand = useCallback((cmd: CmdDef) => {
    const tid = uid()
    outputBufRef.current[tid] = []
    wsRef.current?.send(JSON.stringify({ type: 'run', commandId: cmd.id, terminalId: tid }))
    setRunningCmds((prev) => ({ ...prev, [tid]: { commandId: cmd.id, label: cmd.label, icon: cmd.icon, running: true, exitCode: null } }))
    // attach terminal after a tick
    setTimeout(() => attachTerminal(tid), 100)
  }, [])

  const killCommand = useCallback((tid: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'kill', terminalId: tid }))
  }, [])

  const attachTerminal = (tid: string) => {
    const container = document.getElementById(`term-${tid}`)
    if (!container || termRefs.current[tid]) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'Cascadia Code','Fira Code','JetBrains Mono','Consolas',monospace",
      theme: {
        background: '#0c0c14',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selectionBackground: '#5865f233',
        black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
        blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
        brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af', brightBlue: '#89b4fa', brightMagenta: '#f5c2e7',
        brightCyan: '#94e2d5', brightWhite: '#a6adc8',
      },
      allowProposedApi: true,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    container.innerHTML = ''
    term.open(container)
    setTimeout(() => { try { fit.fit() } catch {} }, 50)

    termRefs.current[tid] = { term, fit }

    const ro = new ResizeObserver(() => { try { fit.fit() } catch {} })
    ro.observe(container)
    ;(term as any).__ro = ro

    term.onData((data) => {
      if (data === '\x03') {
        wsRef.current?.send(JSON.stringify({ type: 'kill', terminalId: tid }))
      } else {
        wsRef.current?.send(JSON.stringify({ type: 'stdin', terminalId: tid, data }))
      }
    })

    const buf = outputBufRef.current[tid]
    if (buf) {
      setTimeout(() => {
        buf.forEach((l) => term.writeln(l))
        delete outputBufRef.current[tid]
      }, 200)
    }
  }

  const copyTerminal = (tid: string) => {
    const t = termRefs.current[tid]
    if (!t) return
    const text = t.term.buffer.active.getLine(0)?.translateToString(true) || ''
    let full = ''
    for (let i = 0; i < t.term.buffer.active.length; i++) {
      const line = t.term.buffer.active.getLine(i)
      if (line) full += line.translateToString(true) + '\n'
    }
    navigator.clipboard.writeText(full).catch(() => {})
  }

  const activeGroup = groups.find((g) => g.id === activePage)
  const runningEntries = Object.entries(runningCmds).filter(([, v]) => v.running)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-logo">🐱</span>
          <span className="topbar-title">CatChat Dev Tools</span>
        </div>
        <nav className="topbar-nav">
          {groups.map((g) => (
            <button
              key={g.id}
              className={`topbar-page-btn ${activePage === g.id ? 'active' : ''}`}
              onClick={() => setActivePage(g.id)}
            >
              <span className="topbar-page-icon">{PAGE_ICONS[g.id] || g.icon}</span>
              <span className="topbar-page-label">{g.label}</span>
            </button>
          ))}
        </nav>
        <div className="topbar-status">
          <span className={`conn-dot ${wsRef.current?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'}`} />
          <span className="conn-text">{wsRef.current?.readyState === WebSocket.OPEN ? 'Connected' : 'Connecting...'}</span>
        </div>
      </header>

      <main className="main">
        {groups.map((group) => (
          <div key={group.id} className={`page ${activePage === group.id ? 'active' : ''}`}>
            <div className="page-header">
              <span className="page-header-icon">{PAGE_ICONS[group.id] || group.icon}</span>
              <h2 className="page-header-title">{group.label}</h2>
              <span className="page-header-count">{group.commands.length} commands</span>
            </div>

            <div className="page-actions">
              {group.commands.map((cmd) => {
                const isRunning = runningEntries.some(([, v]) => v.commandId === cmd.id)
                return (
                  <button
                    key={cmd.id}
                    className={`action-card ${isRunning ? 'running' : ''}`}
                    onClick={() => runCommand(cmd)}
                    disabled={isRunning}
                  >
                    <span className="action-card-icon">{cmd.icon}</span>
                    <span className="action-card-label">{cmd.label}</span>
                    <span className="action-card-hint">{isRunning ? 'Running...' : 'Click to run'}</span>
                  </button>
                )
              })}
            </div>

            <div className="page-terminals">
              {Object.entries(runningCmds)
                .filter(([, v]) => v.commandId && group.commands.some((c) => c.id === v.commandId))
                .map(([tid, info]) => (
                  <div key={tid} className="terminal-card">
                    <div className="terminal-card-header">
                      <span className="terminal-card-icon">{info.icon}</span>
                      <span className="terminal-card-label">{info.label}</span>
                      <span className={`terminal-card-status ${info.running ? 'running' : info.exitCode === 0 ? 'ok' : 'fail'}`}>
                        {info.running ? '● Running' : info.exitCode === 0 ? '✓ Done' : `✗ Exit ${info.exitCode}`}
                      </span>
                      <div className="terminal-card-actions">
                        <button className="term-btn" onClick={() => copyTerminal(tid)} title="Copy output">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button className="term-btn kill-btn" onClick={() => killCommand(tid)} title="Kill">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </button>
                      </div>
                    </div>
                    <div id={`term-${tid}`} className="terminal-wrapper" />
                  </div>
                ))}
            </div>

            {Object.entries(runningCmds).filter(([, v]) => v.commandId && group.commands.some((c) => c.id === v.commandId)).length === 0 && activePage === group.id && (
              <div className="page-empty">
                <span className="page-empty-icon">{PAGE_ICONS[group.id] || group.icon}</span>
                <p className="page-empty-text">Click a command above to run it</p>
                <p className="page-empty-hint">Output will appear here in a terminal with rounded corners</p>
              </div>
            )}
          </div>
        ))}
      </main>

      <footer className="bottombar">
        <span className="bottombar-left">
          {runningEntries.length} running
        </span>
        <span className="bottombar-center">
          {activeGroup ? `${activeGroup.label} — ${activeGroup.commands.length} commands` : ''}
        </span>
        <span className="bottombar-right">
          Press <kbd>Ctrl+C</kbd> in terminal to kill
        </span>
      </footer>
    </div>
  )
}
