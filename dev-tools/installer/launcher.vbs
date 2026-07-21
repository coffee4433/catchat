Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

LauncherDir = FSO.GetParentFolderName(WScript.ScriptFullName)
ServerPath = LauncherDir & "\server.mjs"

' Kill existing server if running
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr "":4444 "" ^| findstr LISTENING') do taskkill /f /pid %a 2>nul", 0, False

' Start node server silently (0 = hidden window)
WshShell.Run "node """ & ServerPath & """", 0, False

' Wait for server to start
WScript.Sleep 2000

' Try Edge app mode first, fall back to Chrome, then default browser
On Error Resume Next
Err.Clear
WshShell.Run "msedge.exe --app=http://localhost:4444 --new-window", 1, False
If Err.Number <> 0 Then
  Err.Clear
  WshShell.Run "chrome.exe --app=http://localhost:4444 --new-window", 1, False
  If Err.Number <> 0 Then
    Err.Clear
    WshShell.Run "cmd /c start http://localhost:4444", 0, False
  End If
End If
On Error Goto 0
