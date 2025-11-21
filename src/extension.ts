
import * as vscode from 'vscode';
import { JsonToDartPanel } from './JsonToDartPanel';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('jsonToDart.start', () => {
            JsonToDartPanel.createOrShow(context);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('jsonToDart.generateFromContext', async (uri: vscode.Uri) => {
            if (uri && uri.fsPath) {
                JsonToDartPanel.createOrShow(context, uri.fsPath);
            } else {
                vscode.window.showErrorMessage('Please select a folder to generate the Dart class.');
            }
        })
    );
}

export function deactivate() { }
