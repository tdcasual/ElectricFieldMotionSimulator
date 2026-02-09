export class ObjectRegistry {
  constructor() {
    this.map = new Map();
  }

  register(type, meta) {
    if (!type || !meta || !meta.class) {
      throw new Error('Invalid registry entry');
    }
    this.map.set(type, { type, ...meta });
  }

  get(type) {
    return this.map.get(type) || null;
  }

  create(type, overrides = {}) {
    const entry = this.get(type);
    if (!entry) {
      throw new Error(`Unknown type: ${type}`);
    }
    const defaults = typeof entry.defaults === 'function' ? entry.defaults() : {};
    const data = { ...defaults, ...overrides, type };
    const instance = new entry.class(data);
    if (typeof instance.deserialize === 'function') {
      instance.deserialize(data);
    } else {
      Object.assign(instance, data);
    }
    return instance;
  }

  listByCategory() {
    const out = {};
    for (const entry of this.map.values()) {
      const key = entry.category || 'misc';
      out[key] = out[key] || [];
      out[key].push(entry);
    }
    return out;
  }
}
