/**
 * Example: Working with INTEGER Named Values (Enumerations)
 *
 * This demonstrates how to represent and work with named integers
 * in your data structures.
 */

const ASN1Database = require('./asn1-query');

console.log('='.repeat(80));
console.log('INTEGER Named Values - Complete Guide');
console.log('='.repeat(80));
console.log('');

// Load database
const db = ASN1Database.fromFile('./asn1_definitions.json');

// Get AlgoParameter definition
const algoParam = db.getByName('AlgoParameter');
const algorithmIDField = algoParam.fields.find(f => f.name === 'algorithmID');

console.log('1. BASIC ACCESS - Get the raw named numbers');
console.log('-'.repeat(80));
console.log('Available values:');
algorithmIDField.namedNumbers.forEach(n => {
    console.log(`  ${n.value}: ${n.name}`);
});
console.log('');

console.log('2. CONVERT NAME TO VALUE - Use in your data structures');
console.log('-'.repeat(80));

// Example: Building data with named values
const myData = {
    algorithmID: algorithmIDField.enum.getValue('milenage')  // Returns 1
};
console.log('Creating data with algorithmID = "milenage":');
console.log(`  myData.algorithmID = ${myData.algorithmID}`);
console.log('');

// All conversion methods
console.log('Name to value conversions:');
console.log(`  "milenage" -> ${algorithmIDField.enum.getValue('milenage')}`);
console.log(`  "tuak" -> ${algorithmIDField.enum.getValue('tuak')}`);
console.log(`  "usim-test-algorithm" -> ${algorithmIDField.enum.getValue('usim-test-algorithm')}`);
console.log(`  "invalid" -> ${algorithmIDField.enum.getValue('invalid')} (undefined)`);
console.log('');

console.log('3. CONVERT VALUE TO NAME - Parse received data');
console.log('-'.repeat(80));

// Example: Reading data with numeric values
const receivedData = { algorithmID: 2 };
const algorithmName = algorithmIDField.enum.getName(receivedData.algorithmID);
console.log(`Received algorithmID = ${receivedData.algorithmID}`);
console.log(`  Name: ${algorithmName}`);
console.log('');

// All conversions
console.log('Value to name conversions:');
console.log(`  1 -> "${algorithmIDField.enum.getName(1)}"`);
console.log(`  2 -> "${algorithmIDField.enum.getName(2)}"`);
console.log(`  3 -> "${algorithmIDField.enum.getName(3)}"`);
console.log(`  99 -> ${algorithmIDField.enum.getName(99)} (undefined)`);
console.log('');

console.log('4. VALIDATION - Check if values are valid');
console.log('-'.repeat(80));

const testValues = [
    { value: 1, type: 'number' },
    { value: 'milenage', type: 'string' },
    { value: 99, type: 'number' },
    { value: 'invalid', type: 'string' }
];

testValues.forEach(test => {
    const isValid = algorithmIDField.enum.isValid(test.value);
    const status = isValid ? '✓ VALID' : '✗ INVALID';
    console.log(`  ${test.value} (${test.type}): ${status}`);
});
console.log('');

// Individual validation methods
console.log('Specific validation methods:');
console.log(`  hasName('milenage'): ${algorithmIDField.enum.hasName('milenage')}`);
console.log(`  hasName('invalid'): ${algorithmIDField.enum.hasName('invalid')}`);
console.log(`  hasValue(1): ${algorithmIDField.enum.hasValue(1)}`);
console.log(`  hasValue(99): ${algorithmIDField.enum.hasValue(99)}`);
console.log('');

console.log('5. CREATE LOOKUP MAPS - For efficient mapping');
console.log('-'.repeat(80));

// Create maps for O(1) lookups
const valueToName = algorithmIDField.enum.toValueMap();
const nameToValue = algorithmIDField.enum.toNameMap();

console.log('Value-to-Name map:');
console.log(JSON.stringify(valueToName, null, 2));
console.log('');

console.log('Name-to-Value map:');
console.log(JSON.stringify(nameToValue, null, 2));
console.log('');

console.log('Using the maps:');
console.log(`  valueToName[2] = "${valueToName[2]}"`);
console.log(`  nameToValue['tuak'] = ${nameToValue['tuak']}`);
console.log('');

console.log('6. GET ALL NAMES OR VALUES - For UI dropdowns, etc.');
console.log('-'.repeat(80));

const allNames = algorithmIDField.enum.getNames();
const allValues = algorithmIDField.enum.getValues();

console.log('All names:', allNames);
console.log('All values:', allValues);
console.log('');

// Example: Create a dropdown
console.log('Example HTML <select> options:');
allNames.forEach(name => {
    const value = algorithmIDField.enum.getValue(name);
    console.log(`  <option value="${value}">${name}</option>`);
});
console.log('');

console.log('7. COMPLETE EXAMPLE - Building and validating data');
console.log('-'.repeat(80));

// Function to create AlgoParameter data
function createAlgoParameter(algorithmName) {
    const field = db.getByName('AlgoParameter').fields.find(f => f.name === 'algorithmID');

    // Validate the name
    if (!field.enum.hasName(algorithmName)) {
        throw new Error(`Invalid algorithm: ${algorithmName}. Valid options: ${field.enum.getNames().join(', ')}`);
    }

    return {
        algorithmID: field.enum.getValue(algorithmName)
    };
}

// Function to parse AlgoParameter data
function parseAlgoParameter(data) {
    const field = db.getByName('AlgoParameter').fields.find(f => f.name === 'algorithmID');

    // Validate the value
    if (!field.enum.hasValue(data.algorithmID)) {
        throw new Error(`Invalid algorithm ID: ${data.algorithmID}`);
    }

    return {
        algorithmID: data.algorithmID,
        algorithmName: field.enum.getName(data.algorithmID)
    };
}

try {
    // Create data using name
    const data1 = createAlgoParameter('milenage');
    console.log('Created:', data1);

    // Parse data using value
    const parsed = parseAlgoParameter(data1);
    console.log('Parsed:', parsed);

    // Try invalid name
    console.log('');
    console.log('Testing with invalid name:');
    const data2 = createAlgoParameter('invalid-algo');
} catch (err) {
    console.log(`  Error: ${err.message}`);
}
console.log('');

console.log('8. OTHER EXAMPLES - More INTEGER enums in the database');
console.log('-'.repeat(80));

// PEStatus.status
const peStatus = db.getByName('PEStatus');
const statusField = peStatus.fields.find(f => f.name === 'status');

console.log('PEStatus.status enumeration:');
statusField.namedNumbers.slice(0, 5).forEach(n => {
    console.log(`  ${n.value}: ${n.name}`);
});
if (statusField.namedNumbers.length > 5) {
    console.log(`  ... and ${statusField.namedNumbers.length - 5} more`);
}
console.log('');

console.log('Quick conversions:');
console.log(`  0 -> "${statusField.enum.getName(0)}"`);
console.log(`  "memory-failure" -> ${statusField.enum.getValue('memory-failure')}`);
console.log('');

console.log('='.repeat(80));
console.log('Complete! You now have full control over INTEGER named values.');
console.log('='.repeat(80));
