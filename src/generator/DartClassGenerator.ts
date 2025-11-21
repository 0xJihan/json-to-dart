import { GeneratorSettings, ClassDefinition, FieldDefinition } from './types';

export class DartClassGenerator {
    constructor(private settings: GeneratorSettings) { }

    public generate(jsonString: string, rootClassName: string = 'Root'): string {
        try {
            const json = JSON.parse(jsonString);
            const classes: ClassDefinition[] = [];
            this.parseObject(json, rootClassName, classes);
            return this.generateDartCode(classes, rootClassName);
        } catch (e) {
            throw new Error('Invalid JSON');
        }
    }

    private parseObject(obj: any, className: string, classes: ClassDefinition[]) {
        const fields: FieldDefinition[] = [];

        for (const key in obj) {
            const value = obj[key];
            const type = this.getType(value, key, classes);
            const isNullable = this.isNullable(key);

            fields.push({
                name: this.formatName(key),
                type: type,
                isNullable: isNullable,
                jsonKey: key
            });
        }

        if (this.settings.sort) {
            fields.sort((a, b) => a.name.localeCompare(b.name));
        }

        classes.push({
            name: className,
            fields: fields
        });
    }

    private getType(value: any, key: string, classes: ClassDefinition[]): string {
        if (value === null) {
            return 'dynamic';
        }
        if (typeof value === 'string') {
            return 'String';
        }
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'int' : 'double';
        }
        if (typeof value === 'boolean') {
            return 'bool';
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return 'List<dynamic>';
            }
            const innerType = this.getType(value[0], key, classes);
            return `List<${innerType}>`;
        }
        if (typeof value === 'object') {
            const className = this.capitalize(this.toCamelCase(key));
            this.parseObject(value, className, classes);
            return className;
        }
        return 'dynamic';
    }

    private isNullable(key: string): boolean {
        if (this.settings.typeSetting === 'nullable') {
            return true;
        }
        if (this.settings.typeSetting === 'non-nullable') {
            return false;
        }
        return true; // Default to nullable for auto
    }

    private generateDartCode(classes: ClassDefinition[], rootClassName: string): string {
        let code = '';

        // Merge json_serializable and useJsonAnnotation logic
        const isJsonSerializable = this.settings.serialization === 'json_serializable';
        const useAnnotation = isJsonSerializable || this.settings.useJsonAnnotation;

        if (useAnnotation) {
            code += "import 'package:json_annotation/json_annotation.dart';\n\n";
        }

        if (isJsonSerializable) {
            const partName = this.toSnakeCase(rootClassName);
            code += `part '${partName}.g.dart';\n\n`;
        } else if (this.settings.serialization === 'custom' && this.settings.customSettings?.import) {
            code += `${this.settings.customSettings.import}\n\n`;
        }

        for (const cls of classes.reverse()) {
            code += this.generateClass(cls);
            code += '\n';
        }

        return code;
    }

    private generateClass(cls: ClassDefinition): string {
        let code = '';
        const isJsonSerializable = this.settings.serialization === 'json_serializable';

        if (isJsonSerializable) {
            code += '@JsonSerializable()\n';
        } else if (this.settings.serialization === 'custom' && this.settings.customSettings?.classAnnotation) {
            code += `${this.settings.customSettings.classAnnotation}\n`;
        }

        code += `class ${cls.name} {\n`;

        for (const field of cls.fields) {
            const defaultValue = this.getDefaultValueLiteral(field.type);
            const hasDefault = this.settings.defaultValue === 'non-null' && defaultValue !== 'null';


            const isNullable = field.isNullable && !hasDefault;

            if (isJsonSerializable) {
                if (hasDefault) {
                    code += `  @JsonKey(defaultValue: ${defaultValue})\n`;
                }
            } else if (this.settings.serialization === 'custom' && this.settings.customSettings?.propertyAnnotation) {
                code += `  ${this.settings.customSettings.propertyAnnotation.replace('%s', field.jsonKey)}\n`;
            }

            const isFinal = true;
            const typeStr = field.type + (isNullable ? '?' : '');
            code += `  ${isFinal ? 'final ' : ''}${typeStr} ${field.name};\n`;
        }

        code += '\n';

        // Constructor
        code += `  ${cls.name}({`;
        code += cls.fields.map(f => {
            const defaultValue = this.getDefaultValueLiteral(f.type);
            const hasDefault = this.settings.defaultValue === 'non-null' && defaultValue !== 'null';
            const isNullable = f.isNullable && !hasDefault;

            if (hasDefault) {
                return `this.${f.name} = ${defaultValue}`;
            } else {
                const required = !isNullable ? 'required ' : '';
                return `${required}this.${f.name}`;
            }
        }).join(', ');
        code += '});\n\n';

        if (isJsonSerializable) {
            code += `  factory ${cls.name}.fromJson(Map<String, dynamic> json) => _$${cls.name}FromJson(json);\n`;
            code += `  Map<String, dynamic> toJson() => _$${cls.name}ToJson(this);\n`;
        } else if (this.settings.serialization === 'manual') {
            // Manual fromJson with initializer list for final fields
            code += `  factory ${cls.name}.fromJson(Map<String, dynamic> json) {\n`;
            code += `    return ${cls.name}(\n`;
            code += cls.fields.map(f => {
                let valueExpression = `json['${f.jsonKey}']`;

                // Handle List mapping
                if (f.type.startsWith('List<')) {
                    const innerType = f.type.substring(5, f.type.length - 1);
                    if (innerType !== 'dynamic' && innerType !== 'String' && innerType !== 'int' && innerType !== 'double' && innerType !== 'bool') {
                        // List of objects
                        valueExpression = `(json['${f.jsonKey}'] as List<dynamic>?)?.map((e) => ${innerType}.fromJson(e as Map<String, dynamic>)).toList() ?? []`;
                    } else {
                        // List of primitives
                        // If it's a list of primitives, we might need to cast
                        if (f.isNullable) {
                            valueExpression = `(json['${f.jsonKey}'] as List<dynamic>?)?.map((e) => e as ${innerType}).toList()`;
                        } else {
                            valueExpression = `(json['${f.jsonKey}'] as List<dynamic>?)?.map((e) => e as ${innerType}).toList() ?? []`;
                        }
                    }
                } else if (f.type !== 'dynamic' && f.type !== 'String' && f.type !== 'int' && f.type !== 'double' && f.type !== 'bool') {
                    // Complex object
                    if (f.isNullable) {
                        valueExpression = `json['${f.jsonKey}'] == null ? null : ${f.type}.fromJson(json['${f.jsonKey}'] as Map<String, dynamic>)`;
                    } else {
                        // If non-nullable but complex, we need to decide how to handle null json. 
                        // Usually throw or use default if possible. For now, assume json is valid or throw.
                        valueExpression = `${f.type}.fromJson(json['${f.jsonKey}'] as Map<String, dynamic>)`;
                    }
                } else {
                    // Primitive
                    if (f.type === 'double') {
                        valueExpression = `(json['${f.jsonKey}'] as num?)?.toDouble()`;
                        if (!f.isNullable && this.settings.defaultValue === 'non-null') {
                            valueExpression += ` ?? 0.0`;
                        }
                    } else if (f.type === 'int') {
                        valueExpression = `(json['${f.jsonKey}'] as num?)?.toInt()`;
                        if (!f.isNullable && this.settings.defaultValue === 'non-null') {
                            valueExpression += ` ?? 0`;
                        }
                    } else if (f.type === 'String') {
                        valueExpression = `json['${f.jsonKey}'] as String?`;
                        if (!f.isNullable && this.settings.defaultValue === 'non-null') {
                            valueExpression += ` ?? ''`;
                        }
                    } else if (f.type === 'bool') {
                        valueExpression = `json['${f.jsonKey}'] as bool?`;
                        if (!f.isNullable && this.settings.defaultValue === 'non-null') {
                            valueExpression += ` ?? false`;
                        }
                    }
                }

                return `      ${f.name}: ${valueExpression},`;
            }).join('\n');
            code += `\n    );\n`;
            code += `  }\n\n`;

            // Manual toJson
            code += `  Map<String, dynamic> toJson() {\n`;
            code += `    final Map<String, dynamic> data = <String, dynamic>{};\n`;
            for (const field of cls.fields) {
                let valueExpression = `this.${field.name}`;
                if (field.type.startsWith('List<')) {
                    const innerType = field.type.substring(5, field.type.length - 1);
                    if (innerType !== 'dynamic' && innerType !== 'String' && innerType !== 'int' && innerType !== 'double' && innerType !== 'bool') {
                        // List of objects
                        if (field.isNullable) {
                            valueExpression = `this.${field.name}?.map((e) => e.toJson()).toList()`;
                        } else {
                            valueExpression = `this.${field.name}.map((e) => e.toJson()).toList()`;
                        }
                    }
                } else if (field.type !== 'dynamic' && field.type !== 'String' && field.type !== 'int' && field.type !== 'double' && field.type !== 'bool') {
                    // Complex object
                    if (field.isNullable) {
                        valueExpression = `this.${field.name}?.toJson()`;
                    } else {
                        valueExpression = `this.${field.name}.toJson()`;
                    }
                }
                code += `    data['${field.jsonKey}'] = ${valueExpression};\n`;
            }
            code += `    return data;\n`;
            code += `  }\n`;
        }

        code += '}\n';
        return code;
    }

    private getDefaultValueLiteral(type: string): string {
        switch (type) {
            case 'String': return "''";
            case 'int': return '0';
            case 'double': return '0.0';
            case 'bool': return 'false';
            case 'List<dynamic>': return 'const []';
            default:
                if (type.startsWith('List<')) {
                    return 'const []';
                }
                return 'null';
        }
    }

    private toCamelCase(str: string): string {
        return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private formatName(name: string): string {
        switch (this.settings.namingConvention) {
            case 'snake_case':
                return this.toSnakeCase(name);
            case 'PascalCase':
                return this.capitalize(this.toCamelCase(name));
            case 'camelCase':
            default:
                return this.toCamelCase(name);
        }
    }

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}
