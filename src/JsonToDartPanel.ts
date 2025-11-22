import * as vscode from 'vscode';
import * as path from 'path';
import { DartClassGenerator } from './generator/DartClassGenerator';
import { GeneratorSettings } from './generator/types';

export class JsonToDartPanel {
    public static currentPanel: JsonToDartPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(context: vscode.ExtensionContext, initialPath?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (JsonToDartPanel.currentPanel) {
            JsonToDartPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'jsonToDart',
            'JSON to Dart',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media')
                ]
            }
        );

        JsonToDartPanel.currentPanel = new JsonToDartPanel(panel, context.extensionUri, context, initialPath);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext,
        private readonly _initialPath?: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message: { command: string; data: any; text?: string }) => {
                switch (message.command) {
                    case 'generate':
                        try {
                            const settings: GeneratorSettings = {
                                serialization: message.data.serialization,
                                typeSetting: message.data.typeSetting,
                                defaultValue: message.data.defaultValue,
                                namingConvention: message.data.namingConvention,
                                sort: message.data.sort,
                                customSettings: message.data.customSettings
                            };


                            await this._context.globalState.update('jsonToDartSettings', settings);

                            const generator = new DartClassGenerator(settings);
                            const code = generator.generate(message.data.json, message.data.className);

                            if (this._initialPath) {
                                const fileName = this._toSnakeCase(message.data.className || 'generated_class') + '.dart';
                                const filePath = vscode.Uri.file(path.join(this._initialPath, fileName));

                                // Check if file exists
                                try {
                                    await vscode.workspace.fs.stat(filePath);
                                    // File exists, ask for confirmation
                                    const answer = await vscode.window.showWarningMessage(
                                        `File ${fileName} already exists. Do you want to overwrite it?`,
                                        'Overwrite',
                                        'Cancel'
                                    );

                                    if (answer !== 'Overwrite') {
                                        return;
                                    }
                                } catch {
                                    // File does not exist, proceed
                                }

                                const encoder = new TextEncoder();
                                await vscode.workspace.fs.writeFile(filePath, encoder.encode(code));
                                vscode.window.showInformationMessage(`Generated ${fileName}`);
                                this.dispose();
                            } else {
                                const doc = await vscode.workspace.openTextDocument({
                                    content: code,
                                    language: 'dart'
                                });
                                await vscode.window.showTextDocument(doc);
                            }
                        } catch (e: any) {
                            vscode.window.showErrorMessage('Error generating code: ' + e.message);
                        }
                        return;
                    case 'alert':
                        vscode.window.showErrorMessage(message.text || 'Alert');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        JsonToDartPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));


        const savedSettings = this._context.globalState.get<GeneratorSettings>('jsonToDartSettings');
        const settingsJson = savedSettings ? JSON.stringify(savedSettings) : 'null';

        return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>JSON to Dart</title>
      </head>
      <body>
        <div class="container">
            <h1>JSON to Dart</h1>

            <div class="section">
                <label for="class-name">Root Class Name</label>
                <input type="text" id="class-name" placeholder="UserData">
            </div>

            <div class="section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label for="json-input" style="margin-bottom: 0;">JSON Data</label>
                    <button id="advanced-btn" class="secondary-btn">Settings</button>
                </div>
                <textarea id="json-input" placeholder="Paste your JSON here..."></textarea>
            </div>

            <div class="controls">
                <button id="generate-btn">Generate Dart Code</button>
            </div>

            <div id="advanced-modal" class="modal hidden">
                <div class="modal-content">
                    <span class="close-btn">&times;</span>
                    <h2 style="margin-top: 0;">Advanced Settings</h2>
                    
                    <div class="section">
                        <h3>Serialization Strategy</h3>
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="serialization" value="json_serializable" checked>
                                json_serializable
                            </label>

                            <label>
                                <input type="radio" name="serialization" value="manual">
                                Manual Model Creation
                            </label>
                            <label>
                                <input type="radio" name="serialization" value="custom">
                                Custom Annotations
                            </label>
                        </div>

                    </div>

                    <div id="custom-options" class="section hidden">
                        <h3>Custom Annotations</h3>
                        <div class="input-group">
                            <label for="import-stmt">Annotation Import</label>
                            <textarea id="import-stmt" rows="2" placeholder="import 'package:json_annotation/json_annotation.dart';"></textarea>
                        </div>
                        <div class="input-group">
                            <label for="class-annotation">Class Annotation</label>
                            <textarea id="class-annotation" rows="2" placeholder="@JsonSerializable()"></textarea>
                        </div>
                        <div class="input-group">
                            <label for="property-annotation">Property Annotation</label>
                            <textarea id="property-annotation" rows="2" placeholder="@JsonKey(name: '%s')"></textarea>
                        </div>
                    </div>

                    <div class="section">
                        <h3>Type Settings</h3>
                        <div class="radio-group">
                            <label><input type="radio" name="type-setting" value="auto" checked> Auto-detect</label>
                            <label><input type="radio" name="type-setting" value="nullable"> Nullable</label>
                            <label><input type="radio" name="type-setting" value="non-nullable"> Non-nullable</label>
                        </div>

                        <h3>Default Value Strategy</h3>
                        <div class="radio-group">
                            <label><input type="radio" name="default-value" value="none" checked> Do not initialize</label>
                            <label><input type="radio" name="default-value" value="non-null"> Initialize with non-null default</label>
                            <label><input type="radio" name="default-value" value="null"> Initialize with null</label>
                        </div>

                        <h3>Naming Convention</h3>
                        <div class="radio-group">
                            <label><input type="radio" name="naming-convention" value="camelCase" checked> camelCase</label>
                            <label><input type="radio" name="naming-convention" value="snake_case"> snake_case</label>
                            <label><input type="radio" name="naming-convention" value="PascalCase"> PascalCase</label>
                        </div>

                        <h3>Sorting</h3>
                        <div class="checkbox-group">
                            <label><input type="checkbox" id="sort-properties"> Sort properties alphabetically</label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>Developed by <a href="https://github.com/0xJihan">0xJihan</a></p>
            </div>
        </div>
        <script>
            window.initialSettings = ${settingsJson};
        </script>
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
    }

    private _toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}
