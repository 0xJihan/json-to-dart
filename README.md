# JSON to Dart VS Code Extension

Generate Dart data classes from JSON effortlessly. This extension is designed for Flutter and Dart developers who want a fast, customizable, and beautiful tool for model generation.

## Features

- **✨ Beautiful & User-Friendly UI**: A clean, modern interface that fits right into VS Code.
- **🚀 Multiple Serialization Strategies**:
  - **JSON Serializable**: Generates code compatible with `json_serializable` and `build_runner`.
  - **Manual**: Generates standard Dart classes with `fromJson` and `toJson` methods.
  - **Custom**: Define your own annotation formats and imports.
- **⚙️ Advanced Customization**:
  - **Type Detection**: Choose between Auto-detect, Nullable, or Non-nullable types.
  - **Default Values**: Initialize fields with null, non-null defaults, or leave them uninitialized.
- **💾 Persistent Settings**: Your preferences are saved automatically, so you don't have to reconfigure them every time.
- **🔌 Custom Annotations**: Full control over class and property annotations for advanced use cases.

## Installation

1.  Download the `.vsix` file from the [Releases](https://github.com/0xJihan/json-to-dart/releases) page.
2.  Open VS Code.
3.  Go to Extensions view (`Ctrl+Shift+X`).
4.  Click on the "..." menu and select "Install from VSIX...".
5.  Select the downloaded file.

## Usage

1.  Open the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).
2.  Run **"JSON to Dart: Generate Class"**.
3.  Paste your JSON into the input area.
4.  Select your desired settings (Serialization, Types, Defaults).
5.  Click **Generate Dart Code**.

## Why Choose This Extension?

Unlike other JSON to Dart converters, this tool prioritizes **user experience** and **flexibility**. It doesn't just dump code; it gives you control over how that code is generated. Whether you strictly follow `json_serializable` or have a custom architecture, this plugin adapts to your workflow. Plus, it remembers your choices, saving you valuable time.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue on [GitHub](https://github.com/0xJihan/json-to-dart).

## License

MIT
