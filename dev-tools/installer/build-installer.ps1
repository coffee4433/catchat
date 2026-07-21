param(
  [string]$SourceDir = (Split-Path -Parent $PSScriptRoot),
  [string]$OutputDir = (Join-Path $PSScriptRoot "output"),
  [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$ProductName = "CatChat Dev Tools"
$ProductVersion = "0.1.1.0"
$InstallerFile = "CatChat-DevTools-$ProductVersion.msi"

Write-Host "=== CatChat Dev Tools MSI Builder ===" -ForegroundColor Cyan
Write-Host "Source: $SourceDir"
Write-Host "Output: $OutputDir"
Write-Host ""

#  Prerequisites 
if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
  throw "WiX Toolset v6 is not installed. Run: dotnet tool install --global wix"
}

$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
  throw "Node.js is not installed or not in PATH."
}
Write-Host " Node.js $nodeVersion"

$pnpmVersion = pnpm --version 2>$null
if (-not $pnpmVersion) {
  throw "pnpm is not installed or not in PATH."
}
Write-Host " pnpm $pnpmVersion"

#  Clean output directory 
if (Test-Path $OutputDir) {
  Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

#  Create staging directory 
$StagingDir = Join-Path $OutputDir "staging"
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
Write-Host ""

#  Build frontend 
Write-Host "Building frontend..." -ForegroundColor Yellow
Push-Location $SourceDir
try {
  $buildOutput = pnpm exec vite build 2>&1
  foreach ($line in $buildOutput) {
    if ($line -match "error|ERR|fail") {
      Write-Host "  build: $line" -ForegroundColor Red
    } else {
      Write-Host "  build: $line" -ForegroundColor Gray
    }
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed with exit code $LASTEXITCODE"
  }
  if (-not (Test-Path (Join-Path $SourceDir "dist\index.html"))) {
    throw "Build succeeded but dist\index.html was not created"
  }
} finally {
  Pop-Location
}

#  Copy app files to staging 
Write-Host "Copying app files..." -ForegroundColor Yellow
Copy-Item (Join-Path $SourceDir "server.mjs") (Join-Path $StagingDir "server.mjs") -Force
Copy-Item (Join-Path $SourceDir "package.json") (Join-Path $StagingDir "package.json") -Force
if (Test-Path (Join-Path $SourceDir "pnpm-lock.yaml")) {
  Copy-Item (Join-Path $SourceDir "pnpm-lock.yaml") (Join-Path $StagingDir "pnpm-lock.yaml") -Force
}

Copy-Item (Join-Path $PSScriptRoot "launcher.cmd") (Join-Path $StagingDir "launcher.cmd") -Force
Copy-Item (Join-Path $PSScriptRoot "launcher.vbs") (Join-Path $StagingDir "launcher.vbs") -Force
Copy-Item (Join-Path $SourceDir "electron-main.cjs") (Join-Path $StagingDir "electron-main.cjs") -Force
Copy-Item (Join-Path $PSScriptRoot "launcher-electron.vbs") (Join-Path $StagingDir "launcher-electron.vbs") -Force
Copy-Item (Join-Path $PSScriptRoot "set-project-root.cmd") (Join-Path $StagingDir "set-project-root.cmd") -Force

# dist folder (preserve subdirectory structure)
$DistDir = Join-Path $StagingDir "dist"
New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
Copy-Item (Join-Path $SourceDir "dist\index.html") (Join-Path $DistDir "index.html") -Force

$DistAssetsDir = Join-Path $DistDir "assets"
New-Item -ItemType Directory -Path $DistAssetsDir -Force | Out-Null
Get-ChildItem (Join-Path $SourceDir "dist\assets\*") -File | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $DistAssetsDir $_.Name) -Force
}

#  Install production dependencies with pnpm (flat structure via shamefully-hoist) 
Write-Host "Installing production dependencies with pnpm..." -ForegroundColor Yellow
Push-Location $StagingDir
try {
  $env:NODE_ENV = "production"
  $pnpmOutput = pnpm install --prod --shamefully-hoist --no-optional 2>&1
  $pnpmExitCode = $LASTEXITCODE
  foreach ($line in $pnpmOutput) {
    if ($line -match "error|ERR|fail") {
      Write-Host "  pnpm: $line" -ForegroundColor Red
    } elseif ($line -match "warn|WARN") {
      Write-Host "  pnpm: $line" -ForegroundColor DarkYellow
    } else {
      Write-Host "  pnpm: $line" -ForegroundColor Gray
    }
  }
  if ($pnpmExitCode -ne 0) {
    throw "pnpm install failed with exit code $pnpmExitCode"
  }
} finally {
  Pop-Location
}

