/**
 * Example: Recursively iterating ASN.1 structures and detecting named values
 *
 * This demonstrates how to traverse the structure and identify nodes
 * with INTEGER named values (enumerations).
 */

const ASN1Database = require('./asn1-query');

// Load database
const db = ASN1Database.fromFile('./asn1_definitions.json');

console.log('='.repeat(80));
console.log('Recursive Traversal - Detecting Named Values');
console.log('='.repeat(80));
console.log('');

/**
 * Check if a node has INTEGER named values
 */
function hasNamedValues(node) {
    // Check for namedNumbers array (raw data)
    if (node.namedNumbers && Array.isArray(node.namedNumbers) && node.namedNumbers.length > 0) {
        return true;
    }

    // Alternative: check for enum helper object
    if (node.enum && typeof node.enum === 'object') {
        return true;
    }

    return false;
}

/**
 * Recursively traverse and process a structure
 */
function traverse(node, path = '', indent = 0) {
    const spaces = '  '.repeat(indent);

    // Print current node
    console.log(`${spaces}${path || 'Root'} (${node.type || node.kind})`);

    // Check if THIS node has named values
    if (hasNamedValues(node)) {
        console.log(`${spaces}  ⭐ HAS NAMED VALUES (${node.namedNumbers.length} values)`);

        // Show the values
        node.namedNumbers.forEach(nv => {
            console.log(`${spaces}    ${nv.value}: ${nv.name}`);
        });

        // You can also use the enum helper
        console.log(`${spaces}  Helper available: enum.getValue(), enum.getName(), etc.`);
    }

    // Recurse into SEQUENCE fields
    if (node.fields && Array.isArray(node.fields)) {
        console.log(`${spaces}  Fields:`);
        node.fields.forEach(field => {
            traverse(field, field.name, indent + 2);
        });
    }

    // Recurse into CHOICE alternatives
    if (node.alternatives && Array.isArray(node.alternatives)) {
        console.log(`${spaces}  Alternatives:`);
        node.alternatives.forEach(alt => {
            traverse(alt, alt.name, indent + 2);
        });
    }

    // Recurse into nested SEQUENCE/CHOICE in fields
    if (node.type === 'SEQUENCE' && node.fields) {
        // Already handled above
    } else if (node.type === 'CHOICE' && node.alternatives) {
        // Already handled above
    }
}

console.log('Example 1: Traverse AlgoParameter');
console.log('-'.repeat(80));
const algoParam = db.getByName('AlgoParameter');
traverse(algoParam);
console.log('');

console.log('Example 2: Traverse PEStatus');
console.log('-'.repeat(80));
const peStatus = db.getByName('PEStatus');
traverse(peStatus);
console.log('');

console.log('Example 3: Traverse EXTERNAL (has nested CHOICE)');
console.log('-'.repeat(80));
const external = db.getByName('EXTERNAL');
traverse(external);
console.log('');

/**
 * More practical example: Collect all nodes with named values
 */
function collectNamedValues(node, path = '', results = []) {
    const currentPath = path || node.name || 'Root';

    // If this node has named values, record it
    if (hasNamedValues(node)) {
        results.push({
            path: currentPath,
            type: node.type,
            namedNumbers: node.namedNumbers,
            enum: node.enum
        });
    }

    // Recurse into fields
    if (node.fields && Array.isArray(node.fields)) {
        node.fields.forEach(field => {
            collectNamedValues(field, `${currentPath}.${field.name}`, results);
        });
    }

    // Recurse into alternatives
    if (node.alternatives && Array.isArray(node.alternatives)) {
        node.alternatives.forEach(alt => {
            collectNamedValues(alt, `${currentPath}.${alt.name}`, results);
        });
    }

    return results;
}

console.log('Example 4: Collect all nodes with named values in a structure');
console.log('-'.repeat(80));

const pinConfig = db.getByName('PINConfiguration');
const namedValueNodes = collectNamedValues(pinConfig);

console.log(`Found ${namedValueNodes.length} node(s) with named values in PINConfiguration:\n`);
namedValueNodes.forEach(node => {
    console.log(`Path: ${node.path}`);
    console.log(`  Type: ${node.type}`);
    console.log(`  Values: ${node.namedNumbers.length}`);
    console.log(`  Example: ${node.enum.getValue(node.namedNumbers[0].name)} = "${node.namedNumbers[0].name}"`);
    console.log('');
});

/**
 * Example: Process a node based on whether it has named values
 */
function processNode(node, path = '') {
    if (hasNamedValues(node)) {
        // This is an INTEGER with named values - handle specially
        console.log(`Processing INTEGER enum at ${path}:`);
        console.log(`  Valid values: ${node.enum.getNames().join(', ')}`);

        // Example: Create a validator
        const validator = (value) => {
            if (typeof value === 'string') {
                return node.enum.hasName(value);
            } else if (typeof value === 'number') {
                return node.enum.hasValue(value);
            }
            return false;
        };

        console.log(`  Test validator: "milenage" -> ${validator('milenage')}`);
        console.log(`  Test validator: 999 -> ${validator(999)}`);

        return {
            type: 'enum',
            validator,
            enum: node.enum
        };
    } else if (node.type === 'INTEGER') {
        // Regular INTEGER without named values
        console.log(`Processing regular INTEGER at ${path}`);
        return {
            type: 'integer'
        };
    } else if (node.type === 'OCTET STRING') {
        console.log(`Processing OCTET STRING at ${path}`);
        return {
            type: 'octet-string'
        };
    } else {
        console.log(`Processing ${node.type || 'unknown'} at ${path}`);
        return {
            type: node.type || 'unknown'
        };
    }
}

console.log('Example 5: Process nodes differently based on type');
console.log('-'.repeat(80));

if (algoParam.fields) {
    algoParam.fields.slice(0, 3).forEach(field => {
        const result = processNode(field, `AlgoParameter.${field.name}`);
        console.log('');
    });
}

/**
 * Simple check function you can use inline
 */
console.log('Example 6: Simple inline check');
console.log('-'.repeat(80));

function processField(field) {
    const fieldPath = field.name;

    // Simple check: does this field have namedNumbers?
    if (field.namedNumbers && field.namedNumbers.length > 0) {
        console.log(`${fieldPath}: INTEGER with ${field.namedNumbers.length} named values`);

        // Use the enum helper
        const firstValue = field.namedNumbers[0];
        console.log(`  Example: ${firstValue.name} = ${firstValue.value}`);
        console.log(`  Can convert: field.enum.getValue('${firstValue.name}') = ${field.enum.getValue(firstValue.name)}`);
    } else {
        console.log(`${fieldPath}: ${field.type} (no named values)`);
    }
}

console.log('Fields in AlgoParameter:\n');
algoParam.fields.forEach(processField);

console.log('');
console.log('='.repeat(80));
console.log('Summary: Check for named values using:');
console.log('  1. if (node.namedNumbers && node.namedNumbers.length > 0)');
console.log('  2. if (node.enum)');
console.log('  3. hasNamedValues(node) helper function');
console.log('='.repeat(80));
