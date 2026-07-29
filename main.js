// dev-tools/main.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ruta al proyecto principal (CatChat)
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DEV_TOOLS_ROOT = path.join(__dirname, '..');

let mainWindow;
const activeProcesses = new Map();
let configuredProjectPath = null;

function getConfigPath() {
  return path.join(app.getPath('userData'), 'devtools-config.json');
}

function loadConfiguredProjectPath() {
  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8'));
    if (config.projectPath && fs.statSync(path.join(config.projectPath, 'package.json')).isFile()) {
      configuredProjectPath = config.projectPath;
    }
  } catch {}
}

function saveConfiguredProjectPath(projectPath) {
  try {
    fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
    fs.writeFileSync(getConfigPath(), JSON.stringify({ projectPath }, null, 2));
  } catch {}
}

function readScriptsFromPackage(projectPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
    return pkg.scripts || {};
  } catch {
    return null;
  }
}

function readCommandsFile(filePath) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return content.scripts || content;
  } catch {
    return null;
  }
}

function getProjectCandidates() {
  return [
    configuredProjectPath,              // User-selected path
    PROJECT_ROOT,                       // chat-app-logic/ (dev mode)
    process.cwd(),                      // Useful when launched from the project root
    path.dirname(app.getPath('exe')),    // Portable builds launched near the project
    DEV_TOOLS_ROOT,                     // dev-tools/ (only valid for devtools scripts)
  ].filter(Boolean);
}

function findProjectForScript(scriptName) {
  // 1. Check user-configured path first
  if (configuredProjectPath) {
    const scripts = readScriptsFromPackage(configuredProjectPath);
    if (scripts && Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
      return { cwd: configuredProjectPath, scripts };
    }
  }

  // 2. Check all project candidates' package.json
  for (const projectPath of getProjectCandidates()) {
    const scripts = readScriptsFromPackage(projectPath);
    if (scripts && Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
      return { cwd: projectPath, scripts };
    }
  }

  // 3. Fallback: check commands.json for scripts not in any package.json
  const commandFiles = [
    path.join(DEV_TOOLS_ROOT, 'commands.json'),
    path.join(DEV_TOOLS_ROOT, '..', 'commands.json'),
  ];

  for (const filePath of commandFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Object.prototype.hasOwnProperty.call(content, scriptName)) {
        // Use configured path, or check if PROJECT_ROOT has a valid package.json,
        // otherwise let it fail so the user is prompted to select the project folder
        const cwd = configuredProjectPath || PROJECT_ROOT;
        if (readScriptsFromPackage(cwd)) {
          return { cwd, scripts: content };
        }
      }
    } catch {}
  }

  return null;
}

function getAllowedScripts() {
  for (const projectPath of getProjectCandidates()) {
    const scripts = readScriptsFromPackage(projectPath);
    if (scripts && Object.keys(scripts).length > 0) {
      return Object.keys(scripts);
    }
  }

  const commandFiles = [
    path.join(DEV_TOOLS_ROOT, 'commands.json'),       // dev mode
    path.join(__dirname, '..', '..', 'commands.json'), // packaged extraResource
  ];

  for (const filePath of commandFiles) {
    const scripts = readCommandsFile(filePath);
    if (scripts && Object.keys(scripts).length > 0) {
      return Object.keys(scripts);
    }
  }

  return [];
}

function findPnpm() {
  const commonPaths = [
    'C:\\nvm4w\\nodejs\\pnpm.CMD',
    'C:\\Program Files\\nodejs\\pnpm.CMD',
    'C:\\Users\\antonio\\AppData\\Roaming\\npm\\pnpm.CMD',
    path.join(process.env.LOCALAPPDATA || '', 'pnpm\\pnpm.CMD'),
    path.join(process.env.APPDATA || '', 'npm\\pnpm.CMD'),
  ];
  for (const p of commonPaths) {
    try { if (fs.statSync(p).isFile()) return p; } catch {}
  }
  // Fallback: try resolving via PATH
  if (process.platform === 'win32') {
    try {
      const result = require('child_process').execSync('where pnpm', { encoding: 'utf8' });
      const line = result.split('\n').map(l => l.trim()).find(l => l.endsWith('.cmd') || l.endsWith('.exe') || l.endsWith('.bat'));
      if (line) return line;
    } catch {}
  }
  return 'pnpm';
}

async function killStuckNodeProcesses() {
  if (process.platform !== 'win32') return;
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    // Get parent PIDs using powershell to find ancestor process tree
    exec('powershell -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name"', (err, stdout) => {
      if (err || !stdout) {
        // Fallback: just kill node.exe except process.pid and process.ppid
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

      // We have the full process list with parents
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

      // Build the set of PIDs in our ancestor chain
      const ancestors = new Set();
      let curr = process.pid;
      while (curr && processMap.has(curr)) {
        ancestors.add(curr);
        curr = processMap.get(curr).ppid;
      }
      if (process.ppid) ancestors.add(process.ppid);

      // Kill any node.exe process that is not our ancestor
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

function openBuildOutput(projectRoot) {
  const dirs = ['release', 'dist'];
  for (const dir of dirs) {
    const fullPath = path.join(projectRoot, dir);
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        const msis = fs.readdirSync(fullPath).filter(f => f.endsWith('.msi'));
        if (msis.length > 0) {
          shell.showItemInFolder(path.join(fullPath, msis[0]));
          return;
        }
        shell.openPath(fullPath);
        return;
      }
    } catch {}
  }
  shell.openPath(projectRoot);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'CatChat - DevTools',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(
    app.isPackaged
      ? `file://${path.join(__dirname, '../dist/index.html')}`
      : 'http://localhost:5173'
  );

  // Abrir DevTools en modo desarrollo
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Matar todos los procesos activos al cerrar
    activeProcesses.forEach(child => {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid, '/T', '/F']);
      } else {
        child.kill('SIGTERM');
      }
    });
    activeProcesses.clear();
  });
}

