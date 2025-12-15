# ASN.1 to JavaScript Query Structure

This repository provides a JavaScript query structure for ASN.1 definitions stored in an Erlang ETS database format.

## Features

- **Easy retrieval** by tag or name of definitions
- **Validator extraction** based on constraints (size, range, etc.)
- **Nested structure support** for enums and sequences with named types
- **Type notation** for sequence of choice items including constraints

## Files

- `profile.asn1db` - ASN.1 database in Erlang ETS format
- `start_here` - Instructions for loading the database in Erlang
- `convert_to_json.erl` - Erlang script to convert ETS database to JSON
- `asn1_definitions.json` - JSON representation of the ASN.1 database
- `asn1-query.js` - JavaScript query structure module
- `example.js` - Example usage demonstrating all features

## Quick Start

### 1. Convert the Database (if not already done)

```bash
erlc convert_to_json.erl
erl -noshell -s convert_to_json main
```

This creates `asn1_definitions.json` from `profile.asn1db`.

### 2. Use in JavaScript

```javascript
const ASN1Database = require('./asn1-query');

// Load the database
const db = ASN1Database.fromFile('./asn1_definitions.json');

// Get definition by name
const def = db.getByName('ProprietaryInfo');
console.log(db.prettyPrint(def));

// Get definitions by tag
const defs = db.getByTag('UNIVERSAL', 16);

// Search definitions
const results = db.search('PE-');

// Access all definition names
const names = db.getAllNames();
```

## API Reference

### ASN1Database

#### Constructor

- `ASN1Database.fromFile(filename)` - Load database from JSON file

#### Query Methods

- `getByName(name)` - Get a definition by name
- `getByTag(tagClass, tagNumber)` - Get definitions by tag class and number
- `getAllNames()` - Get array of all definition names
- `search(pattern)` - Search definitions by regex pattern

#### Utility Methods

- `prettyPrint(structure, indent)` - Pretty print a structure

### Structure Format

Each definition structure contains:

```javascript
{
  name: "DefinitionName",
  kind: "typedef" | "valuedef",
  line: 123,
  type: "SEQUENCE" | "CHOICE" | "INTEGER" | ...,

  // For typedefs
  tags: [{ class: "UNIVERSAL", number: 16, type: "IMPLICIT", form: 32 }],
  validators: [{ type: "size", min: 1, max: 200, message: "...", validate: fn }],

  // For SEQUENCE types
  fields: [
    {
      name: "fieldName",
      type: "OCTET STRING",
      position: 1,
      optional: true,
      hasDefault: false,
      tags: [{ class: "CONTEXT", number: 0 }],
      validators: [...]
    }
  ],

  // For CHOICE types
  alternatives: [
    {
      name: "altName",
      type: "INTEGER",
      tags: [{ class: "CONTEXT", number: 0 }],
      validators: [...]
    }
  ],

  // For valuedefs
  value: 2147483647,
  module: "PEDefinitions"
}
```

## Examples

### Example 1: Retrieve and Validate

```javascript
const db = ASN1Database.fromFile('./asn1_definitions.json');
const def = db.getByName('ProprietaryInfo');

// Access fields
for (const field of def.fields) {
    console.log(`${field.name} (${field.type})`);

    // Use validators
    if (field.validators) {
        for (const validator of field.validators) {
            const testValue = "test";
            const isValid = validator.validate(testValue);
            console.log(`Validation: ${isValid ? 'PASS' : 'FAIL'}`);
        }
    }
}
```

### Example 2: Working with CHOICE Types

```javascript
const db = ASN1Database.fromFile('./asn1_definitions.json');
const external = db.getByName('EXTERNAL');

// Find the encoding field which is a CHOICE
const encodingField = external.fields.find(f => f.name === 'encoding');

if (encodingField.type === 'CHOICE') {
    for (const alt of encodingField.alternatives) {
        console.log(`Alternative: ${alt.name}`);
        console.log(`  Type: ${alt.type}`);
        console.log(`  Tags: ${alt.tags.map(t => `[${t.class} ${t.number}]`).join(', ')}`);
    }
}
```

### Example 3: Nested Structures

```javascript
const db = ASN1Database.fromFile('./asn1_definitions.json');
const phonebook = db.getByName('PE-PHONEBOOK');

// Access nested fields
for (const field of phonebook.fields) {
    if (field.type === 'REFERENCE') {
        console.log(`${field.name} references ${field.reference.typeName}`);
    }
}
```

### Example 4: Validators

The query structure automatically extracts validators from constraints:

```javascript
const db = ASN1Database.fromFile('./asn1_definitions.json');
const def = db.getByName('ProprietaryInfo');
const field = def.fields[0]; // specialFileInformation

// Validators are ready to use
for (const validator of field.validators) {
    console.log(validator.message); // "Size must be between 1 and 1"
    console.log(validator.validate("x")); // true
    console.log(validator.validate("xx")); // false
}
```

## Running the Example

```bash
node example.js
```

This will demonstrate:
1. Loading the database
2. Retrieving definitions by name and tag
3. Working with SEQUENCE fields and validators
4. Handling CHOICE types with alternatives
5. Searching definitions
6. Working with nested structures
7. Accessing tags
8. Working with value definitions

## Database Loading in Erlang

If you want to work directly with the Erlang database:

```erlang
{ok, Tab} = ets:file2tab("./profile.asn1db").
ets:tab2list(Tab).
```

## Structure

The ASN.1 database contains 71 definitions including:
- Type definitions (SEQUENCE, CHOICE, primitive types)
- Value definitions (constants)
- Nested structures with references
- Constraints (size, range)
- Tags (UNIVERSAL, APPLICATION, CONTEXT, PRIVATE)

## License

This project processes ASN.1 definitions for query purposes.
