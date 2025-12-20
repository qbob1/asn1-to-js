// mapType.ts
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
export {
  mapType
};
