@echo off
runas /savecred /user:gemini2 "powershell -NoExit -Command Set-Location 'C:\Users\Usuario\Documents\helios-gemini2'; & 'C:\ProgramData\agy\bin\agy.exe' -c"
