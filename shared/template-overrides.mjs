const fields = ['style','primary','secondary'];
export function normalizeTemplateOverrides(value) {
  return fields.filter(field => Array.isArray(value) && value.includes(field));
}
