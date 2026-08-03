const { ipcMain, app } = require('electron')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const AdmZip = require('adm-zip')

function getPluginsRoot() {
  return path.join(app.getPath('userData'), 'installed-plugins')
}

function getPluginInstallDir(pluginId, version) {
  const safeVersion = String(version || 'latest').replace(/^v/, 'v')
  return path.join(getPluginsRoot(), pluginId, safeVersion)
}

function requestDownload(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects while downloading plugin'))
      return
    }

    const lib = url.startsWith('https') ? https : http
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent': 'CatChat-PluginInstaller/1.0',
          Accept: 'application/octet-stream',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          resolve(requestDownload(res.headers.location, redirectCount + 1))
          return
        }

        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`Plugin download failed (${res.statusCode})`))
          return
        }

        resolve(res)
      },
    )

    req.on('error', reject)
  })
}

async function downloadFile(url, destPath, onProgress) {
  const response = await requestDownload(url)
  const totalBytes = Number.parseInt(response.headers['content-length'] || '0', 10)
  let downloadedBytes = 0

  await fs.promises.mkdir(path.dirname(destPath), { recursive: true })

  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath)

    response.on('data', (chunk) => {
      downloadedBytes += chunk.length
      if (totalBytes > 0 && onProgress) {
        onProgress(Math.min(99, Math.round((downloadedBytes / totalBytes) * 100)))
      } else if (onProgress) {
        onProgress(Math.min(90, Math.round(downloadedBytes / 1024 / 50)))
      }
    })

    response.pipe(fileStream)
    fileStream.on('finish', () => fileStream.close(resolve))
    fileStream.on('error', reject)
    response.on('error', reject)
  })
}

function writeInstallRecord(pluginId, version, installDir) {
  const recordPath = path.join(getPluginsRoot(), pluginId, 'current.json')
  fs.mkdirSync(path.dirname(recordPath), { recursive: true })
  fs.writeFileSync(
    recordPath,
    JSON.stringify(
      {
        pluginId,
        version,
        installDir,
        installedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  )
}

function registerPluginInstallerIPC(mainWindow) {
  // Purge legacy survivor-shooter and tps-shooter plugins from installed-plugins directory on disk
  try {
    const legacyDirs = ['survivor-shooter', 'tps-shooter', 'fortnite-builder']
    for (const legacyId of legacyDirs) {
      const legacyDirPath = path.join(getPluginsRoot(), legacyId)
      if (fs.existsSync(legacyDirPath)) {
        fs.rmSync(legacyDirPath, { recursive: true, force: true })
      }
    }
  } catch (err) {
    console.error('Failed to purge legacy plugin dirs:', err)
  }

  ipcMain.handle('plugin:install', async (_event, payload) => {
    const pluginId = payload?.pluginId
    const version = payload?.version || 'latest'
    const downloadUrl = payload?.downloadUrl

    if (!pluginId || !downloadUrl) {
      throw new Error('Missing pluginId or downloadUrl')
    }

    const installDir = getPluginInstallDir(pluginId, version)
    const tempZip = path.join(app.getPath('temp'), `catchat-plugin-${pluginId}-${Date.now()}.zip`)

    const sendProgress = (percent) => {
      mainWindow?.webContents.send('plugin:download-progress', {
        pluginId,
        percent,
      })
    }

    try {
      sendProgress(0)
      await downloadFile(downloadUrl, tempZip, sendProgress)

      sendProgress(99)
      fs.mkdirSync(installDir, { recursive: true })

      const zip = new AdmZip(tempZip)
      zip.extractAllTo(installDir, true)

      writeInstallRecord(pluginId, version, installDir)
      sendProgress(100)

      return {
        ok: true,
        pluginId,
        version,
        installDir,
      }
    } finally {
      try {
        fs.unlinkSync(tempZip)
      } catch {
        // Ignore temp cleanup errors
      }
    }
  })

  ipcMain.handle('plugin:get-install-path', (_event, pluginId) => {
    if (!pluginId) return null
    const recordPath = path.join(getPluginsRoot(), pluginId, 'current.json')
    try {
      const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'))
      return record.installDir || null
    } catch {
      return null
    }
  })
}

module.exports = {
  registerPluginInstallerIPC,
  getPluginsRoot,
}
