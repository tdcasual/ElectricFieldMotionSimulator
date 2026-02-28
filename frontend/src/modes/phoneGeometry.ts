export type GeometryRole = 'real' | 'display';

export type GeometryFieldLike = {
  key?: string;
  label?: string;
  sourceKey?: string;
  geometryRole?: GeometryRole;
};

export type GeometrySectionLike = {
  fields?: GeometryFieldLike[];
};

export type PhoneGeometryRow = {
  sourceKey: string;
  label: string;
  realKey: string;
  displayKey: string;
  realValue: unknown;
  displayValue: unknown;
};

const DISPLAY_LABEL_SUFFIX_RE = /[（(](真实|显示)[）)]$/;

export function buildPhoneGeometryRows(
  sections: GeometrySectionLike[],
  values: Record<string, unknown>,
  recentSourceKeys: string[] = []
): PhoneGeometryRow[] {
  const orderedSourceKeys: string[] = [];
  const rowBySource = new Map<string, Partial<PhoneGeometryRow>>();

  for (const section of sections) {
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    for (const field of fields) {
      const key = typeof field?.key === 'string' ? field.key : '';
      const sourceKey = typeof field?.sourceKey === 'string' ? field.sourceKey : '';
      const geometryRole = field?.geometryRole;
      if (!key || !sourceKey || (geometryRole !== 'real' && geometryRole !== 'display')) continue;

      let row = rowBySource.get(sourceKey);
      if (!row) {
        row = { sourceKey };
        rowBySource.set(sourceKey, row);
        orderedSourceKeys.push(sourceKey);
      }

      const label = String(field.label || sourceKey).replace(DISPLAY_LABEL_SUFFIX_RE, '').trim();
      if (!row.label && label) {
        row.label = label;
      }

      if (geometryRole === 'real') {
        row.realKey = key;
        row.realValue = values[key];
      } else {
        row.displayKey = key;
        row.displayValue = values[key];
      }
    }
  }

  const rows: PhoneGeometryRow[] = [];
  for (const sourceKey of orderedSourceKeys) {
    const row = rowBySource.get(sourceKey);
    if (!row?.sourceKey || !row.realKey || !row.displayKey) continue;
    rows.push({
      sourceKey: row.sourceKey,
      label: row.label || row.sourceKey,
      realKey: row.realKey,
      displayKey: row.displayKey,
      realValue: row.realValue,
      displayValue: row.displayValue
    });
  }

  if (!Array.isArray(recentSourceKeys) || recentSourceKeys.length === 0) {
    return rows;
  }

  const rank = new Map<string, number>();
  for (const sourceKey of recentSourceKeys) {
    const key = String(sourceKey || '').trim();
    if (!key || rank.has(key)) continue;
    rank.set(key, rank.size);
  }

  const fallbackOrder = new Map<string, number>();
  rows.forEach((row, index) => {
    fallbackOrder.set(row.sourceKey, index);
  });

  return [...rows].sort((a, b) => {
    const rankA = rank.has(a.sourceKey) ? rank.get(a.sourceKey)! : Number.POSITIVE_INFINITY;
    const rankB = rank.has(b.sourceKey) ? rank.get(b.sourceKey)! : Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    return (fallbackOrder.get(a.sourceKey) ?? 0) - (fallbackOrder.get(b.sourceKey) ?? 0);
  });
}