$StagingNodeModules = Join-Path $StagingDir "node_modules"
if (-not (Test-Path $StagingNodeModules)) {
  throw "node_modules was not created after pnpm install"
}

$nmCount = (Get-ChildItem -Recurse -LiteralPath $StagingNodeModules -File).Count
$nmSize = (Get-ChildItem -Recurse -LiteralPath $StagingNodeModules -File | Measure-Object -Property Length -Sum).Sum
Write-Host "  node_modules: $nmCount files, $([math]::Round($nmSize/1MB, 1)) MB" -ForegroundColor Green

#  Copy electron binaries to a flat location (pnpm uses symlinks that WiX doesn't follow)
Write-Host "Copying electron binaries to bin\electron..." -ForegroundColor Yellow
$ElectronBinDir = Join-Path $StagingDir "bin\electron"
New-Item -ItemType Directory -Path $ElectronBinDir -Force | Out-Null
$RealElectronDist = Get-ChildItem -Recurse -LiteralPath $StagingNodeModules -Filter "electron.exe" -File | Select-Object -First 1 -ExpandProperty DirectoryName
if (-not $RealElectronDist) {
  throw "Could not find electron.exe in node_modules"
}
Write-Host "  Found electron dist at: $RealElectronDist" -ForegroundColor Gray
Copy-Item -Path "$RealElectronDist\*" -Destination $ElectronBinDir -Recurse -Force
$ebc = (Get-ChildItem -LiteralPath $ElectronBinDir -File).Count
Write-Host "  Copied $ebc files to bin\electron" -ForegroundColor Green
Remove-Item -Recurse -Force $RealElectronDist -ErrorAction SilentlyContinue
Write-Host "  Removed original electron dist to avoid duplication" -ForegroundColor Gray

#  Generate WiX source with proper directory structure
Write-Host ""
Write-Host "Generating WiX source file..." -ForegroundColor Yellow

$WxsFile = Join-Path $OutputDir "product.wxs"

$wxsBuilder = New-Object System.Text.StringBuilder

$null = $wxsBuilder.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
$null = $wxsBuilder.AppendLine('<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">')
$null = $wxsBuilder.AppendLine('')
$null = $wxsBuilder.AppendLine('  <Package')
$null = $wxsBuilder.AppendLine('           Name="CatChat Dev Tools"')
$null = $wxsBuilder.AppendLine('           Version="__VERSION__"')
$null = $wxsBuilder.AppendLine('           Manufacturer="CatChat"')
$null = $wxsBuilder.AppendLine('           UpgradeCode="F3A2B1C4-5D6E-7F8A-9B0C-1D2E3F4A5B6C"')
$null = $wxsBuilder.AppendLine('           Scope="perMachine">')
$null = $wxsBuilder.AppendLine('')
$null = $wxsBuilder.AppendLine('    <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />')
$null = $wxsBuilder.AppendLine('    <MediaTemplate EmbedCab="yes" CompressionLevel="medium" MaximumUncompressedMediaSize="2048" />')
$null = $wxsBuilder.AppendLine('')
$null = $wxsBuilder.AppendLine('    <Feature Id="ProductFeature" Title="CatChat Dev Tools" Level="1">')
$null = $wxsBuilder.AppendLine('      <ComponentGroupRef Id="ProductComponents" />')
$null = $wxsBuilder.AppendLine('      <ComponentGroupRef Id="ShortcutComponents" />')
$null = $wxsBuilder.AppendLine('      <ComponentGroupRef Id="RegistryComponents" />')
$null = $wxsBuilder.AppendLine('    </Feature>')
$null = $wxsBuilder.AppendLine('')
$null = $wxsBuilder.AppendLine('    <Feature Id="DesktopShortcutFeature" Title="Desktop Shortcut" Level="1">')
$null = $wxsBuilder.AppendLine('      <ComponentGroupRef Id="DesktopShortcutComponent" />')
$null = $wxsBuilder.AppendLine('    </Feature>')
$null = $wxsBuilder.AppendLine('  </Package>')
$null = $wxsBuilder.AppendLine('')

# Collect all files relative to staging dir, grouped by directory
$allFiles = Get-ChildItem -Recurse -LiteralPath $StagingDir -File | Where-Object {
  -not ($_.Attributes -band [System.IO.FileAttributes]::Hidden -or
        $_.Attributes -band [System.IO.FileAttributes]::System)
}

