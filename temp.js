export const mapType = (item, depth = 0, maxDepth = 10) => {
    // Prevent infinite recursion
    if (depth > maxDepth) {
        console.warn('Max recursion depth reached');
        return item;
    }
    
    // Handle Root2 level (top-level items with definition property)
    if (item && item.definition && item.type_name) {
        const defResult = mapDefinition(item.definition, depth);
        
        const mapped = {
            name: item.name,
            typeName: item.type_name,
            kind: item.kind,
            line: item.line,
            type: item.definition?.type_def?.type,
            ...defResult
        };
        
        // Add tag accessors for alternatives or fields
        if (mapped.alternatives) {
            mapped.alternatives.forEach(alt => {
                if (alt && alt.tag !== undefined) {
                    mapped[alt.tag] = alt;
                }
            });
        }
        
        if (mapped.fields) {
            mapped.fields.forEach(field => {
                if (field && field.tag !== undefined) {
                    mapped[field.tag] = field;
                }
            });
        }
        
        return mapped;
    }
    
    // Handle asn1DB result (has fields/type at top level, no definition)
    if (item && item.fields && item.type && item.name && !item.definition) {
        const mapped = {
            name: item.name,
            kind: item.kind,
            line: item.line,
            type: item.type
        };
        
        // Map the fields
        if (item.type === "SEQUENCE" || item.type === "SET") {
            mapped.fields = item.fields.map(field => mapField(field, depth + 1, maxDepth));
            
            // Add tag accessors
            mapped.fields.forEach(field => {
                if (field && field.tag !== undefined) {
                    mapped[field.tag] = field;
                }
            });
        } else if (item.type === "CHOICE" && item.fields) {
            // In this schema, CHOICE also uses 'fields' for alternatives
            mapped.alternatives = item.fields.map(field => mapField(field, depth + 1, maxDepth));
            
            // Add tag accessors
            mapped.alternatives.forEach(alt => {
                if (alt && alt.tag !== undefined) {
                    mapped[alt.tag] = alt;
                }
            });
        }
        
        return mapped;
    }
    
    // Handle Alternative level (items in the alternatives array)
    if (item && item.type && item.name !== undefined) {
        const tag = item.tags?.[0]?.number;
        const name = item.name;
        let ret = { name, tag };
        
        if (item.type.type_def) {
            const typeDef = item.type.type_def;
            
            if (typeDef.type === "reference") {
                ret.reference = typeDef.type_name;
                ret.module = typeDef.module;
                
                if (window.asn1DB) {
                    const def = window.asn1DB.getByName(typeDef.type_name);
                    if (def) {
                        const mappedDef = window.mapType(def, depth + 1, maxDepth);
                        ret.def = mappedDef;
                        
                        // Copy ALL tag-based accessors from mappedDef to ret
                        if (mappedDef) {
                            Object.keys(mappedDef).forEach(key => {
                                const numKey = parseInt(key);
                                if (!isNaN(numKey) && numKey.toString() === key) {
                                    ret[numKey] = mappedDef[numKey];
                                }
                            });
                        }
                    }
                }
            } else if (typeDef.type === "CHOICE" && typeDef.alternatives) {
                ret.type = "CHOICE";
                ret.choices = typeDef.alternatives.map(alt => window.mapType(alt, depth + 1, maxDepth));
                ret.alternatives = ret.choices;
                
                ret.choices.forEach(choice => {
                    if (choice && choice.tag !== undefined) {
                        ret[choice.tag] = choice;
                    }
                });
            } else if ((typeDef.type === "SEQUENCE" || typeDef.type === "SET") && typeDef.alternatives) {
                ret.type = typeDef.type;
                ret.fields = typeDef.alternatives.map(alt => window.mapType(alt, depth + 1, maxDepth));
                
                ret.fields.forEach(field => {
                    if (field && field.tag !== undefined) {
                        ret[field.tag] = field;
                    }
                });
            } else {
                ret.primitiveType = typeDef.type;
            }
        }
        
        return ret;
    }
    
    return item;
};

// Helper function to map fields from asn1DB structure
function mapField(field, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) {
        console.warn('Max recursion depth reached in mapField');
        return field;
    }
    
    const tag = field.tags?.[0]?.number;
    const name = field.name;
    let ret = { name, tag };
    
    if (field.type === "REFERENCE" && field.reference) {
        ret.reference = field.reference.typeName;
        ret.module = field.reference.module;
        
        if (window.asn1DB) {
            const def = window.asn1DB.getByName(field.reference.typeName);
            if (def) {
                const mappedDef = window.mapType(def, depth + 1, maxDepth);
                ret.def = mappedDef;
                
                // Copy tag accessors
                if (mappedDef) {
                    Object.keys(mappedDef).forEach(key => {
                        const numKey = parseInt(key);
                        if (!isNaN(numKey) && numKey.toString() === key) {
                            ret[numKey] = mappedDef[numKey];
                        }
                    });
                }
            }
        }
    } else if (field.type === "CHOICE" && field.alternatives) {
        ret.type = "CHOICE";
        ret.alternatives = field.alternatives.map(alt => mapField(alt, depth + 1, maxDepth));
        
        ret.alternatives.forEach(alt => {
            if (alt && alt.tag !== undefined) {
                ret[alt.tag] = alt;
            }
        });
    } else if ((field.type === "SEQUENCE" || field.type === "SET") && field.fields) {
        ret.type = field.type;
        ret.fields = field.fields.map(f => mapField(f, depth + 1, maxDepth));
        
        ret.fields.forEach(f => {
            if (f && f.tag !== undefined) {
                ret[f.tag] = f;
            }
        });
    } else {
        ret.primitiveType = field.type;
    }
    
    return ret;
}

function mapDefinition(definition, depth = 0, maxDepth = 10) {
    if (!definition || !definition.type_def) {
        return {};
    }
    
    const typeDef = definition.type_def;
    let result = { type: typeDef.type };
    
    if (typeDef.type === "CHOICE" && typeDef.alternatives) {
        result.alternatives = typeDef.alternatives.map(alt => window.mapType(alt, depth + 1, maxDepth));
        
        result.alternatives.forEach(alt => {
            if (alt && alt.tag !== undefined) {
                result[alt.tag] = alt;
            }
        });
    }
    
    if ((typeDef.type === "SEQUENCE" || typeDef.type === "SET") && typeDef.alternatives) {
        result.fields = typeDef.alternatives.map(alt => window.mapType(alt, depth + 1, maxDepth));
        
        result.fields.forEach(field => {
            if (field && field.tag !== undefined) {
                result[field.tag] = field;
            }
        });
    }
    
    return result;
}