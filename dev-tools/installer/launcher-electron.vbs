Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
LauncherDir = FSO.GetParentFolderName(WScript.ScriptFullName)
ElectronPath = LauncherDir & "\bin\electron\electron.exe"
ScriptPath = LauncherDir & "\electron-main.cjs"

' Create desktop shortcut on first run
DesktopShortcut = WshShell.SpecialFolders("Desktop") & "\CatChat Dev Tools.lnk"
If Not FSO.FileExists(DesktopShortcut) Then
  Set Shortcut = WshShell.CreateShortcut(DesktopShortcut)
  Shortcut.TargetPath = ElectronPath
  Shortcut.Arguments = """" & ScriptPath & """"
  Shortcut.WorkingDirectory = LauncherDir
  Shortcut.Description = "CatChat Dev Tools - Electron app"
  Shortcut.Save
End If

WshShell.Run """" & ElectronPath & """ """ & ScriptPath & """", 0, False
