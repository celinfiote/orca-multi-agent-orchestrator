$sig = @'
using System;
using System.Runtime.InteropServices;
public class WinUtil {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
}
'@
Add-Type -TypeDefinition $sig -Language CSharp
$procs = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Orca Live Preview*' }
if ($procs.Count -eq 0) {
    # If not found yet, try opening
    Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList '--app=http://localhost:54321', '--window-size=960,720', '--window-position=150,100'
} else {
    foreach ($p in $procs) {
        [WinUtil]::ShowWindow($p.MainWindowHandle, 9)
        [WinUtil]::SetForegroundWindow($p.MainWindowHandle)
        [WinUtil]::SwitchToThisWindow($p.MainWindowHandle, $true)
    }
}
Write-Output "Live preview window focus done."
