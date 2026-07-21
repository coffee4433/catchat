// electron/commandRunner.js
const { ipcMain } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ROOT = path.join(__dirname, ".."); // adjust to your structure

// Whitelist of allowed scripts (read from package.json, but filtered
// for security: never run an arbitrary name coming from the renderer)
function getAllowedScripts() {
  const pkgPath = path.join(PROJECT_ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  return Object.keys(pkg.scripts || {});
}

const activeProcesses = new Map(); // runId -> child process

async function killStuckNodeProcesses() {
  if (process.platform !== 'win32') return;
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('powershell -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name"', (err, stdout) => {
      if (err || !stdout) {
        // Fallback: kill node.exe except process.pid and process.ppid
        exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', (err2, stdout2) => {
          if (err2 || !stdout2) { resolve(); return; }
          const myPids = new Set([process.pid, process.ppid]);
          const lines = stdout2.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const parts = line.split(',');
            if (parts.length > 1) {
              const pid = parseInt(parts[1].replace(/"/g, ''), 10);
              if (pid && !myPids.has(pid)) {
                try { process.kill(pid, 'SIGKILL'); } catch {}
              }
            }
          }
          resolve();
        });
        return;
      }

      const processMap = new Map();
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const match = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
        if (match) {
          const pid = parseInt(match[1], 10);
          const ppid = parseInt(match[2], 10);
          const name = match[3].trim();
          processMap.set(pid, { ppid, name });
        }
      }

      const ancestors = new Set();
      let curr = process.pid;
      while (curr && processMap.has(curr)) {
        ancestors.add(curr);
        curr = processMap.get(curr).ppid;
      }
      if (process.ppid) ancestors.add(process.ppid);

      for (const [pid, proc] of processMap.entries()) {
        if (proc.name.toLowerCase() === 'node.exe' && !ancestors.has(pid)) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {}
        }
      }
      resolve();
    });
  });
}

function registerCommandRunnerIPC(mainWindow) {
  ipcMain.handle("cmd:list", () => {
    return getAllowedScripts();
  });

  ipcMain.handle("cmd:run", async (_event, scriptName) => {
    const allowed = getAllowedScripts();

    // SECURITY: reject any script not present in package.json.
    // This prevents arbitrary command injection from the renderer.
    if (!allowed.includes(scriptName)) {
      throw new Error(`Script not allowed: ${scriptName}`);
    }

    const runId = crypto.randomUUID();

    // Sanitize environment variables inherited from Electron
    const cleanEnv = { ...process.env };
    delete cleanEnv.NODE_OPTIONS;
    delete cleanEnv.ELECTRON_RUN_AS_NODE;
    delete cleanEnv.ELECTRON_NO_ASAR;
    for (const key of Object.keys(cleanEnv)) {
      if (key.startsWith('ELECTRON_') || key.startsWith('npm_') || key.startsWith('pnpm_')) {
        delete cleanEnv[key];
      }
    }

    // Send initial status and header
    mainWindow.webContents.send("cmd:status", {
      runId,
      scriptName,
      status: "running",
    });

    mainWindow.webContents.send("cmd:output", {
      runId,
      stream: "stdout",
      chunk: `$ pnpm run ${scriptName}\n`,
    });

    // If desktop:build, terminate all other node processes first
    if (scriptName === 'desktop:build') {
      mainWindow.webContents.send("cmd:output", {
        runId,
        stream: "stdout",
        chunk: `[DevTools] Finalizando otros procesos Node.js en segundo plano para liberar puertos y archivos...\n`,
      });
      await killStuckNodeProcesses();
      mainWindow.webContents.send("cmd:output", {
        runId,
        stream: "stdout",
        chunk: `[DevTools] Limpieza completada. Iniciando compilador...\n`,
      });
    }

    // spawn (not exec) → gives us real-time streams, no shell=true
    const child = spawn("pnpm", ["run", scriptName], {
      cwd: PROJECT_ROOT,
      shell: process.platform === "win32", // needed for pnpm.cmd on Windows
      env: cleanEnv,
    });

    activeProcesses.set(runId, child);

    child.stdout.on('data', (data) => {
      mainWindow.webContents.send("cmd:output", {
        runId,
        stream: "stdout",
        chunk: data.toString(),
      });
    });

    child.stderr.on('data', (data) => {
      mainWindow.webContents.send("cmd:output", {
        runId,
        stream: "stderr",
        chunk: data.toString(),
      });
    });

    child.on('close', (code) => {
      activeProcesses.delete(runId);
      mainWindow.webContents.send("cmd:status", {
        runId,
        scriptName,
        status: code === 0 ? "success" : "error",
        exitCode: code,
      });
    });

    child.on('error', (err) => {
      activeProcesses.delete(runId);
      mainWindow.webContents.send("cmd:status", {
        runId,
        scriptName,
        status: "error",
        error: err.message,
      });
    });

    return { runId, scriptName };
  });

  ipcMain.handle("cmd:cancel", (_event, runId) => {
    const child = activeProcesses.get(runId);
    if (!child) return false;

    // On Windows, kill() sometimes fails to kill pnpm's sub-processes.
    // taskkill is more reliable for process trees on Windows.
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", child.pid, "/T", "/F"]);
    } else {
      child.kill("SIGTERM");
    }

    activeProcesses.delete(runId);
    return true;
  });
}

module.exports = { registerCommandRunnerIPC };
