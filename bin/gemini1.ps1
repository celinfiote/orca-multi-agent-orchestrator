param([Parameter(ValueFromRemainingArguments=$true)]$rest)

# Navega automaticamente para o worktree helios-gemini1
$currentPath = (Get-Location).Path
if (-not ($currentPath -like "*helios-gemini1*")) {
    if (Test-Path "C:\Users\Usuario\Documents\helios-gemini1") {
        Set-Location "C:\Users\Usuario\Documents\helios-gemini1"
    }
}

# REESCRITO 2026-09-05 (usuario reportou "meus 4 agentes gemini estao
# usando a mesma conta fborgesmarcelo@gmail.com" -- pediu explicitamente
# que cada agente consuma tokens de sua propria API key, ja informada).
#
# Historico do que NAO funcionava (ver .claude/skills/orchestra/SKILL.md
# catalogo de erros, entrada 2026-09-05):
# 1. A versao original gravava o token desta conta num item do Windows
#    Credential Manager que nunca era consultado pelo binario usado
#    (agy.exe, "Antigravity CLI") no fluxo de auth silenciosa dele.
# 2. Mesmo redirecionando USERPROFILE/HOME pra isolar ~/.gemini/
#    oauth_creds.json por conta, o agy.exe ainda priorizava keyring do
#    Windows (ChainedAuth) -- que e' um cofre UNICO por usuario do
#    Windows, genuinamente impossivel de isolar por processo/variavel de
#    ambiente. Confirmado lendo o log real do proprio agy.exe.
# 3. Os 4 tokens OAuth salvos em disco (conta1-4_token.txt) resolviam,
#    todos, pro MESMO email (fborgesmarcelo@gmail.com) -- nunca existiram
#    4 contas Google distintas por tras deles.
#
# Fix real: trocado o binario de agy.exe (Antigravity CLI) pra CLI
# oficial do Google (`@google/gemini-cli`, `npm install -g`), que
# respeita `GEMINI_API_KEY` de verdade (confirmado testando -- responde
# sem cair em OAuth quando a variavel esta setada). Cada conta tem sua
# PROPRIA chave em C:\Users\Usuario\.gemini-accounts\contaN\
# gemini_api_key.txt -- isolamento e' por VALOR DA CHAVE, nao mais por
# arquivo de sessao/keyring compartilhado.
$keyFile = "C:\Users\Usuario\.gemini-accounts\conta1\gemini_api_key.txt"
if (Test-Path $keyFile) {
    $key = (Get-Content $keyFile -Raw).Trim()
    if ($key) {
        $env:GEMINI_API_KEY = $key
        $env:GOOGLE_API_KEY = $key
    }
} else {
    Write-Warning "conta1: gemini_api_key.txt nao encontrado -- caindo pro fluxo de login interativo padrao (provavelmente a MESMA conta compartilhada de novo)."
}

# CORRIGIDO 2026-09-07 (usuario pediu "quando eu chamar gemini1,2,3 ou 4
# ja esteja logado" -- ainda caia em prompt de login as vezes mesmo com
# GEMINI_API_KEY setada). Causa raiz real, confirmada lendo o codigo do
# gemini-cli instalado: ele so ignora qualquer sessao OAuth em cache
# quando `selectedAuthType` em `<HOME>/.gemini/settings.json` for
# explicitamente "gemini-api-key" -- e sem isolar USERPROFILE/HOME por
# conta, as 4 chamadas liam o MESMO `C:\Users\Usuario\.gemini\` do
# perfil real do usuario, que tinha um `oauth_creds.json` valido de uma
# sessao pessoal anterior sendo preferido silenciosamente em vez da API
# key. Fix: isola USERPROFILE/HOME pra esta conta -- a pasta dela ja tem
# `.gemini\settings.json` com selectedAuthType=gemini-api-key gravado e
# o oauth_creds.json antigo dela desativado (renomeado .bak_desativado)
# nesta mesma correcao.
$env:USERPROFILE = "C:\Users\Usuario\.gemini-accounts\conta1"
$env:HOME = "C:\Users\Usuario\.gemini-accounts\conta1"

$geminiExe = "C:\Users\Usuario\AppData\Roaming\npm\gemini.cmd"

# A CLI oficial usa flags diferentes da Antigravity CLI antiga:
# --skip-trust (necessario em ambiente headless/nao-interativo, senao ela
# pergunta se confia na pasta), -y/--yolo (equivalente ao antigo
# --dangerously-skip-permissions), -r latest (continuar sessao mais
# recente, equivalente ao antigo -c/--continue). So adiciona -r latest se
# o chamador nao especificou controle de sessao proprio.
$hasSessionControl = $false
foreach ($arg in $rest) {
    if ($arg -match "^(-r|--resume|--session-id|--session-file|--list-sessions|--delete-session)$") {
        $hasSessionControl = $true
        break
    }
}

# CONFIGURADO 2026-09-07 (pedido explicito do usuario: "configure todos
# os agentes gemini para utilizarem o modelo de maior performance
# disponivel"). Testado de verdade contra a API, nao por suposicao:
# gemini-3.1-pro-preview (tier "Pro", teoricamente o mais forte) retorna
# "Quota exceeded ... limit: 0" nesta chave -- o tier Pro simplesmente
# nao esta disponivel no plano gratuito (gemini-2.5-pro tambem nao, a
# API confirma que foi descontinuado pra contas novas). Testei os
# lancamentos mais recentes da linha "Flash" (3.5/3.6/3.7/3.8) e
# gemini-3.8-flash (o mais novo) respondeu normalmente, sem erro de
# quota -- e' o modelo de maior performance que esta chave consegue
# usar de verdade. Se algum dia a conta ganhar acesso a tier Pro,
# trocar pra gemini-3.1-pro-preview (ou o Pro mais novo disponivel
# nesse momento). So aplica -m se o chamador nao especificou um modelo
# proprio.
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
