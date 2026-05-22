# RealDraft AI — One-click setup script (run from realdraft-ai\ folder)
Write-Host "`n=== RealDraft AI Setup ===" -ForegroundColor Cyan

# Backend
Write-Host "`n[1/4] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
Set-Location ..

# Frontend
Write-Host "`n[2/4] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

# Copy .env
Write-Host "`n[3/4] Setting up environment file..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
  Copy-Item "backend\.env.example" "backend\.env"
  Write-Host "  Created backend\.env — EDIT THIS FILE with your API keys!" -ForegroundColor Red
} else {
  Write-Host "  backend\.env already exists — skipping" -ForegroundColor Green
}

Write-Host "`n[4/4] Done! Next steps:" -ForegroundColor Green
Write-Host "  1. Edit backend\.env and add your API keys"
Write-Host "  2. Run your Supabase schema: supabase-schema.sql"
Write-Host "  3. Create a 'documents' storage bucket in Supabase"
Write-Host "  4. Place your PA ASR PDF at: backend\templates\pa-asr-form.pdf"
Write-Host "  5. Start backend:  cd backend && npm run dev"
Write-Host "  6. Start frontend: cd frontend && npm run dev"
Write-Host "  7. Open http://localhost:5173`n"
