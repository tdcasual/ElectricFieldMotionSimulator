import { registry } from '../core/registerObjects.js';

const CATEGORY_LABELS = {
  electric: '电场',
  magnetic: '磁场',
  particle: '粒子',
  display: '显示'
};

const CATEGORY_ORDER = ['electric', 'magnetic', 'particle', 'display'];

export class Toolbar {
  constructor() {
    this.container = document.getElementById('toolbar-content');
    if (!this.container) return;
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const groups = registry.listByCategory();
    const categories = new Set(Object.keys(groups));

    const ordered = [];
    for (const key of CATEGORY_ORDER) {
      if (categories.has(key)) {
        ordered.push(key);
        categories.delete(key);
      }
    }
    ordered.push(...categories);

    for (const category of ordered) {
      const entries = groups[category] || [];
      if (!entries.length) continue;

      const section = document.createElement('div');
      section.className = 'tool-section';

      const heading = document.createElement('h3');
      heading.textContent = CATEGORY_LABELS[category] || category;
      section.appendChild(heading);

      for (const entry of entries) {
        const item = document.createElement('div');
        item.className = 'tool-item';
        item.draggable = true;
        item.dataset.type = entry.type;
        item.title = entry.label || entry.type;

        if (entry.icon) {
          const iconWrap = document.createElement('div');
          iconWrap.className = 'tool-icon';
          iconWrap.innerHTML = entry.icon;
          item.appendChild(iconWrap);
        }

        const label = document.createElement('span');
        label.textContent = entry.label || entry.type;
        item.appendChild(label);

        section.appendChild(item);
      }

      this.container.appendChild(section);
    }
  }
}
