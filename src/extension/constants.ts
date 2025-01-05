import * as vscode from "vscode";


export const workspaceRoot: string | undefined = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath).at(0);
export const extensionPath: string = vscode.extensions.getExtension("julesmons.recline")!.extensionPath;
