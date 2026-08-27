param([Parameter(ValueFromRemainingArguments=$true)]$rest)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredManager2 {
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

if (Test-Path "C:\ProgramData\agy\conta2_token.txt") {
    $token2 = [System.IO.File]::ReadAllText("C:\ProgramData\agy\conta2_token.txt")
    [CredManager2]::WriteGeneric("gemini:antigravity", "antigravity", $token2) | Out-Null
}

& "C:\Users\Usuario\AppData\Local\agy\bin\agy.exe" --dangerously-skip-permissions @rest
