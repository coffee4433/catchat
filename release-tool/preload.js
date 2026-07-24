const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('releaseTool', {
  getVersion: () => ipcRenderer.invoke('get:version'),
  selectProject: () => ipcRenderer.invoke('select:project'),
  saveToken: (token) => ipcRenderer.invoke('save:token', token),
  saveDeepSeekKey: (key) => ipcRenderer.invoke('save:deepseek-key', key),
  getConfig: () => ipcRenderer.invoke('get:config'),
  getGitCommits: () => ipcRenderer.invoke('get:git-commits'),
  generateAiNotes: (prompt) => ipcRenderer.invoke('generate:ai-notes', prompt),
  release: (version, notes, showModal) => ipcRenderer.invoke('release', version, notes, showModal),
  onOutput: (cb) => {
    const fn = (_e, chunk) => cb(chunk)
    ipcRenderer.on('release:output', fn)
    return () => ipcRenderer.removeListener('release:output', fn)
  },
  onStep: (cb) => {
    const fn = (_e, data) => cb(data)
    ipcRenderer.on('release:step', fn)
    return () => ipcRenderer.removeListener('release:step', fn)
  },
  onDone: (cb) => {
    const fn = (_e, success) => cb(success)
    ipcRenderer.on('release:done', fn)
    return () => ipcRenderer.removeListener('release:done', fn)
  },
})
