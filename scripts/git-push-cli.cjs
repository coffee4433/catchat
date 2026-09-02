#!/usr/bin/env node

/**
 * `pnpm run push` — pushing by hand with the credential that has write access.
 *
 * Plain `git push` resolves github.com through the gh CLI credential helper, and
 * its active account has no push rights on this repo, so it fails with 403. The
 * release scripts sidestep that by pushing over an explicit token URL; this puts
 * the same path behind a command, using the very token the release-tool's
 * "public release" button already uses.
 *
 * Usage: `pnpm run push` (branch `main`), or `pnpm run push <branch>`.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { pushToGitHub } = require('./git-push.cjs')

const root = path.join(__dirname, '..')
const CONFIG_PATH = path.join(os.homedir(), '.catchat-release-config.json')

/** Reads the release-tool's stored token, so both routes share one credential. */
function tokenFromReleaseConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).ghToken || ''
  } catch {
    return ''
  }
}

const token = process.env.GH_TOKEN || tokenFromReleaseConfig()
if (!token) {
  console.error(`No push token: set GH_TOKEN, or store "ghToken" in ${CONFIG_PATH}`)
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const { owner, repo } = pkg.build.publish
const branch = process.argv[2] || 'main'

try {
  pushToGitHub({ cwd: root, owner, repo, token, branch })
  console.log(`✓ Pushed HEAD → ${owner}/${repo} ${branch}`)
} catch (e) {
  console.error(`✕ push failed: ${e.message}`)
  process.exit(1)
}
