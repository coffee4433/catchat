// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("commandRunner", {
  // List of available scripts (comes from main, read from package.json)
  listCommands: () => ipcRenderer.invoke("cmd:list"),

  // Launches a command by name (e.g. "build", "desktop:build")
  run: (scriptName) => ipcRenderer.invoke("cmd:run", scriptName),

  // Cancels the running process (by runId)
  cancel: (runId) => ipcRenderer.invoke("cmd:cancel", runId),

  // Subscription to live output
  onOutput: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("cmd:output", listener);
    return () => ipcRenderer.removeListener("cmd:output", listener);
  },

  // Subscription to status changes (running / success / error / cancelled)
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("cmd:status", listener);
    return () => ipcRenderer.removeListener("cmd:status", listener);
  },
});
