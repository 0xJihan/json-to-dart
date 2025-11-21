 # JSON to Dart Plugin

Convert JSON data into Dart model classes instantly. Supports `json_serializable`, manual serialization, and custom annotations.

## Features

- **Instant Conversion**: Paste JSON and get Dart code.
- **Multiple Strategies**:
  - `json_serializable` (with `@JsonSerializable`, `fromJson`, `toJson`)
  - Manual serialization (simple `fromJson`, `toJson`)
  - Custom annotations
- **Type Safety**: Auto-detection of types, with options for nullable/non-nullable fields.
- **Default Values**: Option to initialize fields with default values.

## How to Use Locally

1.  **Open the Project**: Open this folder in VS Code.
2.  **Install Dependencies**: Run `npm install` in the terminal.
3.  **Run the Extension**:
    - Press `F5` (or go to **Run and Debug** > **Run Extension**).
    - A new VS Code window ("Extension Development Host") will open.
4.  **Use the Command**:
    - In the new window, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac).
    - Type `JSON to Dart: Generate Class` and select it.
    - The extension panel will open. Paste your JSON and click **Generate Dart Code**.

## How to Distribute (GitHub)

To share this extension on GitHub so others can download and use it:

1.  **Initialize Git**:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  **Push to GitHub**: Create a new repository on GitHub and follow the instructions to push your code.
3.  **Package for Installation** (Optional but recommended):
    - Install `vsce`: `npm install -g @vscode/vsce`
    - Package the extension: `vsce package`
    - This creates a `.vsix` file (e.g., `json-to-dart-plugin-0.0.1.vsix`).
    - You can upload this `.vsix` file to your GitHub Releases.
    - Users can install it by going to **Extensions** > **...** > **Install from VSIX...**.

## Requirements

- VS Code 1.80.0 or higher
