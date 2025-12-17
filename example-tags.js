/**
 * Example: Looking up ASN.1 definitions by tag
 *
 * This demonstrates how to query definitions by their tag class and number
 */

const ASN1Database = require('./asn1-query');

// Load database
const db = ASN1Database.fromFile('./asn1_definitions.json');

console.log('='.repeat(80));
console.log('Looking Up Definitions by Tag');
console.log('='.repeat(80));
console.log('');

console.log('1. BASIC TAG LOOKUP');
console.log('-'.repeat(80));

// Look up by tag class and number
const universalSeq = db.getByTag('UNIVERSAL', 16);
console.log(`Found ${universalSeq.length} definitions with tag [UNIVERSAL 16]:`);
universalSeq.slice(0, 5).forEach(def => {
    console.log(`  - ${def.name} (${def.type || def.kind})`);
});
if (universalSeq.length > 5) {
    console.log(`  ... and ${universalSeq.length - 5} more`);
}
console.log('');

console.log('2. DIFFERENT TAG CLASSES');
console.log('-'.repeat(80));

// Tag classes: UNIVERSAL, CONTEXT, APPLICATION, PRIVATE
const tagClasses = ['UNIVERSAL', 'CONTEXT', 'APPLICATION', 'PRIVATE'];

tagClasses.forEach(tagClass => {
    const defs = db.getByTag(tagClass, 0);
    console.log(`[${tagClass} 0]: ${defs.length} definition(s)`);
    if (defs.length > 0) {
        defs.forEach(def => {
            console.log(`  - ${def.name}`);
        });
    }
});
console.log('');

console.log('3. UNIVERSAL TAG EXAMPLES');
console.log('-'.repeat(80));
console.log('Common UNIVERSAL tags:');

const universalTags = [
    { number: 2, type: 'INTEGER' },
    { number: 4, type: 'OCTET STRING' },
    { number: 6, type: 'OBJECT IDENTIFIER' },
    { number: 8, type: 'EXTERNAL' },
    { number: 16, type: 'SEQUENCE' }
];

universalTags.forEach(({ number, type }) => {
    const defs = db.getByTag('UNIVERSAL', number);
    console.log(`  [UNIVERSAL ${number}] ${type}: ${defs.length} definition(s)`);
});
console.log('');

console.log('4. ACCESSING TAG INFORMATION FROM DEFINITIONS');
console.log('-'.repeat(80));

// Get a definition and examine its tags
const proprietary = db.getByName('ProprietaryInfo');
console.log(`Definition: ${proprietary.name}`);
console.log('Top-level tags:');
proprietary.tags.forEach(tag => {
    console.log(`  [${tag.class} ${tag.number}] ${tag.type} (form: ${tag.form})`);
});
console.log('');

console.log('Field tags:');
proprietary.fields.forEach(field => {
    if (field.tags && field.tags.length > 0) {
        const tagStr = field.tags.map(t => `[${t.class} ${t.number}]`).join(', ');
        console.log(`  ${field.name}: ${tagStr}`);
    }
});
console.log('');

console.log('5. FIND ALL DEFINITIONS WITH A SPECIFIC CONTEXT TAG');
console.log('-'.repeat(80));

// Context tags are often used within SEQUENCE fields
const context0Defs = db.getByTag('CONTEXT', 0);
console.log(`Definitions with [CONTEXT 0]: ${context0Defs.length}`);
context0Defs.slice(0, 5).forEach(def => {
    console.log(`  - ${def.name} (${def.type || def.kind})`);
});
console.log('');

console.log('6. SEARCH FOR DEFINITIONS BY MULTIPLE TAG CRITERIA');
console.log('-'.repeat(80));

// Find all SEQUENCE types (UNIVERSAL 16)
const sequences = db.getByTag('UNIVERSAL', 16);
console.log(`Total SEQUENCE types: ${sequences.length}\n`);