$dirFiles = @{}
foreach ($file in $allFiles) {
  $relPath = $file.FullName.Substring($StagingDir.Length + 1)
  $dirName = Split-Path $relPath -Parent
  if (-not $dirFiles.ContainsKey($dirName)) { $dirFiles[$dirName] = @() }
  $dirFiles[$dirName] += $relPath
}

$dirIds = @{ "" = "INSTALLFOLDER" }

# Directory fragment
$null = $wxsBuilder.AppendLine('  <Fragment>')
$null = $wxsBuilder.AppendLine('    <StandardDirectory Id="ProgramFiles64Folder">')
$null = $wxsBuilder.AppendLine('      <Directory Id="INSTALLFOLDER" Name="CatChat Dev Tools" />')
$null = $wxsBuilder.AppendLine('    </StandardDirectory>')
$null = $wxsBuilder.AppendLine('    <StandardDirectory Id="ProgramMenuFolder">')
$null = $wxsBuilder.AppendLine('      <Directory Id="ApplicationProgramsFolder" Name="CatChat Dev Tools" />')
$null = $wxsBuilder.AppendLine('    </StandardDirectory>')
$null = $wxsBuilder.AppendLine('    <StandardDirectory Id="DesktopFolder" />')
$null = $wxsBuilder.AppendLine('  </Fragment>')
$null = $wxsBuilder.AppendLine('')

# Subdirectory definitions fragment (nested hierarchy)
$null = $wxsBuilder.AppendLine('  <Fragment>')
$null = $wxsBuilder.AppendLine('    <DirectoryRef Id="INSTALLFOLDER">')

$sortedPaths = $dirFiles.Keys | Where-Object { $_ -ne "" -and $_ -ne $null } | Sort-Object

# Build a tree: path -> @{ children = @{}; name = "..."; id = "..." }
$root = @{ children = @{} }
$dirIdCounter = 0
foreach ($path in $sortedPaths) {
  $parts = $path -split '\\'
  $current = $root
  $built = ""
  foreach ($part in $parts) {
    if ($built -eq "") { $built = $part } else { $built += "\$part" }
    if (-not $current.children.ContainsKey($part)) {
      $dirIdCounter++
      # Use hash of path to keep IDs unique but short
      $pathHash = [System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($built))).Replace("-", "").Substring(0, 8)
      $dirId = "d${dirIdCounter}_${pathHash}"
      $dirIds[$built] = $dirId
      $current.children[$part] = @{ name = $part; id = $dirId; children = @{} }
    }
    $current = $current.children[$part]
  }
}

# Recursively render directory tree
function EmitDirs($node, $indent) {
  [string[]]$keys = $node.children.Keys
  [array]::Sort($keys)
  foreach ($key in $keys) {
    $child = $node.children[$key]
    $hasChildren = ($child.children.Keys.Count -gt 0)
    if ($hasChildren) {
      $null = $wxsBuilder.AppendLine("$indent<Directory Id=`"$($child.id)`" Name=`"$($child.name)`">")
      EmitDirs $child "$indent  "
      $null = $wxsBuilder.AppendLine("$indent</Directory>")
    } else {
      $null = $wxsBuilder.AppendLine("$indent<Directory Id=`"$($child.id)`" Name=`"$($child.name)`" />")
    }
  }
}

EmitDirs $root "      "

$null = $wxsBuilder.AppendLine('    </DirectoryRef>')
$null = $wxsBuilder.AppendLine('  </Fragment>')
$null = $wxsBuilder.AppendLine('')

# Component fragment
$null = $wxsBuilder.AppendLine('  <Fragment>')
$null = $wxsBuilder.AppendLine('    <ComponentGroup Id="ProductComponents">')

$componentGuidCounter = 0
$fileCounter = 0
foreach ($dir in $dirFiles.Keys | Sort-Object) {
  $componentGuidCounter++
  $dirId = $dirIds[$dir]
  # Generate short component IDs using hash
  $compHash = [System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($dir))).Replace("-", "").Substring(0, 8)
  $compId = "c${componentGuidCounter}_${compHash}"
  $null = $wxsBuilder.AppendLine("      <Component Id=`"$compId`" Directory=`"$dirId`" Guid=`"__CGUID_${componentGuidCounter}__`">")

  foreach ($relPath in $dirFiles[$dir]) {
    $sourcePath = "staging\$relPath"
    # Generate short file IDs using hash
    $fileCounter++
    $fileHash = [System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($relPath))).Replace("-", "").Substring(0, 8)
    $fileId = "f${fileCounter}_${fileHash}"
    $null = $wxsBuilder.AppendLine("        <File Id=""$fileId"" Source=""$sourcePath"" />")
  }

  $null = $wxsBuilder.AppendLine("      </Component>")
}

