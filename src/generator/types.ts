export interface GeneratorSettings {
    serialization: 'json_serializable' | 'manual' | 'custom';
    typeSetting: 'auto' | 'nullable' | 'non-nullable';
    defaultValue: 'none' | 'non-null' | 'null';
    namingConvention?: 'camelCase' | 'snake_case' | 'PascalCase';
    sort?: boolean;
    useJsonAnnotation?: boolean;
    customSettings?: {
        import: string;
        classAnnotation: string;
        propertyAnnotation: string;
    };
}

export interface ClassDefinition {
    name: string;
    fields: FieldDefinition[];
}

export interface FieldDefinition {
    name: string;
    type: string;
    isNullable: boolean;
    jsonKey: string;
}
