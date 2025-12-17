/**
 * Enhanced Tag Indexing - Now includes nested field and CHOICE tags
 *
 * This demonstrates the improved tag indexing that includes:
 * - Top-level definition tags
 * - SEQUENCE field tags
 * - CHOICE alternative tags
 */

const ASN1Database = require('./asn1-query');

const db = ASN1Database.fromFile('./asn1_definitions.json');

console.log('='.repeat(80));
console.log('Enhanced Tag Indexing - Field-Level and CHOICE Tags');
console.log('='.repeat(80));
console.log('');

console.log('1. BEFORE vs AFTER - Context Tags');
console.log('-'.repeat(80));
console.log('Previously: getByTag() only found top-level tags');
console.log('Now: getByTag() finds tags at ALL levels\n');

const context0 = db.getByTag('CONTEXT', 0);
console.log(`CONTEXT 0 tags: ${context0.length} definitions`);
console.log('This includes:');
console.log('  - Definitions with CONTEXT 0 as top-level tag');
console.log('  - Definitions with fields that have CONTEXT 0 tag');
console.log('  - Definitions with CHOICE alternatives that have CONTEXT 0 tag');
console.log('');

// Show some examples
console.log('Examples:');
context0.slice(0, 5).forEach(def => {
    console.log(`  ${def.name} (${def.type || def.kind})`);

    // Show where the CONTEXT 0 tag is
    if (def.fields) {
        const context0Field = def.fields.find(f =>
            f.tags && f.tags.some(t => t.class === 'CONTEXT' && t.number === 0)
        );
        if (context0Field) {
            console.log(`    → Field "${context0Field.name}" has [CONTEXT 0] tag`);
        }

        // Check CHOICE alternatives
        def.fields.forEach(f => {
            if (f.alternatives) {
                const context0Alt = f.alternatives.find(a =>
                    a.tags && a.tags.some(t => t.class === 'CONTEXT' && t.number === 0)
                );
                if (context0Alt) {
                    console.log(`    → CHOICE field "${f.name}" has alternative "${context0Alt.name}" with [CONTEXT 0]`);
                }
            }
        });
    }
});
console.log('');

console.log('2. CHOICE Alternative Tags are Now Indexed');
console.log('-'.repeat(80));

const external = db.getByName('EXTERNAL');
console.log(`${external.name} SEQUENCE has field "encoding" which is a CHOICE:\n`);

const encodingField = external.fields.find(f => f.name === 'encoding');
encodingField.alternatives.forEach(alt => {
    const tagStr = alt.tags.map(t => `[${t.class} ${t.number}]`).join(', ');
    console.log(`  Alternative: ${alt.name}`);
    console.log(`    Type: ${alt.type}`);
    console.log(`    Tags: ${tagStr}`);

    // Check if this definition is indexed under this tag
    const tagDefs = db.getByTag(alt.tags[0].class, alt.tags[0].number);
    const isIndexed = tagDefs.some(d => d.name === external.name);
    console.log(`    Indexed: ${isIndexed ? 'YES ✓' : 'NO ✗'}`);
    console.log('');
});

console.log('3. PRIVATE Tags in Fields');
console.log('-'.repeat(80));

const private0 = db.getByTag('PRIVATE', 0);
console.log(`PRIVATE 0 tags: ${private0.length} definition(s)\n`);

private0.forEach(def => {
    console.log(`  ${def.name}:`);
    const privateField = def.fields.find(f =>
        f.tags && f.tags.some(t => t.class === 'PRIVATE' && t.number === 0)
    );
    if (privateField) {
        console.log(`    Field: ${privateField.name}`);
        console.log(`    Type: ${privateField.type}`);
        console.log(`    Tags: ${privateField.tags.map(t => `[${t.class} ${t.number}]`).join(', ')}`);
    }
});
console.log('');

console.log('4. Find All Definitions with INTEGER Fields at CONTEXT 0');
console.log('-'.repeat(80));

const context0Defs = db.getByTag('CONTEXT', 0);
const withIntegerAtContext0 = context0Defs.filter(def => {
    if (!def.fields) return false;
    return def.fields.some(f =>
        f.type === 'INTEGER' &&
        f.tags &&
        f.tags.some(t => t.class === 'CONTEXT' && t.number === 0)
    );
});

console.log(`Found ${withIntegerAtContext0.length} definitions with INTEGER at [CONTEXT 0]:\n`);
withIntegerAtContext0.forEach(def => {
    const field = def.fields.find(f =>
        f.type === 'INTEGER' &&
        f.tags &&
        f.tags.some(t => t.class === 'CONTEXT' && t.number === 0)
    );
    console.log(`  ${def.name}.${field.name}`);
    if (field.namedNumbers) {
        console.log(`    Has ${field.namedNumbers.length} named values`);
        console.log(`    Example: ${field.namedNumbers[0].value} = "${field.namedNumbers[0].name}"`);
    }
});
console.log('');

console.log('5. Tag Statistics - All Levels');
console.log('-'.repeat(80));

const tagStats = new Map();

// Collect all tags
['UNIVERSAL', 'CONTEXT', 'APPLICATION', 'PRIVATE'].forEach(tagClass => {
    for (let i = 0; i < 100; i++) {
        const defs = db.getByTag(tagClass, i);
        if (defs.length > 0) {
            tagStats.set(`[${tagClass} ${i}]`, defs.length);
        }
    }
});

console.log('Most used tags:\n');
Array.from(tagStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([tag, count], index) => {
        console.log(`  ${index + 1}. ${tag}: ${count} definitions`);
    });
console.log('');

console.log('6. Practical Use Case - Find All Definitions Using a Tag');
console.log('-'.repeat(80));

function findAllUsesOfTag(tagClass, tagNumber) {
    const defs = db.getByTag(tagClass, tagNumber);
    const results = [];

    defs.forEach(def => {
        // Check top-level
        if (def.tags && def.tags.some(t => t.class === tagClass && t.number === tagNumber)) {
            results.push({
                definition: def.name,
                location: 'top-level',
                type: def.type
            });
        }

        // Check fields
        if (def.fields) {
            def.fields.forEach(field => {
                if (field.tags && field.tags.some(t => t.class === tagClass && t.number === tagNumber)) {
                    results.push({
                        definition: def.name,
                        location: `field:${field.name}`,
                        type: field.type
                    });
                }

                // Check CHOICE alternatives
                if (field.alternatives) {
                    field.alternatives.forEach(alt => {
                        if (alt.tags && alt.tags.some(t => t.class === tagClass && t.number === tagNumber)) {
                            results.push({
                                definition: def.name,
                                location: `choice:${field.name}.${alt.name}`,
                                type: alt.type
                            });
                        }
                    });
                }
            });
        }
    });

    return results;
}

const context0Uses = findAllUsesOfTag('CONTEXT', 0);
console.log(`All uses of [CONTEXT 0]: ${context0Uses.length} locations\n`);
console.log('Sample usage locations:');
context0Uses.slice(0, 10).forEach(use => {
    console.log(`  ${use.definition} @ ${use.location} (${use.type})`);
});
if (context0Uses.length > 10) {
    console.log(`  ... and ${context0Uses.length - 10} more`);
}
console.log('');

console.log('='.repeat(80));
console.log('Summary: Tag indexing now includes ALL nested tags!');
console.log('  - Top-level definition tags');
console.log('  - SEQUENCE field tags');
console.log('  - CHOICE alternative tags');
console.log('  - Recursively indexes nested structures');
console.log('='.repeat(80));
