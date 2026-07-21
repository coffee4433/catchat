// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("commandRunner", {
  listCommands: () => ipcRenderer.invoke("cmd:list"),
  run: (scriptName) => ipcRenderer.invoke("cmd:run", scriptName),
  cancel: (runId) => ipcRenderer.invoke("cmd:cancel", runId),
  onOutput: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("cmd:output", listener);
    return () => ipcRenderer.removeListener("cmd:output", listener);
  },
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("cmd:status", listener);
    return () => ipcRenderer.removeListener("cmd:status", listener);
  },
});

contextBridge.exposeInMainWorld("updater", {
  onAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on("update:available", listener);
    return () => ipcRenderer.removeListener("update:available", listener);
  },
  onDownloadProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("update:download-progress", listener);
    return () => ipcRenderer.removeListener("update:download-progress", listener);
  },
  onDownloaded: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on("update:downloaded", listener);
    return () => ipcRenderer.removeListener("update:downloaded", listener);
  },
  onError: (callback) => {
    const listener = (_event, error) => callback(error);
    ipcRenderer.on("update:error", listener);
    return () => ipcRenderer.removeListener("update:error", listener);
  },
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  quitAndInstall: () => ipcRenderer.invoke("update:install"),
});
