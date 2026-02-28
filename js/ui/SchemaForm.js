import { compileSafeExpression } from '../utils/SafeExpression.js';

const DEMO_UNIT_FIELD_KEYS = new Set([
  'x',
  'y',
  'width',
  'height',
  'radius',
  'length',
  'plateDistance',
  'depth',
  'viewGap',
  'spotSize',
  'lineWidth',
  'particleRadius'
]);

export function isFieldVisible(field, values) {
  if (typeof field.visibleWhen !== 'function') return true;
  try {
    return !!field.visibleWhen(values);
  } catch {
    return true;
  }
}

export function isFieldEnabled(field, values) {
  if (typeof field.enabledWhen !== 'function') return true;
  try {
    return !!field.enabledWhen(values);
  } catch {
    return true;
  }
}

export function getAllowedVariableNames(scene) {
  const vars = scene?.variables;
  if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return [];
  return Object.keys(vars);
}

export function buildExpressionContext(scene) {
  const ctx = Object.create(null);
  ctx.t = Number.isFinite(scene?.time) ? scene.time : 0;
  const vars = scene?.variables;
  if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
    for (const [key, value] of Object.entries(vars)) {
      ctx[key] = value;
    }
  }
  return ctx;
}

export function parseExpressionInput(text, scene) {
  const raw = String(text ?? '').trim();
  if (!raw) {
    return { ok: true, empty: true, value: null, expr: null };
  }
  const NUMBER_FULL_RE = /^[+-]?(?:\d+\.\d*|\d+|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (NUMBER_FULL_RE.test(raw)) {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return { ok: false, error: '数值无效' };
    }
    return { ok: true, empty: false, value, expr: null };
  }

  try {
    const allowed = getAllowedVariableNames(scene);
    const fn = compileSafeExpression(raw, allowed);
    const value = fn(buildExpressionContext(scene));
    if (!Number.isFinite(value)) return { ok: false, error: '结果不是有限数' };
    return { ok: true, empty: false, value, expr: raw };
  } catch (error) {
    return { ok: false, error: error?.message || '表达式解析失败' };
  }
}

function shouldRelaxNumericBounds(field, options = {}) {
  const demoMode = options?.scene?.settings?.mode === 'demo' || options?.demoMode === true;
  if (!demoMode) return false;
  if (typeof options?.isScaledNumberField !== 'function') return false;
  try {
    return !!options.isScaledNumberField(field);
  } catch {
    return false;
  }
}

export function validateSchema(schema, values, options = {}) {
  const errors = [];
  if (!Array.isArray(schema)) return errors;

  for (const group of schema) {
    const fields = Array.isArray(group?.fields) ? group.fields : [];
    for (const field of fields) {
      if (!field || !field.key) continue;
      if (!isFieldVisible(field, values)) continue;
      if (!isFieldEnabled(field, values)) continue;

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
        const relaxBounds = shouldRelaxNumericBounds(field, options);
        if (!relaxBounds && field.min != null && value < field.min) {
          errors.push({ key: field.key, error: `最小值 ${field.min}` });
        }
        if (!relaxBounds && field.max != null && value > field.max) {
          errors.push({ key: field.key, error: `最大值 ${field.max}` });
        }
      }
    }
  }

  return errors;
}

function formatPreviewNumber(value) {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return value.toExponential(3);
  return String(Math.round(value * 1000) / 1000);
}

function createInputForField(field) {
  if (field.type === 'select') {
    const select = document.createElement('select');
    const options = Array.isArray(field.options) ? field.options : [];
    for (const option of options) {
      const opt = document.createElement('option');
      opt.value = String(option.value);
      opt.textContent = option.label ?? String(option.value);
      select.appendChild(opt);
    }
    return select;
  }

  if (field.type === 'checkbox') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    return input;
  }

  if (field.type === 'text' && field.multiline) {
    const textarea = document.createElement('textarea');
    textarea.rows = field.rows || 2;
    return textarea;
  }

  const input = document.createElement('input');
  if (field.type === 'number') {
    input.type = 'number';
    if (field.min != null) input.min = String(field.min);
    if (field.max != null) input.max = String(field.max);
    if (field.step != null) input.step = String(field.step);
  } else {
    input.type = 'text';
  }
  return input;
}

