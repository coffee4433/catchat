/**
 * dev-with-translator.mjs
 *
 * Inicia LibreTranslate (en,es) junto con el servidor de desarrollo de Next.js.
 * Uso: pnpm run dev (redirigido aquí desde package.json)
 */
import { spawn } from 'child_process'
import { startTranslator, stopTranslator } from './start-translator.mjs'

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   🐱 CatChat Dev Server + Translator         ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // 1. Iniciar LibreTranslate en background
  const translatorOk = await startTranslator()
  if (!translatorOk) {
    console.warn('⚠️  LibreTranslate no disponible. El traductor no funcionará.')
    console.warn('   Ejecuta: pnpm run translator:setup\n')
  }

  // 2. Iniciar Next.js dev server
  console.log('\n🚀 Iniciando Next.js dev server...\n')
  const nextProcess = spawn('pnpm', ['exec', 'next', 'dev', '--webpack'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  })

  // Limpieza al salir
  function cleanup() {
    stopTranslator()
    try { nextProcess.kill() } catch {}
  }

  process.on('exit', cleanup)
  process.on('SIGINT', () => { cleanup(); process.exit() })
  process.on('SIGTERM', () => { cleanup(); process.exit() })

  nextProcess.on('close', (code) => {
    cleanup()
    process.exit(code || 0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
