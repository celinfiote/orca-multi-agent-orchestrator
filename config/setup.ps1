# config/setup.ps1
# Script de Configuração e Instalação do Ambiente Multi-Agente Orca + Antigravity

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Instalando Orca Multi-Agent Orchestrator (Windows / PowerShell)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $baseDir "bin"
$agyBin = "$env:LOCALAPPDATA\agy\bin"

if (-not (Test-Path $agyBin)) {
    New-Item -ItemType Directory -Path $agyBin -Force | Out-Null
}

Write-Host "`n[1/3] Copiando executáveis e wrappers (.ps1) para $agyBin..." -ForegroundColor Yellow
Copy-Item "$binDir\gemini1.ps1" "$agyBin\gemini1.ps1" -Force
Copy-Item "$binDir\gemini2.ps1" "$agyBin\gemini2.ps1" -Force
Copy-Item "$binDir\glm.ps1" "$agyBin\glm.ps1" -Force

Write-Host "`n[2/3] Verificando PATH do sistema..." -ForegroundColor Yellow
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$agyBin*") {
    [Environment]::SetEnvironmentVariable("PATH", "$userPath;$agyBin", "User")
    Write-Host "  ✔ Adicionado $agyBin ao PATH do usuário." -ForegroundColor Green
} else {
    Write-Host "  ✔ PATH já configurado." -ForegroundColor Green
}

Write-Host "`n[3/3] Inicializando Servidor Live Preview..." -ForegroundColor Yellow
$livePreviewDir = Join-Path $baseDir "live-preview"
if (Test-Path "$livePreviewDir\server.js") {
    Write-Host "  ✔ Servidor Live Preview pronto em $livePreviewDir\server.js" -ForegroundColor Green
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "🎉 Instalação concluída com sucesso!" -ForegroundColor Green
Write-Host "Comandos disponíveis no terminal:" -ForegroundColor White
Write-Host "  • gemini1  -> Inicia o agente Gemini 1 (Conta Google 1 - Visual/VFX/Arte)" -ForegroundColor Cyan
Write-Host "  • gemini2  -> Inicia o agente Gemini 2 (Conta Google 2 - Supervisor/UI/Net)" -ForegroundColor Cyan
Write-Host "  • glm      -> Inicia o agente GLM 5.2 (NVIDIA NIM 550B - Funções Puras)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
