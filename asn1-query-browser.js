/**
 * ASN.1 Database Query Structure - Browser Version
 *
 * This module provides an easy-to-use interface for querying ASN.1 definitions
 * with support for:
 * - Retrieval by name or tag
 * - Validator extraction from constraints
 * - Nested structure representation for sequences and enums
 * - Type notation for choice items
 *
 * Browser-compatible (no Node.js dependencies)
 */

class ASN1Database {
    constructor(jsonData) {
        this.definitions = jsonData;
        this.byName = new Map();
        this.byTag = new Map();

        // Index definitions for fast lookup
        this._indexDefinitions();
    }

    /**
     * Load database from JSON data (pre-loaded or fetched)
     */
    static fromData(data) {
        return new ASN1Database(data);
    }

    /**
     * Load database from URL (browser fetch)
     */
    static async fromURL(url) {
        const response = await fetch(url);
        const data = await response.json();
        return new ASN1Database(data);
    }

    /**
     * Index definitions by name and tag
     */
    _indexDefinitions() {
        for (const def of this.definitions) {
            // Index by name
            if (def.name) {
                this.byName.set(def.name, def);
            }

            // Index by tag if available
            if (def.definition && def.definition.tags) {
                for (const tag of def.definition.tags) {
                    const tagKey = `${tag.class}:${tag.number}`;
                    if (!this.byTag.has(tagKey)) {
                        this.byTag.set(tagKey, []);
                    }
                    this.byTag.get(tagKey).push(def);
                }
            }
        }
    }

    /**
     * Get definition by name
     */
    getByName(name) {
        const def = this.byName.get(name);
        if (!def) return null;
        return this._buildStructure(def);
    }

    /**
     * Get definitions by tag (class and number)
     */
    getByTag(tagClass, tagNumber) {
        const tagKey = `${tagClass}:${tagNumber}`;
        const defs = this.byTag.get(tagKey);
        if (!defs) return [];
        return defs.map(def => this._buildStructure(def));
    }

    /**
     * Get all definition names
     */
    getAllNames() {
        return Array.from(this.byName.keys());
    }

    /**
     * Search definitions by pattern
     */
    search(pattern) {
        const regex = new RegExp(pattern, 'i');
        return Array.from(this.byName.entries())
            .filter(([name, _]) => regex.test(name))
            .map(([_, def]) => this._buildStructure(def));
    }

    /**
     * Build a structured representation of a definition
     */
    _buildStructure(def) {
        const structure = {
            name: def.name,
            kind: def.kind,
            line: def.line
        };

        // Handle valuedefs separately
        if (def.kind === 'valuedef') {
            if (def.value !== undefined) {
                structure.value = def.value;
            }
            if (def.type && def.type.type_def) {
                structure.type = def.type.type_def.type || 'unknown';
            }
            if (def.module) {
                structure.module = def.module;
            }
            return structure;
        }

        if (!def.definition) {
            return structure;
        }

        // Add tags
        if (def.definition.tags && def.definition.tags.length > 0) {
            structure.tags = def.definition.tags.map(tag => ({
                class: tag.class,
                number: tag.number,
                type: tag.tag_type,
                form: tag.form
            }));
        }

        // Add validators from constraints
        if (def.definition.constraints) {
            structure.validators = this._extractValidators(def.definition.constraints);
        }

        // Process type definition
        if (def.definition.type_def) {
            const typeDef = def.definition.type_def;

            if (typeDef.type === 'SEQUENCE') {
                structure.type = 'SEQUENCE';
                structure.fields = this._buildSequenceFields(typeDef.components || []);
            } else if (typeDef.type === 'CHOICE') {
                structure.type = 'CHOICE';
                structure.alternatives = this._buildChoiceAlternatives(typeDef.alternatives || []);
            } else if (typeDef.type === 'reference') {
                structure.type = 'REFERENCE';
                structure.reference = {
                    module: typeDef.module,
                    typeName: typeDef.type_name
                };
            } else if (typeof typeDef.type === 'string') {
                structure.type = typeDef.type;

                // Handle special types
                if (typeDef.type === 'BIT STRING' && typeDef.named_bits) {
                    structure.namedBits = typeDef.named_bits;
                }

                // Handle INTEGER with named numbers (enumerations)
                if (typeDef.type === 'INTEGER' && typeDef.named_numbers) {
                    structure.namedNumbers = typeDef.named_numbers;
                    structure.enum = this._createEnumHelper(typeDef.named_numbers);
                }
            }
        }

        return structure;
    }

