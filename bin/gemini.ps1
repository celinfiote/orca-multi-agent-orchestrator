param([string]$target = "1", [Parameter(ValueFromRemainingArguments=$true)]$rest)
if ($target -eq "2") {
    & "$PSScriptRoot\gemini2.ps1" @rest
} elseif ($target -eq "3") {
    & "$PSScriptRoot\gemini3.ps1" @rest
} else {
    & "$PSScriptRoot\gemini1.ps1" @rest
}