$null = $wxsBuilder.AppendLine('    </ComponentGroup>')
$null = $wxsBuilder.AppendLine('  </Fragment>')
$null = $wxsBuilder.AppendLine('')

# Shortcuts
$null = $wxsBuilder.AppendLine('  <Fragment>')
$null = $wxsBuilder.AppendLine('    <ComponentGroup Id="ShortcutComponents">')
$null = $wxsBuilder.AppendLine('      <Component Id="StartMenuShortcuts"')
$null = $wxsBuilder.AppendLine('                 Guid="A1B2C3D4-E5F6-7890-ABCD-EF1234567890"')
$null = $wxsBuilder.AppendLine('                 Directory="ApplicationProgramsFolder"')
$null = $wxsBuilder.AppendLine('                 Location="local">')
$null = $wxsBuilder.AppendLine('        <Shortcut Id="AppShortcut"')
$null = $wxsBuilder.AppendLine('                  Name="CatChat Dev Tools"')
$null = $wxsBuilder.AppendLine('                  Description="CatChat Dev Tools - Electron app on http://localhost:4444"')
$null = $wxsBuilder.AppendLine('                  Target="[INSTALLFOLDER]bin\electron\electron.exe"')
$null = $wxsBuilder.AppendLine('                  Arguments="&quot;[INSTALLFOLDER]electron-main.cjs&quot;"')
$null = $wxsBuilder.AppendLine('                  WorkingDirectory="INSTALLFOLDER" />')
$null = $wxsBuilder.AppendLine('        <Shortcut Id="UninstallShortcut"')
$null = $wxsBuilder.AppendLine('                  Name="Uninstall CatChat Dev Tools"')
$null = $wxsBuilder.AppendLine('                  Description="Uninstalls CatChat Dev Tools"')
$null = $wxsBuilder.AppendLine('                  Target="[System64Folder]msiexec.exe"')
$null = $wxsBuilder.AppendLine('                  Arguments="/x [ProductCode]" />')
$null = $wxsBuilder.AppendLine('        <RegistryValue Root="HKCU"')
$null = $wxsBuilder.AppendLine('                       Key="Software\CatChat\DevTools"')
$null = $wxsBuilder.AppendLine('                       Name="StartMenuInstalled"')
$null = $wxsBuilder.AppendLine('                       Type="integer"')
$null = $wxsBuilder.AppendLine('                       Value="1"')
$null = $wxsBuilder.AppendLine('                       KeyPath="yes" />')
$null = $wxsBuilder.AppendLine('        <RemoveFolder Id="ApplicationProgramsFolder" On="uninstall" />')
$null = $wxsBuilder.AppendLine('      </Component>')
$null = $wxsBuilder.AppendLine('    </ComponentGroup>')
$null = $wxsBuilder.AppendLine('  </Fragment>')
$null = $wxsBuilder.AppendLine('')

# Desktop shortcut
$null = $wxsBuilder.AppendLine('  <Fragment>')
$null = $wxsBuilder.AppendLine('    <ComponentGroup Id="DesktopShortcutComponent">')
$null = $wxsBuilder.AppendLine('      <Component Id="DesktopShortcut"')
$null = $wxsBuilder.AppendLine('                 Guid="B2C3D4E5-F6A7-8901-BCDE-F12345678901"')
$null = $wxsBuilder.AppendLine('                 Directory="DesktopFolder"')
$null = $wxsBuilder.AppendLine('                 Location="local">')
$null = $wxsBuilder.AppendLine('        <Shortcut Id="DesktopAppShortcut"')
$null = $wxsBuilder.AppendLine('                  Name="CatChat Dev Tools"')
$null = $wxsBuilder.AppendLine('                  Description="CatChat Dev Tools - Electron app on http://localhost:4444"')
$null = $wxsBuilder.AppendLine('                  Target="[INSTALLFOLDER]bin\electron\electron.exe"')
$null = $wxsBuilder.AppendLine('                  Arguments="&quot;[INSTALLFOLDER]electron-main.cjs&quot;"')
$null = $wxsBuilder.AppendLine('                  WorkingDirectory="INSTALLFOLDER" />')
$null = $wxsBuilder.AppendLine('        <RegistryValue Root="HKCU"')
$null = $wxsBuilder.AppendLine('                       Key="Software\CatChat\DevTools"')
$null = $wxsBuilder.AppendLine('                       Name="DesktopShortcutInstalled"')
$null = $wxsBuilder.AppendLine('                       Type="integer"')
$null = $wxsBuilder.AppendLine('                       Value="1"')
$null = $wxsBuilder.AppendLine('                       KeyPath="yes" />')
$null = $wxsBuilder.AppendLine('      </Component>')
$null = $wxsBuilder.AppendLine('    </ComponentGroup>')
$null = $wxsBuilder.AppendLine('  </Fragment>')
$null = $wxsBuilder.AppendLine('')

