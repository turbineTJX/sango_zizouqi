Option Explicit
Dim shell, files, root, node, command, result
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = root
node = shell.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe")
If Not files.FileExists(node) Then node = "node"
command = """" & node & """ """ & root & "\scripts\start-desktop.mjs"""
On Error Resume Next
result = shell.Run(command, 0, True)
If Err.Number <> 0 Or result <> 0 Then
  MsgBox "Could not start the desktop game. Run start-desktop.cmd for details.", 16, "Sango"
End If
