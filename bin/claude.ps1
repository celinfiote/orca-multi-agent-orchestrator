param([Parameter(ValueFromRemainingArguments=$true)]$rest)

# Navega automaticamente para o worktree helios-claude
$currentPath = (Get-Location).Path
if (-not ($currentPath -like "*helios-claude*")) {
    if (Test-Path "C:\Users\Usuario\Documents\helios-claude") {
        Set-Location "C:\Users\Usuario\Documents\helios-claude"
    }
}

$hasContinueOrNew = $false
foreach ($arg in $rest) {
    if ($arg -match "^(-c|--continue|-r|--resume)$") {
        $hasContinueOrNew = $true
        break
    }
}

if (-not $hasContinueOrNew) {
    & "C:\Users\Usuario\.local\bin\claude.exe" -c @rest
} else {
    & "C:\Users\Usuario\.local\bin\claude.exe" @rest
}
