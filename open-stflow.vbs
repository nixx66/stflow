Option Explicit

Dim shell, fso, root, bundledNode, nodeExe, serverScript, command, url, ready, attempt, http
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
bundledNode = "C:\Users\yaoxt\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
serverScript = root & "\stflow-server.js"
url = "http://127.0.0.1:3001"

If fso.FileExists(bundledNode) Then
  nodeExe = bundledNode
Else
  nodeExe = "node"
End If

If Not fso.FileExists(serverScript) Then
  MsgBox "stflow-server.js was not found.", 16, "STFlow"
  WScript.Quit 1
End If

shell.CurrentDirectory = root
command = "cmd.exe /k """"" & nodeExe & """ """ & serverScript & """"""
shell.Run command, 0, False

ready = False
For attempt = 1 To 60
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.Open "GET", url, False
  http.Send
  If Err.Number = 0 Then
    If http.Status >= 200 And http.Status < 500 Then
      ready = True
      Exit For
    End If
  End If
  Err.Clear
  On Error GoTo 0
  WScript.Sleep 1000
Next

shell.Run url, 1, False

If Not ready Then
  MsgBox "STFlow is still starting. If the page is blank, wait a few seconds and refresh." & vbCrLf & vbCrLf & "Log file: " & root & "\stflow-server.log", 48, "STFlow"
End If