export class SchemaForm {
  constructor({ container, schema, object, scene }) {
    this.container = container;
    this.schema = Array.isArray(schema) ? schema : [];
    this.object = object;
    this.scene = scene;
    this.fields = [];
  }

  render() {
    this.container.innerHTML = '';
    this.fields = [];

    for (const group of this.schema) {
      if (group.title) {
        const title = document.createElement('h4');
        title.textContent = group.title;
        this.container.appendChild(title);
      }

      const fields = Array.isArray(group.fields) ? group.fields : [];
      for (const field of fields) {
        const row = document.createElement('div');
        row.className = 'form-row';

        const input = createInputForField(field);
        this.adjustNumericInputForContext(field, input);
        const label = document.createElement('label');

        if (field.type === 'checkbox') {
          label.appendChild(input);
          label.appendChild(document.createTextNode(` ${this.getDisplayLabel(field)}`));
          row.appendChild(label);
        } else {
          label.textContent = this.getDisplayLabel(field);
          row.appendChild(label);
          row.appendChild(input);
        }

        let preview = null;
        if (field.type === 'expression') {
          preview = document.createElement('div');
          preview.className = 'expression-hint';
          row.appendChild(preview);
        }

        const error = document.createElement('div');
        error.className = 'field-error';
        row.appendChild(error);

        this.container.appendChild(row);

        this.fields.push({ field, row, input, preview, error });
      }
    }

    this.fillValuesFromObject();
    this.attachListeners();
    this.updateVisibility();
  }

