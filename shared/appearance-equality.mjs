// Compare settings by value, including nested optics, independent of JSON key order.
export function appearanceFingerprint(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(appearanceFingerprint).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+appearanceFingerprint(value[k])).join(',')+'}';
}
export function appearanceMatches(value,patch){return Object.entries(patch).every(([key,entry])=>appearanceFingerprint(value[key])===appearanceFingerprint(entry))}
