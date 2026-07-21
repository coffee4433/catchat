#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const GH_TOKEN = process.env.GH_TOKEN
const OWNER = 'coffee4433'
const REPO = 'catchat'

if (!GH_TOKEN) {
  console.error('GH_TOKEN not set')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const version = pkg.version
const tag = `v${version}`
const releaseBody = process.env.RELEASE_NOTES || `CatChat ${tag}`
const distDir = path.join(__dirname, '..', 'dist')

function findFile(prefix) {
  const files = fs.readdirSync(distDir)
  const found = files.find((f) => f.startsWith(prefix))
  if (!found) throw new Error(`${prefix}* not found in dist/`)
  return path.join(distDir, found)
}

const exePath = findFile('CatChat Setup ')
const latestYml = path.join(distDir, 'latest.yml')
const blockmapPath = exePath.replace('.exe', '.exe.blockmap')

if (!fs.existsSync(latestYml)) throw new Error('latest.yml not found')

const auth = `Bearer ${GH_TOKEN}`
const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}`

async function ghReq(endpoint, opts = {}) {
  const res = await fetch(`${apiBase}${endpoint}`, {
    headers: {
      Authorization: auth,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...opts.headers,
    },
    method: opts.method || 'GET',
    body: opts.body || undefined,
  })
  const text = await res.text()
  if (!res.ok && res.status !== 404) {
    console.error(`GitHub API ${res.status} ${endpoint}: ${text}`)
    throw new Error(`GitHub API ${res.status}`)
  }
  return text ? JSON.parse(text) : null
}

async function uploadAsset(uploadUrl, filePath, fileName) {
  const content = fs.readFileSync(filePath)
  const url = uploadUrl.replace('{?name,label}', '') + '?name=' + encodeURIComponent(fileName)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 600_000)
  console.log(`  Uploading ${fileName} (${(content.length / 1024 / 1024).toFixed(1)} MB)...`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/octet-stream', 'Content-Length': String(content.length) },
    body: content,
    signal: controller.signal,
  })
  clearTimeout(timeout)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Upload ${fileName} failed: ${res.status} ${err}`)
  }
  console.log(`  ✓ ${fileName} uploaded`)
}

async function publish() {
  console.log(`\nPublishing v${version} to GitHub...\n`)

  // Verify token
  const verify = await ghReq('')
  if (!verify || verify.message) {
    console.error(`Token error: ${verify?.message || 'No access to repo'}`)
    console.error(`Check that GH_TOKEN has "Contents: Read & Write" on ${OWNER}/${REPO}`)
    process.exit(1)
  }
  console.log(`Token OK — repo: ${verify.full_name}\n`)

  // 1. Delete existing release if any (also delete tag ref)
  try {
    const existing = await ghReq(`/releases/tags/${tag}`)
    if (existing && existing.id) {
      console.log(`Deleting existing release ${tag}...`)
      await ghReq(`/releases/${existing.id}`, { method: 'DELETE' })
    }
  } catch { /* doesn't exist, fine */ }
  try {
    console.log(`Deleting tag ref ${tag} if exists...`)
    await ghReq(`/git/refs/tags/${tag}`, { method: 'DELETE' })
  } catch { /* fine */ }

  // Create release
  console.log(`Creating release ${tag}...`)
  const release = await ghReq('/releases', {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      name: tag,
      body: releaseBody,
      draft: true,
      prerelease: false,
    }),
  })

  if (!release || !release.upload_url) {
    console.error('Release creation failed:', JSON.stringify(release))
    process.exit(1)
  }

  console.log(`Release created: ${release.html_url}`)

  const uploadUrl = release.upload_url

  // Upload latest.yml FIRST (instant) so electron-updater can find it immediately
  console.log(`Uploading latest.yml...`)
  await uploadAsset(uploadUrl, latestYml, 'latest.yml')

  const exeName = `CatChat-Setup-${version}.exe`
  console.log(`Uploading ${exeName}...`)
  await uploadAsset(uploadUrl, exePath, exeName)

  if (fs.existsSync(blockmapPath)) {
    const bmName = `CatChat-Setup-${version}.exe.blockmap`
    console.log(`Uploading ${bmName}...`)
    await uploadAsset(uploadUrl, blockmapPath, bmName)
  }

  console.log(`\nPublished: ${release.html_url}`)

  // Make release visible
  await ghReq(`/releases/${release.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ draft: false }),
  })
  console.log('Release is now public')

  // Copy latest.yml to public/updates/ for Vercel
  const publicDir = path.join(__dirname, '..', 'public', 'updates')
  fs.mkdirSync(publicDir, { recursive: true })
  const ghBase = `https://github.com/${OWNER}/${REPO}/releases/download/${tag}`
  let ymlContent = fs.readFileSync(latestYml, 'utf8')
  ymlContent = ymlContent.replace(/url: CatChat-Setup/g, `url: ${ghBase}/CatChat-Setup`)
  ymlContent = ymlContent.replace(/path: CatChat Setup/g, '# path: CatChat Setup')
  fs.writeFileSync(path.join(publicDir, 'latest.yml'), ymlContent)
  console.log('latest.yml copied to public/updates/ for Vercel')

  // Auto git push
  try {
    const { execSync } = require('child_process')
    const root = path.join(__dirname, '..')
    console.log(`Committing and pushing...`)
    execSync('git add -A', { cwd: root, stdio: 'pipe' })
    execSync(`git commit -m "Release ${tag}" --allow-empty`, { cwd: root, stdio: 'pipe' })
    execSync('git push', { cwd: root, stdio: 'pipe' })
    console.log('Pushed to Git\n')
  } catch (e) {
    console.log(`Git: ${e.stderr?.toString() || e.message}`)
  }
}

publish().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
