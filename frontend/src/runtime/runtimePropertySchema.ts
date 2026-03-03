import { isGeometryDimensionKey } from '../engine/runtimeEngineBridge';

export type AnyRecord = Record<string, unknown>;

export type SchemaField = {
  key: string;
  label?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  multiline?: boolean;
  rows?: number;
  options?: Array<{ value: unknown; label?: string }>;
  visibleWhen?: (values: AnyRecord) => boolean;
  enabledWhen?: (values: AnyRecord) => boolean;
  validator?: (value: unknown, values: AnyRecord) => string | null;
  bind?: {
    get?: (object: AnyRecord, context: AnyRecord) => unknown;
    set?: (object: AnyRecord, value: unknown, context: AnyRecord) => void;
  };
  sourceKey?: string;
  geometryRole?: 'real' | 'display';
};

export type SchemaSection = {
  title?: string;
  group?: 'basic' | 'advanced';
  defaultCollapsed?: boolean;
  fields?: SchemaField[];
};

const DISPLAY_FIELD_SUFFIX = '__display';

export function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object';
}

export function asFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeFieldType(field: SchemaField): string {
  const type = typeof field.type === 'string' ? field.type : 'text';
  if (type === 'number' || type === 'text' || type === 'select' || type === 'checkbox' || type === 'expression') {
    return type;
  }
  return 'text';
}

function getGeometrySourceKey(field: SchemaField): string | null {
  if (!field || field.type !== 'number') return null;
  if (!field.key) return null;
  if (field.bind && (typeof field.bind.get === 'function' || typeof field.bind.set === 'function')) {
    return null;
  }

  const explicit = typeof field.sourceKey === 'string' ? field.sourceKey.trim() : '';
  if (explicit && isGeometryDimensionKey(explicit)) {
    return explicit;
  }

  if (isGeometryDimensionKey(field.key)) {
    return field.key;
  }

  return null;
}

function displayFieldKeyFor(realFieldKey: string): string {
  return `${realFieldKey}${DISPLAY_FIELD_SUFFIX}`;
}

export function buildPropertySectionsForUI(sections: SchemaSection[]): SchemaSection[] {
  return sections.map((section) => {
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    const mappedFields: SchemaField[] = [];
    for (const field of fields) {
      if (!field || !field.key) continue;
      const geometrySourceKey = getGeometrySourceKey(field);
      if (!geometrySourceKey) {
        mappedFields.push(field);
        continue;
      }

      const baseLabel = String(field.label || field.key);
      mappedFields.push({
        ...field,
        label: `${baseLabel}（真实）`,
        sourceKey: geometrySourceKey,
        geometryRole: 'real'
      });
      mappedFields.push({
        ...field,
        key: displayFieldKeyFor(field.key),
        label: `${baseLabel}（显示）`,
        min: undefined,
        max: undefined,
        bind: undefined,
        validator: undefined,
        sourceKey: geometrySourceKey,
        geometryRole: 'display'
      });
    }
    return {
      ...section,
      fields: mappedFields
    };
  });
}

export function computeChangedFieldKeys(
  sections: SchemaSection[],
  currentValues: AnyRecord,
  mergedValues: AnyRecord
): Set<string> {
  const changed = new Set<string>();
  for (const section of sections) {
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    for (const field of fields) {
      if (!field?.key) continue;
      if (!Object.prototype.hasOwnProperty.call(mergedValues, field.key)) continue;
      const next = mergedValues[field.key];
      const prev = currentValues[field.key];
      const type = normalizeFieldType(field);
      if (type === 'number') {
        const prevNum = Number(prev);
        const nextNum = Number(next);
        if (!Number.isFinite(prevNum) || !Number.isFinite(nextNum) || Math.abs(prevNum - nextNum) > 1e-9) {
          changed.add(field.key);
        }
        continue;
      }
      if (type === 'checkbox') {
        if (!!prev !== !!next) changed.add(field.key);
        continue;
      }
      if (String(prev ?? '') !== String(next ?? '')) {
        changed.add(field.key);
      }
    }
  }
  return changed;
}

export function coerceFieldValue(field: SchemaField, raw: unknown): unknown {
  const type = normalizeFieldType(field);
  if (type === 'checkbox') return !!raw;
  if (type === 'number') {
    return Number(raw);
  }
  if (raw == null) return '';
  return String(raw);
}