    /**
     * Create enum helper for INTEGER with named values
     */
    _createEnumHelper(namedNumbers) {
        const helper = {
            // Array of all named numbers
            values: namedNumbers,

            // Get numeric value from name
            getValue(name) {
                const found = namedNumbers.find(n => n.name === name);
                return found ? found.value : undefined;
            },

            // Get name from numeric value
            getName(value) {
                const found = namedNumbers.find(n => n.value === value);
                return found ? found.name : undefined;
            },

            // Check if name exists
            hasName(name) {
                return namedNumbers.some(n => n.name === name);
            },

            // Check if value exists
            hasValue(value) {
                return namedNumbers.some(n => n.value === value);
            },

            // Validate a value or name
            isValid(valueOrName) {
                if (typeof valueOrName === 'string') {
                    return this.hasName(valueOrName);
                }
                return this.hasValue(valueOrName);
            },

            // Get all names
            getNames() {
                return namedNumbers.map(n => n.name);
            },

            // Get all values
            getValues() {
                return namedNumbers.map(n => n.value);
            },

            // Create a value-to-name map
            toValueMap() {
                return Object.fromEntries(namedNumbers.map(n => [n.value, n.name]));
            },

            // Create a name-to-value map
            toNameMap() {
                return Object.fromEntries(namedNumbers.map(n => [n.name, n.value]));
            },

            // Format for display
            toString() {
                return namedNumbers.map(n => `${n.value}:${n.name}`).join(', ');
            }
        };

        return helper;
    }

    /**
     * Build structured representation of SEQUENCE fields
     */
    _buildSequenceFields(components) {
        return components.map(comp => {
            const field = {
                name: comp.name,
                position: comp.position,
                optional: comp.default === 'OPTIONAL'
            };

            // Add default value if present
            if (comp.default && typeof comp.default === 'object' && comp.default.default !== undefined) {
                field.hasDefault = true;
                field.defaultValue = comp.default.default;
            }

            // Add tags
            if (comp.tags && comp.tags.length > 0) {
                field.tags = comp.tags;
            }

            // Process field type
            if (comp.type && comp.type.type_def) {
                const typeDef = comp.type.type_def;

                if (typeDef.type === 'CHOICE') {
                    // Handle nested CHOICE
                    field.type = 'CHOICE';
                    field.alternatives = this._buildChoiceAlternatives(typeDef.alternatives || []);
                } else if (typeDef.type === 'SEQUENCE') {
                    // Handle nested SEQUENCE
                    field.type = 'SEQUENCE';
                    field.fields = this._buildSequenceFields(typeDef.components || []);
                } else if (typeDef.type === 'reference') {
                    field.type = 'REFERENCE';
                    field.reference = {
                        module: typeDef.module,
                        typeName: typeDef.type_name
                    };
                } else {
                    field.type = typeDef.type || 'unknown';

                    // Handle special types
                    if (typeDef.type === 'BIT STRING' && typeDef.named_bits) {
                        field.namedBits = typeDef.named_bits;
                    }

                    // Handle INTEGER with named numbers (enumerations)
                    if (typeDef.type === 'INTEGER' && typeDef.named_numbers) {
                        field.namedNumbers = typeDef.named_numbers;
                        field.enum = this._createEnumHelper(typeDef.named_numbers);
                    }
                }

                // Add validators from constraints
                if (comp.type.constraints) {
                    field.validators = this._extractValidators(comp.type.constraints);
                }
            }

            return field;
        });
    }

    /**
     * Build structured representation of CHOICE alternatives
     */
    _buildChoiceAlternatives(alternatives) {
        return alternatives.map(alt => {
            const alternative = {
                name: alt.name
            };

            // Add tags
            if (alt.tags && alt.tags.length > 0) {
                alternative.tags = alt.tags;
            }

            // Process alternative type
            if (alt.type && alt.type.type_def) {
                const typeDef = alt.type.type_def;

                if (typeDef.type === 'CHOICE') {
                    // Nested CHOICE
                    alternative.type = 'CHOICE';
                    alternative.alternatives = this._buildChoiceAlternatives(typeDef.alternatives || []);
                } else if (typeDef.type === 'SEQUENCE') {
                    // Nested SEQUENCE
                    alternative.type = 'SEQUENCE';
                    alternative.fields = this._buildSequenceFields(typeDef.components || []);
                } else if (typeDef.type === 'reference') {
                    alternative.type = 'REFERENCE';
                    alternative.reference = {
                        module: typeDef.module,
                        typeName: typeDef.type_name
                    };
                } else {
                    alternative.type = typeDef.type || 'unknown';

                    // Handle special types
                    if (typeDef.type === 'BIT STRING' && typeDef.named_bits) {
                        alternative.namedBits = typeDef.named_bits;
                    }

                    // Handle INTEGER with named numbers (enumerations)
                    if (typeDef.type === 'INTEGER' && typeDef.named_numbers) {
                        alternative.namedNumbers = typeDef.named_numbers;
                        alternative.enum = this._createEnumHelper(typeDef.named_numbers);
                    }
                }

                // Add validators from constraints
                if (alt.type.constraints) {
                    alternative.validators = this._extractValidators(alt.type.constraints);
                }
            }

            return alternative;
        });
    }

