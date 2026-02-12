export type SchemaField = {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select' | 'checkbox';
};

export type SchemaSection = {
  title: string;
  fields: SchemaField[];
};

export function normalizeSchemaSections(input: unknown): SchemaSection[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item): item is { title?: unknown; fields?: unknown[] } => !!item && typeof item === 'object')
    .map((section) => ({
      title: typeof section.title === 'string' && section.title.trim() ? section.title : 'General',
      fields: Array.isArray(section.fields)
        ? section.fields
            .filter((field): field is Record<string, unknown> => !!field && typeof field === 'object')
            .map((field) => ({
              key: typeof field.key === 'string' ? field.key : 'unknown',
              label: typeof field.label === 'string' ? field.label : 'Field',
              type:
                field.type === 'number' || field.type === 'text' || field.type === 'select' || field.type === 'checkbox'
                  ? field.type
                  : 'text'
            }))
        : []
    }));
}
