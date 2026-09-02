import { spawn } from 'child_process'
import { createServer } from 'net'

const DEV_PORT = 3000

async function isPortInUse(port) {
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

async function waitForServer(url, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not start within ${timeout}ms`)
}

async function main() {
  const port = DEV_PORT
  const inUse = await isPortInUse(port)
  // Declared out here so the exit handler below can still see it: it used to be
  // block-scoped, so closing Electron threw and left the dev server running.
  let nextProcess = null

  if (!inUse) {
    console.log('Starting Next.js dev server...')
    nextProcess = spawn('pnpm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    })

    process.on('exit', () => nextProcess.kill())
    process.on('SIGINT', () => { nextProcess.kill(); process.exit() })
    process.on('SIGTERM', () => { nextProcess.kill(); process.exit() })

    console.log('Waiting for Next.js dev server on http://127.0.0.1:3000 ...')
    await waitForServer('http://127.0.0.1:3000')
  }

  console.log('Starting Electron...')
  const electronProcess = spawn('pnpm', ['run', 'desktop:dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ELECTRON_START_URL: `http://127.0.0.1:${port}` }
  })

  electronProcess.on('exit', () => {
    if (nextProcess) {
      nextProcess.kill()
    }
    process.exit()
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
