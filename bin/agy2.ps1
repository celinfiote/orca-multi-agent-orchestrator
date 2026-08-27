$oldUserProfile = $env:USERPROFILE
$oldHome = $env:HOME
try {
    $env:USERPROFILE = "C:\Users\Usuario\.agy-conta2"
    $env:HOME = "C:\Users\Usuario\.agy-conta2"
    & "$PSScriptRoot\agy.exe" @args
} finally {
    $env:USERPROFILE = $oldUserProfile
    $env:HOME = $oldHome
}
