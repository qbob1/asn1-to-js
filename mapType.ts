interface ASN1Item {
    type_name?: string;
    name: string;
    line?: number;
    kind?: string;
    definition?: Definition;
    checked?: boolean;
    type?: string;
    tags?: Tag[];
    fields?: Field[];
    alternatives?: Alternative[];
  }
  
  interface Definition {
    type_def: TypeDef;
    tags?: string;
    constraints?: string;
  }
  
  interface TypeDef {
    type: string;
    alternatives?: Alternative[];
    type_name?: string;
    module?: string;
    line?: number;
  }
  
  interface Alternative {
    type: TypeInfo;
    tags: Tag[];
    position?: any;
    name: string;
    line: number;
    default?: string;
    component_type?: string;
  }
  
  interface TypeInfo {
    type_def: TypeDef;
    tags: TypeTag[];
    constraints?: string;
  }
  
  interface TypeTag {
    tag_type?: string;
    number: number;
    form?: number;
    class: string;
  }
  
  interface Tag {
    number: number;
    class: string;
  }
  
  interface Field {
    name: string;
    optional?: boolean;
    position?: number;
    reference?: {
      module: string;
      typeName: string;
    };
    tags?: Tag[];
    type: string;
    alternatives?: Field[];
    fields?: Field[];
    validators?: any[];
  }
  
  interface MappedType {
    name: string;
    tag?: number;
    typeName?: string;
    kind?: string;
    line?: number;
    type?: string;
    reference?: string;
    module?: string;
    def?: MappedType;
    alternatives?: MappedType[];
    choices?: MappedType[];
    fields?: MappedType[];
    fieldsByTag?: Record<number, MappedType>;
    fieldsByName?: Record<string, MappedType>;
    byTag?: Record<number, MappedType>;
    byName?: Record<string, MappedType>;
    primitiveType?: string;
    [key: number]: MappedType; // Allow numeric indexing
  }
  
  interface ASN1DB {
    getByName: (typeName: string) => ASN1Item | null;
  }
  
  export function mapType(
    item: ASN1Item,
    asn1DB: ASN1DB,
    depth: number = 0,
    maxDepth: number = 10
  ): MappedType {
    // Prevent infinite recursion
    if (depth > maxDepth) {
      console.warn('Max recursion depth reached');
      return item as any;
    }
  
    // Handle Root2 level (top-level items with definition property)
    if (item && item.definition && item.type_name) {
      const defResult = mapDefinition(item.definition, asn1DB, depth);
  
      const mapped: MappedType = {
        name: item.name,
        typeName: item.type_name,
        kind: item.kind,
        line: item.line,
        type: item.definition?.type_def?.type,
        ...defResult,
      };
  
      // Add tag accessors for alternatives or fields
      if (mapped.alternatives) {
        mapped.alternatives.forEach((alt) => {
          if (alt && alt.tag !== undefined) {
            mapped[alt.tag] = alt;
          }
        });
      }
  
      if (mapped.fields) {
        mapped.fields.forEach((field) => {
          if (field && field.tag !== undefined) {
            mapped[field.tag] = field;
          }
        });
      }
  
      return mapped;
    }
  
    // Handle asn1DB result (has fields/type at top level, no definition)
    if (item && item.fields && item.type && item.name && !item.definition) {
      const mapped: MappedType = {
        name: item.name,
        kind: item.kind,
        line: item.line,
        type: item.type,
      };
  
      // Map the fields
      if (item.type === 'SEQUENCE' || item.type === 'SET') {
        mapped.fields = item.fields.map((field) => mapField(field, asn1DB, depth + 1, maxDepth));
  
        // Add tag accessors
        mapped.fields.forEach((field) => {
          if (field && field.tag !== undefined) {
            mapped[field.tag] = field;
          }
        });
      } else if (item.type === 'CHOICE' && item.fields) {
        // In this schema, CHOICE also uses 'fields' for alternatives
        mapped.alternatives = item.fields.map((field) => mapField(field, asn1DB, depth + 1, maxDepth));
  
        // Add tag accessors
        mapped.alternatives.forEach((alt) => {
          if (alt && alt.tag !== undefined) {
            mapped[alt.tag] = alt;
          }
        });
      }
  
      return mapped;
    }
  
    // Handle Alternative level (items in the alternatives array)
    if (item && (item as any).type && item.name !== undefined) {
      const altItem = item as Alternative;
      const tag = altItem.tags?.[0]?.number;
      const name = altItem.name;
      let ret: MappedType = { name, tag };
  
      if (altItem.type.type_def) {
        const typeDef = altItem.type.type_def;
  
        if (typeDef.type === 'reference') {
          ret.reference = typeDef.type_name;
          ret.module = typeDef.module;
  
          const def = asn1DB.getByName(typeDef.type_name!);
          if (def) {
            const mappedDef = mapType(def, asn1DB, depth + 1, maxDepth);
            ret.def = mappedDef;
  
            // Copy ALL tag-based accessors from mappedDef to ret
            if (mappedDef) {
              Object.keys(mappedDef).forEach((key) => {
                const numKey = parseInt(key);
                if (!isNaN(numKey) && numKey.toString() === key) {
                  ret[numKey] = mappedDef[numKey];
                }
              });
            }
          }
        } else if (typeDef.type === 'CHOICE' && typeDef.alternatives) {
          ret.type = 'CHOICE';
          ret.choices = typeDef.alternatives.map((alt) => mapType(alt as any, asn1DB, depth + 1, maxDepth));
          ret.alternatives = ret.choices;
  
          ret.choices.forEach((choice) => {
            if (choice && choice.tag !== undefined) {
              ret[choice.tag] = choice;
            }
          });
        } else if ((typeDef.type === 'SEQUENCE' || typeDef.type === 'SET') && typeDef.alternatives) {
          ret.type = typeDef.type;
          ret.fields = typeDef.alternatives.map((alt) => mapType(alt as any, asn1DB, depth + 1, maxDepth));
  
          ret.fields.forEach((field) => {
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
  
    return item as any;
  }
  
  // Helper function to map fields from asn1DB structure
  function mapField(field: Field, asn1DB: ASN1DB, depth: number = 0, maxDepth: number = 10): MappedType {
    if (depth > maxDepth) {
      console.warn('Max recursion depth reached in mapField');
      return field as any;
    }
  
    const tag = field.tags?.[0]?.number;
    const name = field.name;
    let ret: MappedType = { name, tag };
  
    if (field.type === 'REFERENCE' && field.reference) {
      ret.reference = field.reference.typeName;
      ret.module = field.reference.module;
  
      const def = asn1DB.getByName(field.reference.typeName);
      if (def) {
        const mappedDef = mapType(def, asn1DB, depth + 1, maxDepth);
        ret.def = mappedDef;
  
        // Copy tag accessors
        if (mappedDef) {
          Object.keys(mappedDef).forEach((key) => {
            const numKey = parseInt(key);
            if (!isNaN(numKey) && numKey.toString() === key) {
              ret[numKey] = mappedDef[numKey];
            }
          });
        }
      }
    } else if (field.type === 'CHOICE' && field.alternatives) {
      ret.type = 'CHOICE';
      ret.alternatives = field.alternatives.map((alt) => mapField(alt, asn1DB, depth + 1, maxDepth));
  
      ret.alternatives.forEach((alt) => {
        if (alt && alt.tag !== undefined) {
          ret[alt.tag] = alt;
        }
      });
    } else if ((field.type === 'SEQUENCE' || field.type === 'SET') && field.fields) {
      ret.type = field.type;
      ret.fields = field.fields.map((f) => mapField(f, asn1DB, depth + 1, maxDepth));
  
      ret.fields.forEach((f) => {
        if (f && f.tag !== undefined) {
          ret[f.tag] = f;
        }
      });
    } else {
      ret.primitiveType = field.type;
    }
  
    return ret;
  }
  
  function mapDefinition(
    definition: Definition,
    asn1DB: ASN1DB,
    depth: number = 0,
    maxDepth: number = 10
  ): Partial<MappedType> {
    if (!definition || !definition.type_def) {
      return {};
    }
  
    const typeDef = definition.type_def;
    let result: Partial<MappedType> = { type: typeDef.type };
  
    if (typeDef.type === 'CHOICE' && typeDef.alternatives) {
      result.alternatives = typeDef.alternatives.map((alt) => mapType(alt as any, asn1DB, depth + 1, maxDepth));
  
      result.alternatives.forEach((alt) => {
        if (alt && alt.tag !== undefined) {
          (result as any)[alt.tag] = alt;
        }
      });
    }
  
    if ((typeDef.type === 'SEQUENCE' || typeDef.type === 'SET') && typeDef.alternatives) {
      result.fields = typeDef.alternatives.map((alt) => mapType(alt as any, asn1DB, depth + 1, maxDepth));
  
      result.fields.forEach((field) => {
        if (field && field.tag !== undefined) {
          (result as any)[field.tag] = field;
        }
      });
    }
  
    return result;
  }
  
  export type { ASN1Item, MappedType, ASN1DB };