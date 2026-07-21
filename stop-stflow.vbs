Option Explicit

Dim shell
Set shell = CreateObject("WScript.Shell")

shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }""", 0, True
MsgBox "STFlow local server has been stopped.", 64, "STFlow"
