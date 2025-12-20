// mapType.js
function mapType(item, asn1DB, depth = 0, maxDepth = 10) {
  if (depth > maxDepth) {
    console.warn("Max recursion depth reached");
    return item;
  }
  if (item && item.definition && item.type_name) {
    const defResult = mapDefinition(item.definition, asn1DB, depth);
    const mapped = {
      name: item.name,
      typeName: item.type_name,
      kind: item.kind,
      line: item.line,
      type: item.definition?.type_def?.type,
      ...defResult
    };
    if (mapped.alternatives) {
      mapped.alternatives.forEach((alt) => {
        if (alt && alt.tag !== void 0) {
          mapped[alt.tag] = alt;
        }
      });
    }
    if (mapped.fields) {
      mapped.fields.forEach((field) => {
        if (field && field.tag !== void 0) {
          mapped[field.tag] = field;
        }
      });
    }
    return mapped;
  }
  if (item && item.fields && item.type && item.name && !item.definition) {
    const mapped = {
      name: item.name,
      kind: item.kind,
      line: item.line,
      type: item.type
    };
    if (item.type === "SEQUENCE" || item.type === "SET") {
      mapped.fields = item.fields.map((field) => mapField(field, asn1DB, depth + 1, maxDepth));
      mapped.fields.forEach((field) => {
        if (field && field.tag !== void 0) {
          mapped[field.tag] = field;
        }
      });
    } else if (item.type === "CHOICE" && item.fields) {
      mapped.alternatives = item.fields.map((field) => mapField(field, asn1DB, depth + 1, maxDepth));
      mapped.alternatives.forEach((alt) => {
        if (alt && alt.tag !== void 0) {
          mapped[alt.tag] = alt;
        }
      });
    }
    return mapped;
  }
  if (item && item.type && item.name !== void 0) {
    const altItem = item;
    const tag = altItem.tags?.[0]?.number;
    const name = altItem.name;
    let ret = { name, tag };
    if (altItem.type.type_def) {
      const typeDef = altItem.type.type_def;
      if (typeDef.type === "reference") {
        ret.reference = typeDef.type_name;
        ret.module = typeDef.module;
        const def = asn1DB.getByName(typeDef.type_name);
        if (def) {
          const mappedDef = mapType(def, asn1DB, depth + 1, maxDepth);
          ret.def = mappedDef;
          if (mappedDef) {
            Object.keys(mappedDef).forEach((key) => {
              const numKey = parseInt(key);
              if (!isNaN(numKey) && numKey.toString() === key) {
                ret[numKey] = mappedDef[numKey];
              }
            });
          }
        }
      } else if (typeDef.type === "CHOICE" && typeDef.alternatives) {
        ret.type = "CHOICE";
        ret.choices = typeDef.alternatives.map((alt) => mapType(alt, asn1DB, depth + 1, maxDepth));
        ret.alternatives = ret.choices;
        ret.choices.forEach((choice) => {
          if (choice && choice.tag !== void 0) {
            ret[choice.tag] = choice;
          }
        });
      } else if ((typeDef.type === "SEQUENCE" || typeDef.type === "SET") && typeDef.alternatives) {
        ret.type = typeDef.type;
        ret.fields = typeDef.alternatives.map((alt) => mapType(alt, asn1DB, depth + 1, maxDepth));
        ret.fields.forEach((field) => {
          if (field && field.tag !== void 0) {
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
}
function mapField(field, asn1DB, depth = 0, maxDepth = 10) {
  if (depth > maxDepth) {
    console.warn("Max recursion depth reached in mapField");
    return field;
  }
  const tag = field.tags?.[0]?.number;
  const name = field.name;
  let ret = { name, tag };
  if (field.type === "REFERENCE" && field.reference) {
    ret.reference = field.reference.typeName;
    ret.module = field.reference.module;
    const def = asn1DB.getByName(field.reference.typeName);
    if (def) {
      const mappedDef = mapType(def, asn1DB, depth + 1, maxDepth);
      ret.def = mappedDef;
      if (mappedDef) {
        Object.keys(mappedDef).forEach((key) => {
          const numKey = parseInt(key);
          if (!isNaN(numKey) && numKey.toString() === key) {
            ret[numKey] = mappedDef[numKey];
          }
        });
      }
    }
  } else if (field.type === "CHOICE" && field.alternatives) {
    ret.type = "CHOICE";
    ret.alternatives = field.alternatives.map((alt) => mapField(alt, asn1DB, depth + 1, maxDepth));
    ret.alternatives.forEach((alt) => {
      if (alt && alt.tag !== void 0) {
        ret[alt.tag] = alt;
      }
    });
  } else if ((field.type === "SEQUENCE" || field.type === "SET") && field.fields) {
    ret.type = field.type;
    ret.fields = field.fields.map((f) => mapField(f, asn1DB, depth + 1, maxDepth));
    ret.fields.forEach((f) => {
      if (f && f.tag !== void 0) {
        ret[f.tag] = f;
      }
    });
  } else {
    ret.primitiveType = field.type;
  }
  return ret;
}
function mapDefinition(definition, asn1DB, depth = 0, maxDepth = 10) {
  if (!definition || !definition.type_def) {
    return {};
  }
  const typeDef = definition.type_def;
  let result = { type: typeDef.type };
  if (typeDef.type === "CHOICE" && typeDef.alternatives) {
    result.alternatives = typeDef.alternatives.map((alt) => mapType(alt, asn1DB, depth + 1, maxDepth));
    result.alternatives.forEach((alt) => {
      if (alt && alt.tag !== void 0) {
        result[alt.tag] = alt;
      }
    });
  }
  if ((typeDef.type === "SEQUENCE" || typeDef.type === "SET") && typeDef.alternatives) {
    result.fields = typeDef.alternatives.map((alt) => mapType(alt, asn1DB, depth + 1, maxDepth));
    result.fields.forEach((field) => {
      if (field && field.tag !== void 0) {
        result[field.tag] = field;
      }
    });
  }
  return result;
}

// asn1-query-browser.js
var ASN1Database = class {
  constructor(jsonData) {
    this.definitions = jsonData;
    this.byName = /* @__PURE__ */ new Map();
    this.byTag = /* @__PURE__ */ new Map();
    this._indexDefinitions();
  }
  static fromData(data) {
    return new ASN1Database(data);
  }
  static async fromURL(url) {
    const response = await fetch(url);
    const data = await response.json();
    return new ASN1Database(data);
  }
  _indexDefinitions() {
    for (const def of this.definitions) {
      if (def.name) {
        this.byName.set(def.name, def);
      }
      if (def.definition && def.definition.tags) {
        for (const tag of def.definition.tags) {
          const tagKey = `${tag.class}:${tag.number}`;
          if (!this.byTag.has(tagKey)) {
            this.byTag.set(tagKey, []);
          }
          this.byTag.get(tagKey).push(def);
        }
      }
      if (def.definition && def.definition.type_def && def.definition.type_def.components) {
        this._indexComponentTags(def.definition.type_def.components, def);
      }
      if (def.definition && def.definition.type_def && def.definition.type_def.alternatives) {
        this._indexComponentTags(def.definition.type_def.alternatives, def);
      }
    }
  }
  _indexComponentTags(components, parentDef) {
    if (!components || !Array.isArray(components))
      return;
    for (const comp of components) {
      if (comp.tags && Array.isArray(comp.tags)) {
        for (const tag of comp.tags) {
          const tagKey = `${tag.class}:${tag.number}`;
          if (!this.byTag.has(tagKey)) {
            this.byTag.set(tagKey, []);
          }
          if (!this.byTag.get(tagKey).includes(parentDef)) {
            this.byTag.get(tagKey).push(parentDef);
          }
        }
      }
      if (comp.type && comp.type.type_def && comp.type.type_def.components) {
        this._indexComponentTags(comp.type.type_def.components, parentDef);
      }
      if (comp.type && comp.type.type_def && comp.type.type_def.alternatives) {
        this._indexComponentTags(comp.type.type_def.alternatives, parentDef);
      }
    }
  }
  getByName(name) {
    const def = this.byName.get(name);
    if (!def)
      return null;
    return this._buildStructure(def);
  }
  getByTag(tagClass, tagNumber) {
    const tagKey = `${tagClass}:${tagNumber}`;
    const defs = this.byTag.get(tagKey);
    if (!defs)
      return [];
    return defs.map((def) => this._buildStructure(def));
  }
  getAllNames() {
    return Array.from(this.byName.keys());
  }
  search(pattern) {
    const regex = new RegExp(pattern, "i");
    return Array.from(this.byName.entries()).filter(([name, _]) => regex.test(name)).map(([_, def]) => this._buildStructure(def));
  }
  _buildStructure(def) {
    const structure = {
      name: def.name,
      kind: def.kind,
      line: def.line
    };
    if (def.kind === "valuedef") {
      if (def.value !== void 0) {
        structure.value = def.value;
      }
      if (def.type && def.type.type_def) {
        structure.type = def.type.type_def.type || "unknown";
      }
      if (def.module) {
        structure.module = def.module;
      }
      return structure;
    }
    if (!def.definition) {
      return structure;
    }
    if (def.definition.tags && def.definition.tags.length > 0) {
      structure.tags = def.definition.tags.map((tag) => ({
        class: tag.class,
        number: tag.number,
        type: tag.tag_type,
        form: tag.form
      }));
    }
    if (def.definition.constraints) {
      structure.validators = this._extractValidators(def.definition.constraints);
    }
    if (def.definition.type_def) {
      const typeDef = def.definition.type_def;
      if (typeDef.type === "SEQUENCE") {
        structure.type = "SEQUENCE";
        structure.fields = this._buildSequenceFields(typeDef.components || []);
      } else if (typeDef.type === "CHOICE") {
        structure.type = "CHOICE";
        structure.alternatives = this._buildChoiceAlternatives(typeDef.alternatives || []);
      } else if (typeDef.type === "reference") {
        structure.type = "REFERENCE";
        structure.reference = {
          module: typeDef.module,
          typeName: typeDef.type_name
        };
      } else if (typeof typeDef.type === "string") {
        structure.type = typeDef.type;
        if (typeDef.type === "BIT STRING" && typeDef.named_bits) {
          structure.namedBits = typeDef.named_bits;
        }
        if (typeDef.type === "INTEGER" && typeDef.named_numbers) {
          structure.namedNumbers = typeDef.named_numbers;
          structure.enum = this._createEnumHelper(typeDef.named_numbers);
        }
      }
    }
    return structure;
  }
  _createEnumHelper(namedNumbers) {
    const helper = {
      values: namedNumbers,
      getValue(name) {
        const found = namedNumbers.find((n) => n.name === name);
        return found ? found.value : void 0;
      },
      getName(value) {
        const found = namedNumbers.find((n) => n.value === value);
        return found ? found.name : void 0;
      },
      hasName(name) {
        return namedNumbers.some((n) => n.name === name);
      },
      hasValue(value) {
        return namedNumbers.some((n) => n.value === value);
      },
      isValid(valueOrName) {
        if (typeof valueOrName === "string") {
          return this.hasName(valueOrName);
        }
        return this.hasValue(valueOrName);
      },
      getNames() {
        return namedNumbers.map((n) => n.name);
      },
      getValues() {
        return namedNumbers.map((n) => n.value);
      },
      toValueMap() {
        return Object.fromEntries(namedNumbers.map((n) => [n.value, n.name]));
      },
      toNameMap() {
        return Object.fromEntries(namedNumbers.map((n) => [n.name, n.value]));
      },
      toString() {
        return namedNumbers.map((n) => `${n.value}:${n.name}`).join(", ");
      }
    };
    return helper;
  }
  _buildSequenceFields(components) {
    return components.map((comp) => {
      const field = {
        name: comp.name,
        position: comp.position,
        optional: comp.default === "OPTIONAL"
      };
      if (comp.default && typeof comp.default === "object" && comp.default.default !== void 0) {
        field.hasDefault = true;
        field.defaultValue = comp.default.default;
      }
      if (comp.type && comp.type.tags && comp.type.tags.length > 0) {
        field.tags = comp.type.tags;
      } else if (comp.tags && comp.tags.length > 0) {
        field.tags = comp.tags;
      }
      if (comp.type && comp.type.type_def) {
        const typeDef = comp.type.type_def;
        if (typeDef.type === "CHOICE") {
          field.type = "CHOICE";
          field.alternatives = this._buildChoiceAlternatives(typeDef.alternatives || []);
        } else if (typeDef.type === "SEQUENCE") {
          field.type = "SEQUENCE";
          field.fields = this._buildSequenceFields(typeDef.components || []);
        } else if (typeDef.type === "reference") {
          field.type = "REFERENCE";
          field.reference = {
            module: typeDef.module,
            typeName: typeDef.type_name
          };
        } else {
          field.type = typeDef.type || "unknown";
          if (typeDef.type === "BIT STRING" && typeDef.named_bits) {
            field.namedBits = typeDef.named_bits;
          }
          if (typeDef.type === "INTEGER" && typeDef.named_numbers) {
            field.namedNumbers = typeDef.named_numbers;
            field.enum = this._createEnumHelper(typeDef.named_numbers);
          }
        }
        if (comp.type.constraints) {
          field.validators = this._extractValidators(comp.type.constraints);
        }
      }
      return field;
    });
  }
  _buildChoiceAlternatives(alternatives) {
    return alternatives.map((alt) => {
      const alternative = {
        name: alt.name
      };
      if (alt.type && alt.type.tags && alt.type.tags.length > 0) {
        alternative.tags = alt.type.tags;
      } else if (alt.tags && alt.tags.length > 0) {
        alternative.tags = alt.tags;
      }
      if (alt.type && alt.type.type_def) {
        const typeDef = alt.type.type_def;
        if (typeDef.type === "CHOICE") {
          alternative.type = "CHOICE";
          alternative.alternatives = this._buildChoiceAlternatives(typeDef.alternatives || []);
        } else if (typeDef.type === "SEQUENCE") {
          alternative.type = "SEQUENCE";
          alternative.fields = this._buildSequenceFields(typeDef.components || []);
        } else if (typeDef.type === "reference") {
          alternative.type = "REFERENCE";
          alternative.reference = {
            module: typeDef.module,
            typeName: typeDef.type_name
          };
        } else {
          alternative.type = typeDef.type || "unknown";
          if (typeDef.type === "BIT STRING" && typeDef.named_bits) {
            alternative.namedBits = typeDef.named_bits;
          }
          if (typeDef.type === "INTEGER" && typeDef.named_numbers) {
            alternative.namedNumbers = typeDef.named_numbers;
            alternative.enum = this._createEnumHelper(typeDef.named_numbers);
          }
        }
        if (alt.type.constraints) {
          alternative.validators = this._extractValidators(alt.type.constraints);
        }
      }
      return alternative;
    });
  }
  _extractValidators(constraints) {
    if (!constraints || constraints.length === 0) {
      return [];
    }
    const validators = [];
    for (const constraint of constraints) {
      if (constraint.type === "size") {
        validators.push({
          type: "size",
          min: constraint.min,
          max: constraint.max,
          validate: function(value) {
            const len = value.length || 0;
            return len >= this.min && len <= this.max;
          },
          message: `Size must be between ${constraint.min} and ${constraint.max}`
        });
      } else if (constraint.type === "range") {
        validators.push({
          type: "range",
          min: constraint.min,
          max: constraint.max,
          validate: function(value) {
            return value >= this.min && value <= this.max;
          },
          message: `Value must be between ${constraint.min} and ${constraint.max}`
        });
      } else if (constraint.raw) {
        validators.push({
          type: "raw",
          constraint: constraint.raw
        });
      }
    }
    return validators;
  }
  prettyPrint(structure, indent = 0) {
    const spaces = " ".repeat(indent);
    let output = "";
    output += `${spaces}Name: ${structure.name}
`;
    output += `${spaces}Type: ${structure.type || structure.kind}
`;
    if (structure.tags && structure.tags.length > 0) {
      output += `${spaces}Tags:
`;
      for (const tag of structure.tags) {
        output += `${spaces}  [${tag.class} ${tag.number}] ${tag.type}
`;
      }
    }
    if (structure.validators && structure.validators.length > 0) {
      output += `${spaces}Validators:
`;
      for (const validator of structure.validators) {
        if (validator.type === "size") {
          output += `${spaces}  - Size: ${validator.min}..${validator.max}
`;
        } else if (validator.type === "range") {
          output += `${spaces}  - Range: ${validator.min}..${validator.max}
`;
        }
      }
    }
    if (structure.fields) {
      output += `${spaces}Fields:
`;
      for (const field of structure.fields) {
        output += `${spaces}  ${field.name} (${field.type})`;
        if (field.optional) {
          output += " [OPTIONAL]";
        }
        if (field.hasDefault) {
          output += " [DEFAULT]";
        }
        output += "\n";
        if (field.namedNumbers && field.namedNumbers.length > 0) {
          output += `${spaces}    Named values:
`;
          for (const named of field.namedNumbers) {
            output += `${spaces}      ${named.value}: ${named.name}
`;
          }
        }
        if (field.validators && field.validators.length > 0) {
          for (const validator of field.validators) {
            if (validator.type === "size") {
              output += `${spaces}    - Size: ${validator.min}..${validator.max}
`;
            } else if (validator.type === "range") {
              output += `${spaces}    - Range: ${validator.min}..${validator.max}
`;
            }
          }
        }
        if (field.type === "CHOICE" && field.alternatives) {
          output += `${spaces}    Alternatives:
`;
          for (const alt of field.alternatives) {
            output += `${spaces}      - ${alt.name} (${alt.type})
`;
          }
        }
      }
    }
    if (structure.alternatives) {
      output += `${spaces}Alternatives:
`;
      for (const alt of structure.alternatives) {
        output += `${spaces}  ${alt.name} (${alt.type})
`;
        if (alt.namedNumbers && alt.namedNumbers.length > 0) {
          output += `${spaces}    Named values:
`;
          for (const named of alt.namedNumbers) {
            output += `${spaces}      ${named.value}: ${named.name}
`;
          }
        }
        if (alt.validators && alt.validators.length > 0) {
          for (const validator of alt.validators) {
            if (validator.type === "size") {
              output += `${spaces}    - Size: ${validator.min}..${validator.max}
`;
            } else if (validator.type === "range") {
              output += `${spaces}    - Range: ${validator.min}..${validator.max}
`;
            }
          }
        }
      }
    }
    if (structure.value !== void 0) {
      output += `${spaces}Value: ${structure.value}
`;
    }
    return output;
  }
  asTagTree() {
    return mapType(this.definitions.filter((f) => f.definition?.tags === "")[0], db);
  }
};
export {
  ASN1Database
};