    /**
     * Extract validators from constraints
     */
    _extractValidators(constraints) {
        if (!constraints || constraints.length === 0) {
            return [];
        }

        const validators = [];

        for (const constraint of constraints) {
            if (constraint.type === 'size') {
                validators.push({
                    type: 'size',
                    min: constraint.min,
                    max: constraint.max,
                    validate: function(value) {
                        const len = value.length || 0;
                        return len >= this.min && len <= this.max;
                    },
                    message: `Size must be between ${constraint.min} and ${constraint.max}`
                });
            } else if (constraint.type === 'range') {
                validators.push({
                    type: 'range',
                    min: constraint.min,
                    max: constraint.max,
                    validate: function(value) {
                        return value >= this.min && value <= this.max;
                    },
                    message: `Value must be between ${constraint.min} and ${constraint.max}`
                });
            } else if (constraint.raw) {
                validators.push({
                    type: 'raw',
                    constraint: constraint.raw
                });
            }
        }

        return validators;
    }

    /**
     * Pretty print a structure
     */
    prettyPrint(structure, indent = 0) {
        const spaces = ' '.repeat(indent);
        let output = '';

        output += `${spaces}Name: ${structure.name}\n`;
        output += `${spaces}Type: ${structure.type || structure.kind}\n`;

        if (structure.tags && structure.tags.length > 0) {
            output += `${spaces}Tags:\n`;
            for (const tag of structure.tags) {
                output += `${spaces}  [${tag.class} ${tag.number}] ${tag.type}\n`;
            }
        }

        if (structure.validators && structure.validators.length > 0) {
            output += `${spaces}Validators:\n`;
            for (const validator of structure.validators) {
                if (validator.type === 'size') {
                    output += `${spaces}  - Size: ${validator.min}..${validator.max}\n`;
                } else if (validator.type === 'range') {
                    output += `${spaces}  - Range: ${validator.min}..${validator.max}\n`;
                }
            }
        }

        if (structure.fields) {
            output += `${spaces}Fields:\n`;
            for (const field of structure.fields) {
                output += `${spaces}  ${field.name} (${field.type})`;
                if (field.optional) {
                    output += ' [OPTIONAL]';
                }
                if (field.hasDefault) {
                    output += ' [DEFAULT]';
                }
                output += '\n';

                // Show named numbers for INTEGER enumerations
                if (field.namedNumbers && field.namedNumbers.length > 0) {
                    output += `${spaces}    Named values:\n`;
                    for (const named of field.namedNumbers) {
                        output += `${spaces}      ${named.value}: ${named.name}\n`;
                    }
                }

                if (field.validators && field.validators.length > 0) {
                    for (const validator of field.validators) {
                        if (validator.type === 'size') {
                            output += `${spaces}    - Size: ${validator.min}..${validator.max}\n`;
                        } else if (validator.type === 'range') {
                            output += `${spaces}    - Range: ${validator.min}..${validator.max}\n`;
                        }
                    }
                }

                // Show nested structures
                if (field.type === 'CHOICE' && field.alternatives) {
                    output += `${spaces}    Alternatives:\n`;
                    for (const alt of field.alternatives) {
                        output += `${spaces}      - ${alt.name} (${alt.type})\n`;
                    }
                }
            }
        }

        if (structure.alternatives) {
            output += `${spaces}Alternatives:\n`;
            for (const alt of structure.alternatives) {
                output += `${spaces}  ${alt.name} (${alt.type})\n`;

                // Show named numbers for INTEGER enumerations
                if (alt.namedNumbers && alt.namedNumbers.length > 0) {
                    output += `${spaces}    Named values:\n`;
                    for (const named of alt.namedNumbers) {
                        output += `${spaces}      ${named.value}: ${named.name}\n`;
                    }
                }

                if (alt.validators && alt.validators.length > 0) {
                    for (const validator of alt.validators) {
                        if (validator.type === 'size') {
                            output += `${spaces}    - Size: ${validator.min}..${validator.max}\n`;
                        } else if (validator.type === 'range') {
                            output += `${spaces}    - Range: ${validator.min}..${validator.max}\n`;
                        }
                    }
                }
            }
        }

        if (structure.value !== undefined) {
            output += `${spaces}Value: ${structure.value}\n`;
        }

        return output;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = ASN1Database;
}
if (typeof window !== 'undefined') {
    // Browser global
    window.ASN1Database = ASN1Database;
}
