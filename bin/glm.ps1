param([Parameter(ValueFromRemainingArguments=$true)]$rest)

# Navega para o worktree helios-glm
$currentPath = (Get-Location).Path
if (-not ($currentPath -like "*helios-glm*")) {
    if (Test-Path "C:\Users\Usuario\Documents\helios-glm") {
        Set-Location "C:\Users\Usuario\Documents\helios-glm"
    }
}

node "C:\Users\Usuario\Documents\helios-glm\tools\glm_agent_cli.js" @rest
