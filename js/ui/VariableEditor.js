/**
 * 变量表编辑器：在表达式中引用（如 v0/sqrt(2)）
 */

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);

function isValidName(name) {
    if (!NAME_RE.test(name)) return false;
    if (RESERVED.has(name)) return false;
    return true;
}

export class VariableEditor {
    constructor(scene, modal) {
        this.scene = scene;
        this.modal = modal;
    }

    show() {
        if (!this.modal) return;

        const vars = (this.scene?.variables && typeof this.scene.variables === 'object' && !Array.isArray(this.scene.variables))
            ? this.scene.variables
            : {};
        const entries = Object.entries(vars)
            .filter(([name]) => typeof name === 'string' && name.length)
            .sort(([a], [b]) => a.localeCompare(b));

        const rowsHtml = entries.length
            ? entries.map(([name, value]) => this.rowHtml(name, value)).join('')
            : this.rowHtml('v0', 200);

        const content = `
            <div class="form-row">
                <label>变量（可在表达式中引用，如：<code>v0/sqrt(2)</code>）</label>
                <div id="var-editor-list">
                    ${rowsHtml}
                </div>
                <div class="form-row">
                    <button class="btn" id="var-editor-add" type="button">+ 添加变量</button>
                    <span class="unit">变量名规则：字母/下划线开头，仅字母数字下划线</span>
                </div>
            </div>
        `;

        this.modal.show('变量表', content, () => this.onConfirm());
        this.bindEvents();
    }

    rowHtml(name = '', value = 0) {
        const safeName = String(name ?? '');
        const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
        return `
            <div class="form-group var-editor-row" style="margin-bottom: 8px;">
                <input type="text" class="var-editor-name" placeholder="变量名" value="${safeName}">
                <input type="number" class="var-editor-value" placeholder="数值" value="${safeValue}" step="any">
                <button type="button" class="btn-icon var-editor-delete" aria-label="删除变量">✖</button>
            </div>
        `;
    }

    bindEvents() {
        const addBtn = document.getElementById('var-editor-add');
        const list = document.getElementById('var-editor-list');
        if (!list) return;

        addBtn?.addEventListener('click', () => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.rowHtml('', 0);
            const row = wrapper.firstElementChild;
            if (row) {
                list.appendChild(row);
                const input = row.querySelector('.var-editor-name');
                input?.focus?.();
            }
        });

        list.addEventListener('click', (e) => {
            const btn = e.target?.closest?.('.var-editor-delete');
            if (!btn) return;
            const row = btn.closest('.var-editor-row');
            row?.remove?.();
        });
    }

    onConfirm() {
        const list = document.getElementById('var-editor-list');
        if (!list || !this.scene) return true;

        const rows = Array.from(list.querySelectorAll('.var-editor-row'));
        const next = Object.create(null);
        const errors = [];

        for (const row of rows) {
            const nameRaw = row.querySelector('.var-editor-name')?.value ?? '';
            const name = String(nameRaw).trim();
            const valueRaw = row.querySelector('.var-editor-value')?.value ?? '';
            const value = typeof valueRaw === 'string' && valueRaw.trim() === '' ? NaN : Number(valueRaw);

            if (!name) continue;
            if (!isValidName(name)) {
                errors.push(`变量名无效: "${name}"`);
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(next, name)) {
                errors.push(`变量名重复: "${name}"`);
                continue;
            }
            if (!Number.isFinite(value)) {
                errors.push(`变量 "${name}" 的数值无效`);
                continue;
            }
            next[name] = value;
        }

        if (errors.length) {
            alert(errors.join('\n'));
            return false;
        }

        this.scene.variables = { ...next };
        document.dispatchEvent(new CustomEvent('scene-variables-changed', { detail: { variables: this.scene.variables } }));
        return true;
    }
}