# Registry
$null = $wxsBuilder.AppendLine('  <Fragment>')
$null = $wxsBuilder.AppendLine('    <ComponentGroup Id="RegistryComponents">')
$null = $wxsBuilder.AppendLine('      <Component Id="ProductInfoRegistry"')
$null = $wxsBuilder.AppendLine('                 Guid="C3D4E5F6-A7B8-9012-CDEF-123456789012"')
$null = $wxsBuilder.AppendLine('                 Directory="INSTALLFOLDER"')
$null = $wxsBuilder.AppendLine('                 Location="local">')
$null = $wxsBuilder.AppendLine('        <RegistryValue Root="HKLM"')
$null = $wxsBuilder.AppendLine('                       Key="Software\CatChat\DevTools"')
$null = $wxsBuilder.AppendLine('                       Name="InstallPath"')
$null = $wxsBuilder.AppendLine('                       Type="string"')
$null = $wxsBuilder.AppendLine('                       Value="[INSTALLFOLDER]"')
$null = $wxsBuilder.AppendLine('                       KeyPath="yes" />')
$null = $wxsBuilder.AppendLine('        <RegistryValue Root="HKLM"')
$null = $wxsBuilder.AppendLine('                       Key="Software\CatChat\DevTools"')
$null = $wxsBuilder.AppendLine('                       Name="Version"')
$null = $wxsBuilder.AppendLine('                       Type="string"')
$null = $wxsBuilder.AppendLine('                       Value="__VERSION__" />')
$null = $wxsBuilder.AppendLine('      </Component>')
$null = $wxsBuilder.AppendLine('    </ComponentGroup>')
$null = $wxsBuilder.AppendLine('  </Fragment>')
$null = $wxsBuilder.AppendLine('')

# App info
$null = $wxsBuilder.AppendLine('  <Fragment>')
$null = $wxsBuilder.AppendLine('    <Property Id="ARPURLINFOABOUT" Value="https://github.com/anomalyco/chat-app-logic" />')
$null = $wxsBuilder.AppendLine('    <Property Id="ARPHELPLINK" Value="https://github.com/anomalyco/chat-app-logic" />')
$null = $wxsBuilder.AppendLine('  </Fragment>')
$null = $wxsBuilder.AppendLine('')
$null = $wxsBuilder.AppendLine('</Wix>')

$wxsContent = $wxsBuilder.ToString()

# Replace placeholders
$wxsContent = $wxsContent.Replace('__VERSION__', $ProductVersion)
for ($i = 1; $i -le $componentGuidCounter; $i++) {
  $wxsContent = $wxsContent.Replace("__CGUID_${i}__", [guid]::NewGuid().ToString("D"))
}

$wxsContent | Set-Content -Path $WxsFile -Encoding UTF8
Write-Host "  Generated WiX source with $fileCounter files across $componentGuidCounter components" -ForegroundColor Green

#  Build MSI 
Write-Host ""
Write-Host "Building MSI..." -ForegroundColor Yellow

$MsiPath = Join-Path $OutputDir $InstallerFile

Push-Location (Split-Path $WxsFile -Parent)
try {
  wix build $WxsFile -o $MsiPath -arch x64 2>&1 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
  }
  if ($LASTEXITCODE -ne 0) {
    throw "WiX build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

#  Done 
if (Test-Path $MsiPath) {
  $msiSize = (Get-Item $MsiPath).Length
  Write-Host ""
  Write-Host " MSI created successfully!" -ForegroundColor Green
  Write-Host "  File : $MsiPath"
  Write-Host "  Size : $([math]::Round($msiSize/1MB, 1)) MB"
  Write-Host ""
  Write-Host "To install run: msiexec /i ""$MsiPath""" -ForegroundColor Cyan
} else {
  Write-Host "[FAIL] MSI was not created!" -ForegroundColor Red
}
