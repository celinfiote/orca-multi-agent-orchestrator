using System;
using System.Runtime.InteropServices;
using System.Text;

namespace OrcaMultiAgent.Core
{
    /// <summary>
    /// Gerenciador de Credenciais do Windows via P/Invoke (advapi32.dll).
    /// Permite a injeção atômica de tokens de autenticação isolados por conta do Google Antigravity,
    /// possibilitando a execução concorrente de múltiplos agentes Gemini sem conflito de sessão.
    /// </summary>
    public class CredManager
    {
        [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredWrite([In] ref CREDENTIAL userCredential, int flags);

        [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredRead(string target, int type, int flags, out IntPtr credentialPtr);

        [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
        public static extern void CredFree([In] IntPtr buffer);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct CREDENTIAL
        {
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

        public static bool WriteGeneric(string target, string userName, string secret)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(secret);
            IntPtr blobPtr = Marshal.AllocHGlobal(bytes.Length);
            Marshal.Copy(bytes, 0, blobPtr, bytes.Length);

            CREDENTIAL cred = new CREDENTIAL
            {
                Flags = 0,
                Type = 1, // CRED_TYPE_GENERIC
                TargetName = target,
                UserName = userName,
                CredentialBlobSize = bytes.Length,
                CredentialBlob = blobPtr,
                Persist = 2 // CRED_PERSIST_LOCAL_MACHINE
            };

            bool result = CredWrite(ref cred, 0);
            Marshal.FreeHGlobal(blobPtr);
            return result;
        }
    }
}
