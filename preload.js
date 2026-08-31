// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("commandRunner", {
  listCommands: () => ipcRenderer.invoke("cmd:list"),
  run: (scriptName, env) => ipcRenderer.invoke("cmd:run", scriptName, env),
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
  getVersion: () => ipcRenderer.invoke("app:version"),
});

contextBridge.exposeInMainWorld("pluginInstaller", {
  install: (payload) => ipcRenderer.invoke("plugin:install", payload),
  getInstallPath: (pluginId) => ipcRenderer.invoke("plugin:get-install-path", pluginId),
  onDownloadProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("plugin:download-progress", listener);
    return () => ipcRenderer.removeListener("plugin:download-progress", listener);
  },
});

// Native window controls. The web fullscreen API only ever fills the window;
// this is what lets the renderer take the whole monitor. The minimise/maximise/
// close trio backs the in-app title bar, which replaces the OS one.
contextBridge.exposeInMainWorld("desktopWindow", {
  setFullscreen: (flag) => ipcRenderer.invoke("window:set-fullscreen", flag),
  isFullscreen: () => ipcRenderer.invoke("window:is-fullscreen"),
  onFullscreenChange: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("window:fullscreen-changed", listener);
    return () => ipcRenderer.removeListener("window:fullscreen-changed", listener);
  },
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  close: () => ipcRenderer.invoke("window:close"),
  onMaximizeChange: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("window:maximize-changed", listener);
    return () => ipcRenderer.removeListener("window:maximize-changed", listener);
  },
});

contextBridge.exposeInMainWorld("screenShare", {
  onSources: (cb) => {
    const listener = (_e, sources) => cb(sources);
    ipcRenderer.on("screen-share:sources", listener);
    return () => ipcRenderer.removeListener("screen-share:sources", listener);
  },
  select: (sourceId) => ipcRenderer.invoke("screen-share:select", sourceId),
});