// Filter further by other criteria
const sequencesWithManyFields = sequences.filter(seq =>
    seq.fields && seq.fields.length > 10
);
console.log(`SEQUENCE types with >10 fields: ${sequencesWithManyFields.length}`);
sequencesWithManyFields.forEach(seq => {
    console.log(`  - ${seq.name}: ${seq.fields.length} fields`);
});
console.log('');

console.log('7. EXAMINING NESTED TAGS IN SEQUENCE FIELDS');
console.log('-'.repeat(80));

const algoParam = db.getByName('AlgoParameter');
console.log(`Examining ${algoParam.name} field tags:\n`);

algoParam.fields.forEach(field => {
    console.log(`Field: ${field.name}`);
    console.log(`  Type: ${field.type}`);

    if (field.tags && field.tags.length > 0) {
        console.log(`  Field tags: ${field.tags.map(t => `[${t.class} ${t.number}]`).join(', ')}`);
    }

    // Show the tags from the type definition too
    console.log('');
});

console.log('8. PRACTICAL EXAMPLE: Build a tag index');
console.log('-'.repeat(80));

// Build a comprehensive index of all tags used
function buildTagIndex(db) {
    const tagIndex = new Map();

    db.getAllNames().forEach(name => {
        const def = db.getByName(name);

        // Index top-level tags
        if (def.tags) {
            def.tags.forEach(tag => {
                const key = `${tag.class}:${tag.number}`;
                if (!tagIndex.has(key)) {
                    tagIndex.set(key, []);
                }
                tagIndex.get(key).push({
                    definition: name,
                    location: 'top-level',
                    type: def.type
                });
            });
        }

        // Index field tags
        if (def.fields) {
            def.fields.forEach(field => {
                if (field.tags) {
                    field.tags.forEach(tag => {
                        const key = `${tag.class}:${tag.number}`;
                        if (!tagIndex.has(key)) {
                            tagIndex.set(key, []);
                        }
                        tagIndex.get(key).push({
                            definition: name,
                            location: `field:${field.name}`,
                            type: field.type
                        });
                    });
                }
            });
        }
    });

    return tagIndex;
}

const tagIndex = buildTagIndex(db);
console.log(`Total unique tags in database: ${tagIndex.size}\n`);

// Show some examples
console.log('Tag usage statistics:');
const tagStats = Array.from(tagIndex.entries())
    .map(([tag, usages]) => ({ tag, count: usages.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

tagStats.forEach(({ tag, count }) => {
    const [tagClass, tagNumber] = tag.split(':');
    console.log(`  [${tagClass} ${tagNumber}]: used ${count} times`);
});
console.log('');

console.log('9. LOOKUP BY TAG AND FILTER BY TYPE');
console.log('-'.repeat(80));

// Find all CONTEXT 0 tags that are INTEGER types
const context0 = db.getByTag('CONTEXT', 0);
const context0Integers = context0.filter(def => {
    if (def.fields) {
        return def.fields.some(f => f.tags && f.tags.some(t => t.class === 'CONTEXT' && t.number === 0) && f.type === 'INTEGER');
    }
    return def.type === 'INTEGER';
});

console.log(`[CONTEXT 0] INTEGER fields: ${context0Integers.length}`);
context0Integers.slice(0, 5).forEach(def => {
    console.log(`  - ${def.name}`);
    if (def.fields) {
        const intFields = def.fields.filter(f =>
            f.tags && f.tags.some(t => t.class === 'CONTEXT' && t.number === 0) && f.type === 'INTEGER'
        );
        intFields.forEach(f => {
            console.log(`    Field: ${f.name}`);
            if (f.namedNumbers) {
                console.log(`      Has ${f.namedNumbers.length} named values`);
            }
        });
    }
});
console.log('');

console.log('='.repeat(80));
console.log('Summary: Use db.getByTag(tagClass, tagNumber)');
console.log('  Tag classes: UNIVERSAL, CONTEXT, APPLICATION, PRIVATE');
console.log('  Returns: Array of definitions with that tag');
console.log('='.repeat(80));
