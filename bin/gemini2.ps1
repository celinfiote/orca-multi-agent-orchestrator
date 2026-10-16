param([Parameter(ValueFromRemainingArguments=$true)]$rest)

# REESCRITO 2026-10-04 -- ver comentario completo em gemini1.ps1. Mesmo mecanismo,
# usuario Linux "gemini2" dentro da mesma distro Ubuntu compartilhada.

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

& wsl.exe -d Ubuntu -u gemini2 -- bash /home/gemini2/launch.sh @agyArgs
