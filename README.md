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

You can install the extension directly from the **Visual Studio Code Marketplace**:

<div>
  <a href="https://marketplace.visualstudio.com/items?itemName=0xJihan.json-to-dart-plugin">
    <img src="https://img.shields.io/badge/Install%20from-VS%20Code%20Marketplace-blue?style=for-the-badge&logo=visual-studio-code" alt="Install from VS Code Marketplace" />
  </a>
</div>

### Install via VS Code (Recommended)

1. **Open VS Code**
2. Open the **Extensions View** (`Ctrl+Shift+X`)
3. Search for:
   - **json to dart plugin**
   - or **0xJihan.json-to-dart-plugin**
4. Click **Install**
5. Reload VS Code if prompted

### Install via Marketplace Website

1. Visit:  
   https://marketplace.visualstudio.com/items?itemName=0xJihan.json-to-dart-plugin
2. Click **Install**
3. VS Code will open automatically and install the extension

## Usage

### Context Menu
1. Select and Right Click on Folder where you want to create the model class
2. Select **"JSON to Dart: Generate Class"**
3. Paste your JSON into the input area
4. Select your desired settings (Serialization, Types, Defaults)
5. Click **Generate Dart Code**

### Command palette
1. Open the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Run **"JSON to Dart: Generate Class"**
3. Paste your JSON into the input area
4. Select your desired settings (Serialization, Types, Defaults)
5. Click **Generate Dart Code**

## Why Choose This Extension?

Unlike other JSON to Dart converters, this tool prioritizes **user experience** and **flexibility**. It doesn't just dump code; it gives you control over how that code is generated. Whether you strictly follow `json_serializable` or have a custom architecture, this plugin adapts to your workflow. Plus, it remembers your choices, saving you valuable time.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue on [GitHub](https://github.com/0xJihan/json-to-dart).

## License

MIT
