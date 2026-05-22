' RealDraft AI — Silent Stopper
' Kills all Node.js processes (backend + frontend).

Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c taskkill /f /im node.exe", 0, True
MsgBox "RealDraft AI has been stopped.", vbInformation, "RealDraft AI"
