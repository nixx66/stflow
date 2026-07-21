Option Explicit

Dim shell, fso, root, nodeExe, serverScript, command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = "C:\Users\yaoxt\AppData\Local\hermes\node\node.exe"
serverScript = root & "\stflow-server.js"

If Not fso.FileExists(nodeExe) Then
  nodeExe = "node"
End If

If Not fso.FileExists(serverScript) Then
  MsgBox "stflow-server.js was not found.", 16, "STFlow"
  WScript.Quit 1
End If

shell.CurrentDirectory = root
command = "cmd.exe /c cd /d """ & root & """ && """ & nodeExe & """ """ & serverScript & """"
shell.Run command, 0, False