  getPixelsPerMeter() {
    const value = this.scene?.settings?.pixelsPerMeter;
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  isDemoMode() {
    return this.scene?.settings?.mode === 'demo';
  }

  shouldScaleNumberField(field) {
    if (!this.isDemoMode()) return false;
    if (!field || field.type !== 'number' || !field.key) return false;
    if (field.bind && (typeof field.bind.get === 'function' || typeof field.bind.set === 'function')) {
      return false;
    }
    return DEMO_UNIT_FIELD_KEYS.has(field.key);
  }

  toDisplayNumber(field, value) {
    if (!this.shouldScaleNumberField(field)) return value;
    if (!Number.isFinite(value)) return value;
    return value / this.getPixelsPerMeter();
  }

  toObjectNumber(field, value) {
    if (!this.shouldScaleNumberField(field)) return value;
    if (!Number.isFinite(value)) return value;
    return value * this.getPixelsPerMeter();
  }

  adjustNumericInputForContext(field, input) {
    if (!field || field.type !== 'number' || !input) return;
    if (!this.shouldScaleNumberField(field)) return;
    input.removeAttribute('min');
    input.removeAttribute('max');
    input.step = 'any';
  }

  getDisplayLabel(field) {
    const base = String(field?.label ?? field?.key ?? '');
    if (!this.shouldScaleNumberField(field)) return base;
    if (/\(px\)/i.test(base)) {
      return base.replace(/\(px\)/ig, '(unit)');
    }
    if (/（px）/i.test(base)) {
      return base.replace(/（px）/ig, '（unit）');
    }
    return `${base} (unit)`;
  }

  fillValuesFromObject() {
    const context = this.buildContext();
    for (const state of this.fields) {
      const { field, input } = state;
      let value = undefined;

      if (field.bind && typeof field.bind.get === 'function') {
        value = field.bind.get(this.object, context);
      } else {
        value = this.object?.[field.key];
      }

      if (field.type === 'number') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          value = this.toDisplayNumber(field, numeric);
        }
      }

      if (field.type === 'checkbox') {
        input.checked = !!value;
      } else if (field.type === 'select') {
        input.value = value != null ? String(value) : '';
      } else if (field.type === 'expression') {
        input.value = value != null ? String(value) : '';
      } else {
        input.value = value != null ? String(value) : '';
      }

      if (field.type === 'expression' && state.preview) {
        this.updateExpressionPreview(state);
      }
    }
  }

  attachListeners() {
    for (const state of this.fields) {
      const { field, input } = state;
      const handler = () => {
        if (field.type === 'expression') {
          this.updateExpressionPreview(state);
        }
        this.updateVisibility();
      };

      if (field.type === 'checkbox' || field.type === 'select') {
        input.addEventListener('change', handler);
      } else {
        input.addEventListener('input', handler);
      }
    }
  }

  updateExpressionPreview(state) {
    const { input, preview } = state;
    if (!preview) return;
    const parsed = parseExpressionInput(input.value, this.scene);

    if (!parsed.ok) {
      preview.textContent = `错误：${parsed.error}`;
      preview.classList.add('error');
      preview.classList.remove('ok');
      return;
    }

    if (parsed.empty) {
      preview.textContent = '可填“数值”或“表达式”，变量在顶部“ƒx 变量表”中设置';
      preview.classList.remove('error');
      preview.classList.remove('ok');
      return;
    }

    const unit = state.field.unit || 'm/s';
    preview.textContent = `预览：${formatPreviewNumber(parsed.value)} ${unit}`;
    preview.classList.remove('error');
    preview.classList.add('ok');
  }

  buildContext() {
    return {
      scene: this.scene,
      pixelsPerMeter: this.getPixelsPerMeter()
    };
  }

  readValues() {
    const values = { ...(this.object || {}) };
    for (const state of this.fields) {
      const { field, input } = state;
      if (field.type === 'checkbox') {
        values[field.key] = input.checked;
      } else if (field.type === 'number') {
        const num = Number(input.value);
        values[field.key] = Number.isFinite(num) ? num : input.value;
      } else {
        values[field.key] = input.value;
      }
    }
    return values;
  }

  updateVisibility() {
    const values = this.readValues();
    for (const state of this.fields) {
      const { field, row, input } = state;
      const visible = isFieldVisible(field, values);
      row.style.display = visible ? '' : 'none';
      const enabled = isFieldEnabled(field, values);
      input.disabled = !enabled;
    }
  }

  clearErrors() {
    for (const state of this.fields) {
      state.error.textContent = '';
    }
  }

  apply() {
    const context = this.buildContext();
    const values = this.readValues();
    const errors = validateSchema(this.schema, values, {
      scene: this.scene,
      isScaledNumberField: (field) => this.shouldScaleNumberField(field)
    });
    const expressionResults = new Map();

    for (const state of this.fields) {
      const { field, input } = state;
      if (field.type !== 'expression') continue;
      if (!isFieldVisible(field, values) || !isFieldEnabled(field, values)) continue;
      const parsed = parseExpressionInput(input.value, this.scene);
      if (!parsed.ok) {
        errors.push({ key: field.key, error: parsed.error });
      }
      expressionResults.set(field.key, parsed);
    }

    this.clearErrors();

    if (errors.length) {
      const byKey = new Map();
      for (const error of errors) {
        if (!byKey.has(error.key)) {
          byKey.set(error.key, error.error);
        }
      }
      for (const state of this.fields) {
        if (byKey.has(state.field.key)) {
          state.error.textContent = byKey.get(state.field.key);
        }
      }
      return { ok: false, errors };
    }

    for (const state of this.fields) {
      const { field, input } = state;
      const visible = isFieldVisible(field, values);
      const enabled = isFieldEnabled(field, values);
      if (!visible || !enabled) continue;
      let value = input.value;

      if (field.type === 'checkbox') {
        value = input.checked;
      } else if (field.type === 'number') {
        value = this.toObjectNumber(field, Number(input.value));
      } else if (field.type === 'select') {
        value = input.value;
        const options = Array.isArray(field.options) ? field.options : [];
        const numericOption = options.find(option => typeof option.value === 'number');
        if (numericOption) {
          const num = Number(value);
          if (Number.isFinite(num)) value = num;
        }
      } else if (field.type === 'expression') {
        value = expressionResults.get(field.key);
      }

      if (field.bind && typeof field.bind.set === 'function') {
        field.bind.set(this.object, value, context);
      } else if (field.key) {
        this.object[field.key] = value;
      }
    }

    return { ok: true };
  }
}
