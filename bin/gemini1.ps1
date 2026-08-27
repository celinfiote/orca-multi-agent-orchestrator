param([Parameter(ValueFromRemainingArguments=$true)]$rest)

# Navega automaticamente para o worktree helios-gemini1
$currentPath = (Get-Location).Path
if (-not ($currentPath -like "*helios-gemini1*")) {
    if (Test-Path "C:\Users\Usuario\Documents\helios-gemini1") {
        Set-Location "C:\Users\Usuario\Documents\helios-gemini1"
    }
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredManager1 {
    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredWrite([In] ref CREDENTIAL userCredential, int flags);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static bool WriteGeneric(string target, string userName, string secret) {
        byte[] bytes = Encoding.UTF8.GetBytes(secret);
        IntPtr blobPtr = Marshal.AllocHGlobal(bytes.Length);
        Marshal.Copy(bytes, 0, blobPtr, bytes.Length);

        CREDENTIAL cred = new CREDENTIAL();
        cred.Flags = 0;
        cred.Type = 1;
        cred.TargetName = target;
        cred.UserName = userName;
        cred.CredentialBlobSize = bytes.Length;
        cred.CredentialBlob = blobPtr;
        cred.Persist = 2;

        bool result = CredWrite(ref cred, 0);
        Marshal.FreeHGlobal(blobPtr);
        return result;
    }
}
"@ -ErrorAction SilentlyContinue

if (Test-Path "C:\Users\Usuario\.gemini\conta1_token.txt") {
    $token1 = [System.IO.File]::ReadAllText("C:\Users\Usuario\.gemini\conta1_token.txt")
    [CredManager1]::WriteGeneric("gemini:antigravity", "antigravity", $token1) | Out-Null
}

$hasContinueOrNew = $false
foreach ($arg in $rest) {
    if ($arg -match "^(-c|--continue|--conversation|--new-project)$") {
        $hasContinueOrNew = $true
        break
    }
}

if (-not $hasContinueOrNew) {
    & "C:\Users\Usuario\AppData\Local\agy\bin\agy.exe" -c --dangerously-skip-permissions @rest
} else {
    & "C:\Users\Usuario\AppData\Local\agy\bin\agy.exe" --dangerously-skip-permissions @rest
}
