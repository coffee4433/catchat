#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = path.join(__dirname, '..')
const version = process.env.RELEASE_VERSION

if (!version) {
  console.error('RELEASE_VERSION env var not set')
  process.exit(1)
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version: ${version}. Must be x.y.z`)
  process.exit(1)
}

const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const oldVersion = pkg.version

if (oldVersion === version) {
  console.log(`Version ${version} already set, retrying publish...\n`)
} else {
  console.log(`Bumping version: ${oldVersion} → ${version}\n`)
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

console.log('Building...\n')
execSync('pnpm run desktop:build', { cwd: root, stdio: 'inherit' })

console.log('\nPublishing to GitHub...\n')
execSync('node scripts/publish-release.cjs', { cwd: root, stdio: 'inherit' })
