import * as vscode from "vscode";


// Get workspace root path - used for relative path calculations
export const workspaceRoot: string | undefined = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath).at(0);
