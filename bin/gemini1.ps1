param([Parameter(ValueFromRemainingArguments=$true)]$rest)

# REESCRITO 2026-10-04 -- isolamento real via WSL (usuario Linux "gemini1" dentro da
# distro Ubuntu compartilhada), CLI nativa Linux do Antigravity instalada em
# ~/.local/bin/agy daquele usuario. Credencial OAuth vive no $HOME do usuario Linux,
# sem nenhuma dependencia do Credential Manager do Windows -- confirmado isolado de
# verdade (contas distintas, testadas simultaneamente, sobrevive a reinicio do WSL).
# Digitar "gemini1" aqui entra direto, sem atalho manual, sem Executar-como-outro-
# usuario -- essa e' a unica forma suportada agora.
#
# ~/launch.sh (dentro do WSL, identico pros 4 usuarios) faz cd pro worktree REAL via
# /mnt/c (nao uma copia dentro do filesystem do WSL) e roda o agy -- args passados
# como array direto pro wsl.exe, sem concatenar string (evita problema de aspas/;).

$hasSessionControl = $false
foreach ($arg in $rest) {
    if ($arg -match "^(-c|--continue|--conversation|--new-project)$") {
        $hasSessionControl = $true
        break
    }
}

$agyArgs = @()
if (-not $hasSessionControl) { $agyArgs += "-c" }
$agyArgs += "--dangerously-skip-permissions"
$agyArgs += "--add-dir"
$agyArgs += "/mnt/c/Users/Usuario/Documents/celin-hub"
$agyArgs += $rest

& wsl.exe -d Ubuntu -u gemini1 -- bash /home/gemini1/launch.sh @agyArgs
