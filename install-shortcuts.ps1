# RealDraft AI — Desktop Shortcut Installer
# Run this once: right-click → "Run with PowerShell"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop    = [Environment]::GetFolderPath("Desktop")
$wsh        = New-Object -ComObject WScript.Shell

# ── Launch shortcut ────────────────────────────────────────────────────────────
$launch = $wsh.CreateShortcut("$desktop\RealDraft AI.lnk")
$launch.TargetPath       = "$projectDir\launcher.vbs"
$launch.WorkingDirectory = $projectDir
$launch.Description      = "Start RealDraft AI"
# Use a built-in Windows globe/browser icon
$launch.IconLocation     = "C:\Windows\System32\imageres.dll,15"
$launch.Save()

# ── Stop shortcut ──────────────────────────────────────────────────────────────
$stop = $wsh.CreateShortcut("$desktop\Stop RealDraft AI.lnk")
$stop.TargetPath       = "$projectDir\stopper.vbs"
$stop.WorkingDirectory = $projectDir
$stop.Description      = "Stop RealDraft AI servers"
$stop.IconLocation     = "C:\Windows\System32\imageres.dll,220"
$stop.Save()

Write-Host ""
Write-Host "  ✅ Shortcuts created on your Desktop:" -ForegroundColor Green
Write-Host "     • RealDraft AI        — double-click to launch" -ForegroundColor Cyan
Write-Host "     • Stop RealDraft AI   — double-click to shut down" -ForegroundColor Cyan
Write-Host ""
Start-Sleep -Seconds 3
