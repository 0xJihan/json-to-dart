import * as assert from 'assert';
import { DartClassGenerator } from '../generator/DartClassGenerator';
import { GeneratorSettings } from '../generator/types';

suite('Dart Generator Tests', () => {

    test('Strict Type Detection (List Input)', () => {
        const settings: GeneratorSettings = {
            serialization: 'json_serializable',
            typeSetting: 'auto',
            defaultValue: 'none',
            namingConvention: 'camelCase',
            sort: false
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify([
            { a: 1 },
            { a: null },
            { b: 2 }
        ]);
        const code = generator.generate(json, 'Item');

        // a is null in second item -> nullable
        // b is missing in first item -> nullable
        assert.ok(code.includes('final int? a;'));
        assert.ok(code.includes('final int? b;'));
    });

    test('Manual Generation with Defaults', () => {
        const settings: GeneratorSettings = {
            serialization: 'manual',
            typeSetting: 'non-nullable', // Force non-nullable to test defaults
            defaultValue: 'non-null',
            namingConvention: 'camelCase',
            sort: false
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({
            id: 1,
            score: 2.5
        });
        const code = generator.generate(json, 'Data');

        assert.ok(!code.includes('@JsonSerializable'));
        // Manual defaults can still use const if appropriate (user said "not from manual")
        // But let's check if they are present
        assert.ok(code.includes('this.id = 0'));
        assert.ok(code.includes('this.score = 0.0'));
        assert.ok(code.includes('factory Data.fromJson'));

        // Check toJson for absence of 'this.'
        assert.ok(code.includes("'id': id,"));
        assert.ok(code.includes("'score': score,"));
        assert.ok(!code.includes("'id': this.id,"));
    });

    test('JsonSerializable Strictness', () => {
        const settings: GeneratorSettings = {
            serialization: 'json_serializable',
            typeSetting: 'auto',
            defaultValue: 'non-null',
            namingConvention: 'camelCase',
            sort: false
        };
        const generator = new DartClassGenerator(settings);
        const json = JSON.stringify({
            title: "Test",
            tags: []
        });
        const code = generator.generate(json, 'Post');

        // Should have defaultValue annotation
        assert.ok(code.includes("@JsonKey(name: 'title', defaultValue: '')"));
        // Should NOT have const for list default
        assert.ok(code.includes("@JsonKey(name: 'tags', defaultValue: [])"));
        assert.ok(!code.includes("defaultValue: const []"));

        // Should NOT have constructor default
        assert.ok(code.includes('required this.title'));
        assert.ok(!code.includes('this.title ='));
    });
});
