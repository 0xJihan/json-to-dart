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

        // Imports
        if (this.settings.serialization === 'json_serializable' || this.settings.useJsonAnnotation) {
            code += "import 'package:json_annotation/json_annotation.dart';\n\n";
        }

        if (this.settings.serialization === 'json_serializable') {
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

        // Class Annotation
        if (this.settings.serialization === 'json_serializable') {
            code += '@JsonSerializable()\n';
        } else if (this.settings.serialization === 'custom' && this.settings.customSettings?.classAnnotation) {
            code += `${this.settings.customSettings.classAnnotation}\n`;
        }

        code += `class ${cls.name} {\n`;

        // Fields
        for (const field of cls.fields) {
            const defaultValue = this.getDefaultValueLiteral(field.type);
            const hasDefault = this.settings.defaultValue === 'non-null' && defaultValue !== 'null';

            // Property Annotation
            if (this.settings.serialization === 'json_serializable') {
                if (hasDefault) {
                    code += `  @JsonKey(defaultValue: ${defaultValue})\n`;
                }
            } else if (this.settings.serialization === 'custom' && this.settings.customSettings?.propertyAnnotation) {
                code += `  ${this.settings.customSettings.propertyAnnotation.replace('%s', field.jsonKey)}\n`;
            }

            const isFinal = hasDefault ? 'final ' : '';
            const typeStr = field.type + (field.isNullable && !hasDefault ? '?' : '');
            code += `  ${isFinal}${typeStr} ${field.name};\n`;
        }

        code += '\n';

        // Constructor
        code += `  ${cls.name}({`;
        code += cls.fields.map(f => {
            const defaultValue = this.getDefaultValueLiteral(f.type);
            const hasDefault = this.settings.defaultValue === 'non-null' && defaultValue !== 'null';

            if (hasDefault) {
                return `this.${f.name} = ${defaultValue}`;
            } else {
                const required = !f.isNullable && this.settings.defaultValue === 'none' ? 'required ' : '';
                return `${required}this.${f.name}`;
            }
        }).join(', ');
        code += '});\n\n';

        // FromJson / ToJson
        if (this.settings.serialization === 'json_serializable') {
            code += `  factory ${cls.name}.fromJson(Map<String, dynamic> json) => _$${cls.name}FromJson(json);\n`;
            code += `  Map<String, dynamic> toJson() => _$${cls.name}ToJson(this);\n`;
        } else if (this.settings.serialization === 'manual') {
            code += `  ${cls.name}.fromJson(Map<String, dynamic> json) {\n`;
            for (const field of cls.fields) {
                code += `    ${field.name} = json['${field.jsonKey}'];\n`;
            }
            code += '  }\n\n';

            code += '  Map<String, dynamic> toJson() {\n';
            code += '    final Map<String, dynamic> data = new Map<String, dynamic>();\n';
            for (const field of cls.fields) {
                code += `    data['${field.jsonKey}'] = this.${field.name};\n`;
            }
            code += '    return data;\n';
            code += '  }\n';
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
            case 'List<dynamic>': return '[]';
            default:
                if (type.startsWith('List<')) {
                    return '[]';
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
