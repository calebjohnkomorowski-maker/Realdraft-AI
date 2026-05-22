' RealDraft AI — Silent Launcher
' Starts backend + frontend with NO visible windows, then opens browser.

Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

Dim projectDir
projectDir = oFSO.GetParentFolderName(WScript.ScriptFullName)

Dim nodePath
nodePath = "C:\Program Files\nodejs\node.exe"

' ── Start Backend ──────────────────────────────────────────────────────────────
Dim backendCmd
backendCmd = "cmd /c cd /d """ & projectDir & "\backend"" && """ & nodePath & """ server.js"
oShell.Run backendCmd, 0, False   ' 0 = hidden, False = don't wait

' ── Start Frontend ─────────────────────────────────────────────────────────────
Dim viteJs
viteJs = projectDir & "\frontend\node_modules\vite\bin\vite.js"
Dim frontendCmd
frontendCmd = "cmd /c cd /d """ & projectDir & "\frontend"" && """ & nodePath & """ """ & viteJs & """ --port 5173"
oShell.Run frontendCmd, 0, False

' ── Wait for servers to boot, then open browser ────────────────────────────────
WScript.Sleep 4000
oShell.Run "http://localhost:5173", 1, False

WScript.Quit
