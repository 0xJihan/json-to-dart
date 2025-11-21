import * as assert from 'assert';
import { DartClassGenerator } from '../generator/DartClassGenerator';
import { GeneratorSettings } from '../generator/types';

suite('DartClassGenerator Test Suite', () => {
    test('Generate Manual Model', () => {
        const settings: GeneratorSettings = {
            serialization: 'manual',
            typeSetting: 'auto',
            defaultValue: 'none'
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ name: 'test', age: 10 });
        const code = generator.generate(json, 'User');

        assert.ok(code.includes('class User'));
        assert.ok(code.includes('String? name;'));
        assert.ok(code.includes('int? age;'));
        assert.ok(code.includes('User.fromJson(Map<String, dynamic> json)'));
        assert.ok(code.includes("name = json['name'];"));
    });

    test('Generate JSON Serializable Model', () => {
        const settings: GeneratorSettings = {
            serialization: 'json_serializable',
            typeSetting: 'auto',
            defaultValue: 'none',
            useJsonAnnotation: true
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ name: 'test' });
        const code = generator.generate(json, 'User');

        assert.ok(code.includes('@JsonSerializable()'));
        assert.ok(code.includes("part 'user.g.dart';"));
        assert.ok(code.includes("import 'package:json_annotation/json_annotation.dart';"));
        assert.ok(code.includes('factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);'));
    });

    test('Generate JSON Serializable Model - No Import', () => {
        const settings: GeneratorSettings = {
            serialization: 'json_serializable',
            typeSetting: 'auto',
            defaultValue: 'none',
            useJsonAnnotation: false
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ name: 'test' });
        const code = generator.generate(json, 'User');

        assert.ok(code.includes('@JsonSerializable()'));
        assert.ok(code.includes("part 'user.g.dart';"));
        assert.ok(code.includes("import 'package:json_annotation/json_annotation.dart';"));
    });

    test('Generate Custom Annotations', () => {
        const settings: GeneratorSettings = {
            serialization: 'custom',
            typeSetting: 'auto',
            defaultValue: 'none',
            customSettings: {
                import: "import 'package:custom/custom.dart';",
                classAnnotation: '@CustomClass()',
                propertyAnnotation: "@CustomProp('%s')"
            }
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ name: 'test' });
        const code = generator.generate(json, 'User');

        assert.ok(code.includes("import 'package:custom/custom.dart';"));
        assert.ok(code.includes('@CustomClass()'));
        assert.ok(code.includes("@CustomProp('name')"));
    });

    test('Type Settings - Non-nullable', () => {
        const settings: GeneratorSettings = {
            serialization: 'manual',
            typeSetting: 'non-nullable',
            defaultValue: 'none'
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ name: 'test' });
        const code = generator.generate(json, 'User');

        assert.ok(code.includes('String name;')); // No ?
        assert.ok(!code.includes('String? name;'));
    });
    test('Naming Convention - snake_case', () => {
        const settings: GeneratorSettings = {
            serialization: 'manual',
            typeSetting: 'auto',
            defaultValue: 'none',
            namingConvention: 'snake_case'
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ userName: 'test', userAge: 10 });
        const code = generator.generate(json, 'User');

        assert.ok(code.includes('String? user_name;'));
        assert.ok(code.includes('int? user_age;'));
    });

    test('Non-nullable with Default Values', () => {
        const settings: GeneratorSettings = {
            serialization: 'json_serializable',
            typeSetting: 'non-nullable',
            defaultValue: 'non-null',
            useJsonAnnotation: true
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ name: 'John', age: 30 });
        const code = generator.generate(json, 'DummyData');

        // Check part directive
        assert.ok(code.includes("part 'dummy_data.g.dart';"));

        // Check fields are non-nullable and final
        assert.ok(code.includes('final String name;'));
        assert.ok(code.includes('final int age;'));

        // Check JsonKey default value
        assert.ok(code.includes("@JsonKey(defaultValue: '')"));
        assert.ok(code.includes("@JsonKey(defaultValue: 0)"));

        // Check Constructor defaults
        assert.ok(code.includes("this.name = ''"));
        assert.ok(code.includes("this.age = 0"));
    });
    test('Sorting - Alphabetical', () => {
        const settings: GeneratorSettings = {
            serialization: 'manual',
            typeSetting: 'auto',
            defaultValue: 'none',
            sort: true
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({ z: 1, a: 2, m: 3 });
        const code = generator.generate(json, 'SortTest');

        const indexA = code.indexOf('int? a;');
        const indexM = code.indexOf('int? m;');
        const indexZ = code.indexOf('int? z;');

        assert.ok(indexA < indexM);
        assert.ok(indexM < indexZ);
    });
});
