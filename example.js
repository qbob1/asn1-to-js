/**
 * Example usage of the ASN.1 Query Structure
 *
 * This demonstrates:
 * - Loading the database
 * - Retrieving definitions by name and tag
 * - Accessing validators
 * - Working with nested structures (sequences with named types)
 * - Handling choice items with type notation
 * - Working with INTEGER named values (enumerations)
 * - Identifying optional vs mandatory fields
 */

const ASN1Database = require('./asn1-query');

// Load the ASN.1 database
console.log('Loading ASN.1 database...\n');
const db = ASN1Database.fromFile('./asn1_definitions.json');

console.log(`Loaded ${db.getAllNames().length} definitions\n`);
console.log('='.repeat(80) + '\n');

// Example 1: Get a definition by name
console.log('Example 1: Get definition by name');
console.log('-'.repeat(80));
const proprietary = db.getByName('ProprietaryInfo');
if (proprietary) {
    console.log(db.prettyPrint(proprietary));
}
console.log('='.repeat(80) + '\n');

// Example 2: Get definitions by tag
console.log('Example 2: Get definitions by tag (UNIVERSAL, 8)');
console.log('-'.repeat(80));
const universalDefs = db.getByTag('UNIVERSAL', 8);
console.log(`Found ${universalDefs.length} definition(s)\n`);
for (const def of universalDefs) {
    console.log(`- ${def.name}`);
}
console.log('\n' + '='.repeat(80) + '\n');

// Example 3: Working with SEQUENCE fields and validators
console.log('Example 3: Working with SEQUENCE fields and validators');
console.log('-'.repeat(80));
const seq = db.getByName('ProprietaryInfo');
if (seq && seq.fields) {
    console.log(`Fields in ${seq.name}:\n`);
    for (const field of seq.fields) {
        console.log(`  ${field.position}. ${field.name}:`);
        console.log(`     Type: ${field.type}`);
        console.log(`     Optional: ${field.optional}`);

        if (field.validators && field.validators.length > 0) {
            console.log('     Validators:');
            for (const validator of field.validators) {
                console.log(`       - ${validator.message}`);

                // Demonstrate validation
                if (validator.type === 'size') {
                    const testValue = 'x'.repeat(5);
                    const isValid = validator.validate(testValue);
                    console.log(`         Example: "${testValue}" (length ${testValue.length}) is ${isValid ? 'valid' : 'invalid'}`);
                }
            }
        }
        console.log('');
    }
}
console.log('='.repeat(80) + '\n');

// Example 4: Working with CHOICE types
console.log('Example 4: Working with CHOICE types');
console.log('-'.repeat(80));
const external = db.getByName('EXTERNAL');
if (external && external.fields) {
    // EXTERNAL has a field called 'encoding' which is a CHOICE
    const encodingField = external.fields.find(f => f.name === 'encoding');
    if (encodingField && encodingField.type === 'CHOICE') {
        console.log(`Field "${encodingField.name}" is a CHOICE with alternatives:\n`);
        for (const alt of encodingField.alternatives) {
            console.log(`  - ${alt.name}:`);
            console.log(`      Type: ${alt.type}`);
            if (alt.tags && alt.tags.length > 0) {
                console.log(`      Tags: ${alt.tags.map(t => `[${t.class} ${t.number}]`).join(', ')}`);
            }
            if (alt.validators && alt.validators.length > 0) {
                console.log('      Validators:');
                for (const validator of alt.validators) {
                    console.log(`        - ${validator.message}`);
                }
            }
            console.log('');
        }
    }
}
console.log('='.repeat(80) + '\n');

// Example 5: Searching definitions
console.log('Example 5: Search for definitions containing "PE-"');
console.log('-'.repeat(80));
const peDefinitions = db.search('PE-');
console.log(`Found ${peDefinitions.length} definitions:\n`);
for (const def of peDefinitions.slice(0, 10)) {
    console.log(`  - ${def.name} (${def.type || def.kind})`);
}
if (peDefinitions.length > 10) {
    console.log(`  ... and ${peDefinitions.length - 10} more`);
}
console.log('\n' + '='.repeat(80) + '\n');

// Example 6: Working with nested structures
console.log('Example 6: Working with nested structures');
console.log('-'.repeat(80));
const phonebook = db.getByName('PE-PHONEBOOK');
if (phonebook) {
    console.log(`${phonebook.name} structure:\n`);
    console.log(`Type: ${phonebook.type}`);
    console.log(`Number of fields: ${phonebook.fields ? phonebook.fields.length : 0}\n`);

    if (phonebook.fields) {
        console.log('Fields:');
        for (const field of phonebook.fields.slice(0, 5)) {
            console.log(`  ${field.position}. ${field.name}:`);
            console.log(`     Type: ${field.type}`);
            if (field.reference) {
                console.log(`     Reference: ${field.reference.module}.${field.reference.typeName}`);
            }
            console.log(`     Optional: ${field.optional}`);
        }
        if (phonebook.fields.length > 5) {
            console.log(`  ... and ${phonebook.fields.length - 5} more fields`);
        }
    }
}
console.log('\n' + '='.repeat(80) + '\n');

// Example 7: Accessing tags
console.log('Example 7: Accessing tags');
console.log('-'.repeat(80));
const dfSaip = db.getByName('PE-DF-SAIP');
if (dfSaip) {
    console.log(`Tags for ${dfSaip.name}:\n`);
    if (dfSaip.tags) {
        for (const tag of dfSaip.tags) {
            console.log(`  [${tag.class} ${tag.number}] ${tag.type} (form: ${tag.form})`);
        }
    }

    console.log('\nField tags:');
    if (dfSaip.fields) {
        for (const field of dfSaip.fields) {
            if (field.tags && field.tags.length > 0) {
                const tagStr = field.tags.map(t => `[${t.class} ${t.number}]`).join(', ');
                console.log(`  ${field.name}: ${tagStr}`);
            }
        }
    }
}
console.log('\n' + '='.repeat(80) + '\n');

// Example 8: Working with value definitions
console.log('Example 8: Working with value definitions');
console.log('-'.repeat(80));
const maxUint31 = db.getByName('maxUInt31');
if (maxUint31) {
    console.log(`${maxUint31.name}:`);
    console.log(`  Kind: ${maxUint31.kind}`);
    console.log(`  Type: ${maxUint31.type}`);
    console.log(`  Value: ${maxUint31.value}`);
}
console.log('\n' + '='.repeat(80) + '\n');

// Example 9: Working with INTEGER named values (enumerations)
console.log('Example 9: Working with INTEGER named values (enumerations)');
console.log('-'.repeat(80));
const algoParam = db.getByName('AlgoParameter');
if (algoParam && algoParam.fields) {
    const algorithmIDField = algoParam.fields.find(f => f.name === 'algorithmID');
    if (algorithmIDField && algorithmIDField.namedNumbers) {
        console.log(`Field "${algorithmIDField.name}" is an INTEGER with named values:\n`);
        for (const named of algorithmIDField.namedNumbers) {
            console.log(`  ${named.value}: ${named.name}`);
        }
        console.log('\nThis allows validation and mapping between numeric values and their labels.');
    }
}
console.log('\n' + '='.repeat(80) + '\n');

console.log('Examples completed!');
