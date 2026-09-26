param([Parameter(ValueFromRemainingArguments=$true)]$rest)

# Navega automaticamente para o worktree helios-gemini3
$currentPath = (Get-Location).Path
if (-not ($currentPath -like "*helios-gemini3*")) {
    if (Test-Path "C:\Users\Usuario\Documents\helios-gemini3") {
        Set-Location "C:\Users\Usuario\Documents\helios-gemini3"
    }
}

# REESCRITO 2026-09-05 -- ver comentario completo em gemini1.ps1 (mesma
# causa raiz: agy.exe/Antigravity CLI so autentica via keyring do Windows,
# unico por usuario, impossivel de isolar por conta; trocado pra CLI
# oficial do Google com API key propria por conta).
#
# PENDENTE: esta conta (conta3) ainda nao tem uma chave real cadastrada
# -- ver C:\Users\Usuario\.gemini-accounts\conta3\gemini_api_key.txt.PENDENTE.
# Gere uma em https://aistudio.google.com/apikey e salve o conteudo (so a
# chave) em C:\Users\Usuario\.gemini-accounts\conta3\gemini_api_key.txt
# (sem o sufixo .PENDENTE) para esta conta parar de cair no login
# interativo compartilhado.
$keyFile = "C:\Users\Usuario\.gemini-accounts\conta3\gemini_api_key.txt"
if (Test-Path $keyFile) {
    $key = (Get-Content $keyFile -Raw).Trim()
    if ($key) {
        $env:GEMINI_API_KEY = $key
        $env:GOOGLE_API_KEY = $key
    }
} else {
    Write-Warning "conta3: gemini_api_key.txt nao encontrado -- caindo pro fluxo de login interativo padrao (provavelmente a MESMA conta compartilhada de novo). Gere uma chave em https://aistudio.google.com/apikey."
}

# CORRIGIDO 2026-09-07 -- ver comentario completo em gemini1.ps1 (mesma
# causa raiz: sem isolar USERPROFILE/HOME por conta, a CLI lia o
# `oauth_creds.json` do perfil real compartilhado em vez da API key).
$env:USERPROFILE = "C:\Users\Usuario\.gemini-accounts\conta3"
$env:HOME = "C:\Users\Usuario\.gemini-accounts\conta3"

$geminiExe = "C:\Users\Usuario\AppData\Roaming\npm\gemini.cmd"

$hasSessionControl = $false
foreach ($arg in $rest) {
    if ($arg -match "^(-r|--resume|--session-id|--session-file|--list-sessions|--delete-session)$") {
        $hasSessionControl = $true
        break
    }
}

# CONFIGURADO 2026-09-07 -- ver comentario completo em gemini1.ps1
# (modelo de maior performance disponivel QUE FUNCIONA nesta chave
# gratuita: gemini-3.8-flash -- tier "Pro", incluindo o mais novo
# gemini-3.1-pro-preview, retorna quota=0 no plano gratuito, testado
# de verdade contra a API).
$hasModelControl = $false
foreach ($arg in $rest) {
    if ($arg -match "^(-m|--model)$") {
        $hasModelControl = $true
        break
    }
}
$modelArgs = if (-not $hasModelControl) { @("-m", "gemini-3.8-flash") } else { @() }

if (-not $hasSessionControl) {
    & $geminiExe --skip-trust --yolo @modelArgs -r latest @rest
} else {
    & $geminiExe --skip-trust --yolo @modelArgs @rest
}