// IPC Handlers
ipcMain.handle('cmd:list', () => {
  return getAllowedScripts();
});

ipcMain.handle('cmd:project-info', () => {
  const projectPath = configuredProjectPath || PROJECT_ROOT;
  const pkgPath = path.join(projectPath, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return {
      name: pkg.name || 'Unknown',
      version: pkg.version || '0.0.0',
      description: pkg.description || '',
      path: projectPath,
    };
  } catch {
    return {
      name: 'CatChat',
      version: '1.0.0',
      description: 'CatChat Project',
      path: PROJECT_ROOT,
    };
  }
});

ipcMain.handle('cmd:run', async (_event, scriptName) => {
  const allowed = getAllowedScripts();

  if (!allowed.includes(scriptName)) {
    throw new Error(`Script no permitido: ${scriptName}`);
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();

  let projectMatch = findProjectForScript(scriptName);
  if (!projectMatch) {
    const result = await require('electron').dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Selecciona la carpeta del proyecto CatChat',
      message: `Necesito la carpeta raiz que contiene "package.json" con el script "${scriptName}"`,
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const selected = result.filePaths[0];
      try {
        if (fs.statSync(path.join(selected, 'package.json')).isFile()) {
          configuredProjectPath = selected;
          saveConfiguredProjectPath(selected);
          projectMatch = findProjectForScript(scriptName);
        }
      } catch {}
    }
    if (!projectMatch) {
      throw new Error(
        `No encuentro un package.json que contenga "${scriptName}". Selecciona la carpeta raiz de CatChat.`
      );
    }
  }
  const cwd = projectMatch.cwd;

  const pnpmPath = findPnpm();
  
  // Sanitize environment variables inherited from Electron to prevent interference with next.js/node module resolution
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.ELECTRON_RUN_AS_NODE;
  delete cleanEnv.ELECTRON_NO_ASAR;
  for (const key of Object.keys(cleanEnv)) {
    if (key.startsWith('ELECTRON_') || key.startsWith('npm_') || key.startsWith('pnpm_')) {
      delete cleanEnv[key];
    }
  }

  try {
    fs.writeFileSync(path.join(DEV_TOOLS_ROOT, 'spawn-env.json'), JSON.stringify({
      processEnv: process.env,
      cleanEnv: cleanEnv,
      execPath: process.execPath,
      cwd,
    }, null, 2));
  } catch (err) {
    console.error('Failed to write spawn-env.json:', err);
  }

  // Send initial running status and header
  mainWindow.webContents.send('cmd:status', {
    runId,
    scriptName,
    status: 'running',
    startTime,
  });

  mainWindow.webContents.send('cmd:output', {
    runId,
    stream: 'stdout',
    chunk: `$ cd ${cwd}\n$ pnpm run ${scriptName}\n`,
  });

  // If desktop:build, terminate all other node processes first
  if (scriptName === 'desktop:build') {
    mainWindow.webContents.send('cmd:output', {
      runId,
      stream: 'stdout',
      chunk: `[DevTools] Finalizando otros procesos Node.js en segundo plano para liberar puertos y archivos...\n`,
    });
    await killStuckNodeProcesses();
    mainWindow.webContents.send('cmd:output', {
      runId,
      stream: 'stdout',
      chunk: `[DevTools] Limpieza completada. Iniciando compilador...\n`,
    });
  }

  const child = spawn(pnpmPath, ['run', scriptName], {
    cwd,
    shell: process.platform === 'win32',
    env: cleanEnv,
  });

  activeProcesses.set(runId, child);

  child.stdout.on('data', (data) => {
    mainWindow.webContents.send('cmd:output', {
      runId,
      stream: 'stdout',
      chunk: data.toString(),
    });
  });

  child.stderr.on('data', (data) => {
    mainWindow.webContents.send('cmd:output', {
      runId,
      stream: 'stderr',
      chunk: data.toString(),
    });
  });

  child.on('close', (code) => {
    activeProcesses.delete(runId);
    const endTime = Date.now();
    mainWindow.webContents.send('cmd:status', {
      runId,
      scriptName,
      status: code === 0 ? 'success' : 'error',
      exitCode: code,
      duration: endTime - startTime,
    });
    if (code === 0 && scriptName === 'desktop:build') {
      openBuildOutput(cwd);
    }
  });

  child.on('error', (err) => {
    activeProcesses.delete(runId);
    mainWindow.webContents.send('cmd:status', {
      runId,
      scriptName,
      status: 'error',
      error: err.message,
    });
  });

  return { runId, scriptName, startTime };
});

ipcMain.handle('cmd:select-project', async () => {
  const result = await require('electron').dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Selecciona la carpeta del proyecto CatChat',
    message: 'Elige la carpeta raíz que contiene package.json con los scripts',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const selected = result.filePaths[0];
    try {
      if (fs.statSync(path.join(selected, 'package.json')).isFile()) {
        configuredProjectPath = selected;
        saveConfiguredProjectPath(selected);
        return { success: true, path: selected };
      }
    } catch {}
    return { success: false, error: 'No se encontró package.json en esa carpeta' };
  }
  return { success: false, error: 'Cancelado' };
});

ipcMain.handle('cmd:get-project-path', () => {
  return configuredProjectPath || null;
});

ipcMain.handle('cmd:cancel', (_event, runId) => {
  const child = activeProcesses.get(runId);
  if (!child) return false;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', child.pid, '/T', '/F']);
  } else {
    child.kill('SIGTERM');
  }

  activeProcesses.delete(runId);
  return true;
});

app.whenReady().then(() => {
  loadConfiguredProjectPath();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
