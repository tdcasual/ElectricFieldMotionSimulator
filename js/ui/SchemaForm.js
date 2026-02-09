export function isFieldVisible(field, values) {
  if (typeof field.visibleWhen !== 'function') return true;
  try {
    return !!field.visibleWhen(values);
  } catch {
    return true;
  }
}

export function validateSchema(schema, values) {
  const errors = [];
  if (!Array.isArray(schema)) return errors;

  for (const group of schema) {
    const fields = Array.isArray(group?.fields) ? group.fields : [];
    for (const field of fields) {
      if (!field || !field.key) continue;
      if (!isFieldVisible(field, values)) continue;

      if (typeof field.validator === 'function') {
        const message = field.validator(values[field.key], values);
        if (message) {
          errors.push({ key: field.key, error: message });
          continue;
        }
      }

      if (field.type === 'number') {
        const value = Number(values[field.key]);
        if (!Number.isFinite(value)) {
          errors.push({ key: field.key, error: '数值无效' });
          continue;
        }
        if (field.min != null && value < field.min) {
          errors.push({ key: field.key, error: `最小值 ${field.min}` });
        }
        if (field.max != null && value > field.max) {
          errors.push({ key: field.key, error: `最大值 ${field.max}` });
        }
      }
    }
  }

  return errors;
}
