import { GeneratorSettings, ClassDefinition, FieldDefinition } from './types';

export class DartClassGenerator {
    constructor(private settings: GeneratorSettings) { }

    public generate(jsonString: string, rootClassName: string = 'Root'): string {
        try {
            const json = JSON.parse(jsonString);
            const classes: ClassDefinition[] = [];

            let samples: any[] = [];
            if (Array.isArray(json)) {
                samples = json;
            } else {
                samples = [json];
            }

            this.parseClass(samples, rootClassName, classes);
            return this.generateDartCode(classes, rootClassName);
        } catch (e) {
            throw new Error('Invalid JSON: ' + (e as Error).message);
        }
    }

    private parseClass(samples: any[], className: string, classes: ClassDefinition[]) {
        const fields: FieldDefinition[] = [];
        const allKeys = new Set<string>();


        for (const sample of samples) {
            if (sample && typeof sample === 'object') {
                Object.keys(sample).forEach(key => allKeys.add(key));
            }
        }

        for (const key of allKeys) {
            const values: any[] = [];
            let isMissingInSome = false;
            let hasNull = false;

            for (const sample of samples) {
                if (sample && typeof sample === 'object' && key in sample) {
                    const val = sample[key];
                    if (val === null) {
                        hasNull = true;
                    } else {
                        values.push(val);
                    }
                } else {
                    isMissingInSome = true;
                }
            }

            const isNullable = this.isNullable(isMissingInSome, hasNull);
            const type = this.getType(values, key, classes);

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

    private getType(values: any[], key: string, classes: ClassDefinition[]): string {
        if (values.length === 0) {
            return 'dynamic';
        }

        const firstType = typeof values[0];
        let isMixed = false;

        for (let i = 1; i < values.length; i++) {
            if (typeof values[i] !== firstType) {
                isMixed = true;
                break;
            }
        }

        if (isMixed) {

            const allNumbers = values.every(v => typeof v === 'number');
            if (allNumbers) {
                const hasDouble = values.some(v => !Number.isInteger(v));
                return hasDouble ? 'double' : 'int';
            }
            return 'dynamic';
        }

        if (firstType === 'string') return 'String';
        if (firstType === 'boolean') return 'bool';
        if (firstType === 'number') {
            const hasDouble = values.some(v => !Number.isInteger(v));
            return hasDouble ? 'double' : 'int';
        }

        if (Array.isArray(values[0])) {

            const allItems: any[] = [];
            for (const val of values) {
                if (Array.isArray(val)) {
                    allItems.push(...val);
                }
            }
            if (allItems.length === 0) return 'List<dynamic>';
            const innerType = this.getType(allItems, key, classes);
            return `List<${innerType}>`;
        }

        if (firstType === 'object') {
            const className = this.capitalize(this.toCamelCase(key));

            this.parseClass(values, className, classes);
            return className;
        }

        return 'dynamic';
    }

    private isNullable(isMissing: boolean, hasNull: boolean): boolean {
        if (this.settings.typeSetting === 'nullable') return true;
        if (this.settings.typeSetting === 'non-nullable') return false;

        return isMissing || hasNull;
    }

    private generateDartCode(classes: ClassDefinition[], rootClassName: string): string {
        let code = '';
        const strategy = this.settings.serialization;

        if (strategy === 'json_serializable') {
            code += "import 'package:json_annotation/json_annotation.dart';\n\n";
            code += `part '${this.toSnakeCase(rootClassName)}.g.dart';\n\n`;
        } else if (strategy === 'custom' && this.settings.customSettings?.import) {
            code += `${this.settings.customSettings.import}\n\n`;
        }

        for (const cls of classes.reverse()) {
            code += this.generateClass(cls);
            code += '\n';
        }

        return code;
    }

    private generateClass(cls: ClassDefinition): string {
        const strategy = this.settings.serialization;
        let code = '';


        if (strategy === 'json_serializable') {
            code += '@JsonSerializable()\n';
        } else if (strategy === 'custom' && this.settings.customSettings?.classAnnotation) {
            code += `${this.settings.customSettings.classAnnotation}\n`;
        }

        code += `class ${cls.name} {\n`;


        for (const field of cls.fields) {
            if (strategy === 'json_serializable') {
                if (field.jsonKey !== field.name || this.hasDefaultValue(field)) {
                    let annotation = `@JsonKey(name: '${field.jsonKey}'`;
                    if (this.hasDefaultValue(field)) {

                        annotation += `, defaultValue: ${this.getDefaultValueLiteral(field.type, false)}`;
                    }
                    annotation += ')';
                    code += `  ${annotation}\n`;
                }
            } else if (strategy === 'custom' && this.settings.customSettings?.propertyAnnotation) {
                code += `  ${this.settings.customSettings.propertyAnnotation.replace('%s', field.jsonKey)}\n`;
            }

            const isFinal = true;
            const typeStr = field.type + (field.isNullable ? '?' : '');
            code += `  ${isFinal ? 'final ' : ''}${typeStr} ${field.name};\n`;
        }
        code += '\n';


        code += `  ${cls.name}({`;
        code += cls.fields.map(f => {


            const useConstructorDefault = strategy === 'manual' && this.settings.defaultValue === 'non-null';

            const defaultValue = this.getDefaultValueLiteral(f.type, true);
            const hasDefault = useConstructorDefault && defaultValue !== 'null';

            if (hasDefault) {
                return `this.${f.name} = ${defaultValue}`;
            } else {
                const required = !f.isNullable ? 'required ' : '';
                return `${required}this.${f.name}`;
            }
        }).join(', ');
        code += '});\n\n';

        if (strategy === 'json_serializable') {
            code += `  factory ${cls.name}.fromJson(Map<String, dynamic> json) => _$${cls.name}FromJson(json);\n`;
            code += `  Map<String, dynamic> toJson() => _$${cls.name}ToJson(this);\n`;
        } else if (strategy === 'manual') {
            code += this.generateManualFromJson(cls);
            code += this.generateManualToJson(cls);
        }

        code += '}\n';
        return code;
    }

    private generateManualFromJson(cls: ClassDefinition): string {
        let code = `  factory ${cls.name}.fromJson(Map<String, dynamic> json) {\n`;
        code += `    return ${cls.name}(\n`;

        for (const f of cls.fields) {
            let valueExpr = `json['${f.jsonKey}']`;

            if (f.type.startsWith('List<')) {
                const innerType = f.type.substring(5, f.type.length - 1);
                const isPrimitive = ['String', 'int', 'double', 'bool', 'dynamic'].includes(innerType);

                if (isPrimitive) {
                    valueExpr = `(${valueExpr} as List<dynamic>?)?.map((e) => e as ${innerType}).toList()`;
                } else {
                    valueExpr = `(${valueExpr} as List<dynamic>?)?.map((e) => ${innerType}.fromJson(e as Map<String, dynamic>)).toList()`;
                }

                if (!f.isNullable) {
                    valueExpr += ` ?? []`;
                }
            } else if (!['String', 'int', 'double', 'bool', 'dynamic'].includes(f.type)) {

                if (f.isNullable) {
                    valueExpr = `${valueExpr} == null ? null : ${f.type}.fromJson(${valueExpr} as Map<String, dynamic>)`;
                } else {
                    valueExpr = `${f.type}.fromJson(${valueExpr} as Map<String, dynamic>)`;
                }
            } else {

                if (f.type === 'double') {
                    valueExpr = `(${valueExpr} as num?)?.toDouble()`;
                } else if (f.type === 'int') {
                    valueExpr = `(${valueExpr} as num?)?.toInt()`;
                } else {
                    valueExpr = `${valueExpr} as ${f.type}?`;
                }

                if (!f.isNullable && this.settings.defaultValue === 'non-null') {
                    valueExpr += ` ?? ${this.getDefaultValueLiteral(f.type, true)}`;
                } else if (!f.isNullable) {
                    if (f.type === 'double') valueExpr += ' ?? 0.0';
                    else if (f.type === 'int') valueExpr += ' ?? 0';
                    else if (f.type === 'bool') valueExpr += ' ?? false';
                    else if (f.type === 'String') valueExpr += " ?? ''";
                }
            }

            code += `      ${f.name}: ${valueExpr},\n`;
        }

        code += `    );\n`;
        code += `  }\n\n`;
        return code;
    }

    private generateManualToJson(cls: ClassDefinition): string {
        let code = `  Map<String, dynamic> toJson() {\n`;
        code += `    return <String, dynamic>{\n`;

        for (const f of cls.fields) {

            let val = `${f.name}`;
            if (f.type.startsWith('List<')) {
                const innerType = f.type.substring(5, f.type.length - 1);
                if (!['String', 'int', 'double', 'bool', 'dynamic'].includes(innerType)) {
                    if (f.isNullable) {
                        val = `${val}?.map((e) => e.toJson()).toList()`;
                    } else {
                        val = `${val}.map((e) => e.toJson()).toList()`;
                    }
                }
            } else if (!['String', 'int', 'double', 'bool', 'dynamic'].includes(f.type)) {
                if (f.isNullable) {
                    val = `${val}?.toJson()`;
                } else {
                    val = `${val}.toJson()`;
                }
            }
            code += `      '${f.jsonKey}': ${val},\n`;
        }

        code += `    };\n`;
        code += `  }\n`;
        return code;
    }

    private hasDefaultValue(field: FieldDefinition): boolean {

        return this.settings.defaultValue === 'non-null' && !field.isNullable;
    }

    private getDefaultValueLiteral(type: string, useConst: boolean): string {
        if (type.startsWith('List<')) return useConst ? 'const []' : '[]';
        if (type === 'String') return "''";
        if (type === 'int') return '0';
        if (type === 'double') return '0.0';
        if (type === 'bool') return 'false';
        return 'null';
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
