/**
 * Markdown 题目板：可拖拽、可编辑/预览、自动保存
 */

import { renderMarkdown } from '../utils/Markdown.js';

export class MarkdownBoard {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'new-electric-field:markdown-board:v1';
        this.parent = options.parent || document.getElementById('canvas-area');
        this.container = document.getElementById('markdown-board');
        this.header = document.getElementById('markdown-board-header');
        this.body = document.getElementById('markdown-board-body');
        this.textarea = document.getElementById('markdown-input');
        this.preview = document.getElementById('markdown-preview');
        this.fontInput = document.getElementById('markdown-font-size');
        this.toggleBtn = document.getElementById('markdown-toggle-btn');
        this.closeBtn = document.getElementById('markdown-close-btn');
        this.clearBtn = document.getElementById('markdown-clear-btn');
        this.editBtn = document.getElementById('markdown-edit-btn');
        this.previewBtn = document.getElementById('markdown-preview-btn');

        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.mode = 'edit';
        this.visible = false;
        this.fontSize = 13;
        this._saveTimer = null;
        this._mathTimer = null;
        this._katexPromise = null;
        this._katexReady = false;
        this._katexFailed = false;

        if (!this.container || !this.header || !this.textarea || !this.preview || !this.parent) {
            return;
        }

        this.restoreState();
        this.bind();
        this.applyFontSize();
        this.updateUI();
        this.updatePreview();
    }

    bind() {
        this.toggleBtn?.addEventListener('click', () => this.toggle());
        this.closeBtn?.addEventListener('click', () => this.hide());
        this.clearBtn?.addEventListener('click', () => this.clear());

        this.editBtn?.addEventListener('click', () => this.setMode('edit'));
        this.previewBtn?.addEventListener('click', () => this.setMode('preview'));

        this.textarea.addEventListener('input', () => {
            this.updatePreview();
            this.scheduleSave();
        });

        this.fontInput?.addEventListener('input', () => {
            const v = parseFloat(this.fontInput.value);
            if (Number.isFinite(v)) {
                this.setFontSize(v);
            }
        });

        this.header.addEventListener('pointerdown', (e) => this.onDragStart(e));
        window.addEventListener('pointermove', (e) => this.onDragMove(e));
        window.addEventListener('pointerup', (e) => this.onDragEnd(e));
        window.addEventListener('pointercancel', (e) => this.onDragEnd(e));

        if (window.ResizeObserver) {
            const observer = new ResizeObserver(() => {
                if (!this.visible) return;
                this.saveState({ includeContent: false });
            });
            observer.observe(this.container);
        }
    }

    getParentRect() {
        return this.parent.getBoundingClientRect();
    }

    clampPosition(left, top) {
        const maxLeft = Math.max(0, this.parent.clientWidth - this.container.offsetWidth);
        const maxTop = Math.max(0, this.parent.clientHeight - this.container.offsetHeight);
        return {
            left: Math.max(0, Math.min(maxLeft, left)),
            top: Math.max(0, Math.min(maxTop, top))
        };
    }

    getBoxMetrics() {
        const leftStyle = Number.parseFloat(this.container.style.left);
        const topStyle = Number.parseFloat(this.container.style.top);
        const widthStyle = Number.parseFloat(this.container.style.width);
        const heightStyle = Number.parseFloat(this.container.style.height);

        let left = Number.isFinite(leftStyle) ? leftStyle : this.container.offsetLeft;
        let top = Number.isFinite(topStyle) ? topStyle : this.container.offsetTop;
        let width = Number.isFinite(widthStyle) && widthStyle > 0 ? widthStyle : this.container.offsetWidth;
        let height = Number.isFinite(heightStyle) && heightStyle > 0 ? heightStyle : this.container.offsetHeight;

        if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
            const computed = window.getComputedStyle(this.container);
            if ((!Number.isFinite(left) || left === 0) && computed?.left) {
                const v = Number.parseFloat(computed.left);
                if (Number.isFinite(v)) left = v;
            }
            if ((!Number.isFinite(top) || top === 0) && computed?.top) {
                const v = Number.parseFloat(computed.top);
                if (Number.isFinite(v)) top = v;
            }
            if ((!Number.isFinite(width) || width <= 0) && computed?.width) {
                const v = Number.parseFloat(computed.width);
                if (Number.isFinite(v) && v > 0) width = v;
            }
            if ((!Number.isFinite(height) || height <= 0) && computed?.height) {
                const v = Number.parseFloat(computed.height);
                if (Number.isFinite(v) && v > 0) height = v;
            }
        }

        return { left, top, width, height };
    }

    clampFontSize(value) {
        const v = Number(value);
        if (!Number.isFinite(v)) return 13;
        return Math.max(10, Math.min(32, Math.round(v)));
    }

    setFontSize(value) {
        const next = this.clampFontSize(value);
        if (next === this.fontSize) return;
        this.fontSize = next;
        this.applyFontSize();
        this.saveState({ includeContent: false });
    }

    applyFontSize() {
        if (!this.container) return;
        const clamped = this.clampFontSize(this.fontSize);
        this.fontSize = clamped;
        this.container.style.setProperty('--markdown-font-size', `${clamped}px`);
        if (this.fontInput && document.activeElement !== this.fontInput) {
            this.fontInput.value = String(clamped);
        }
    }

    onDragStart(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target?.closest?.('button')) return;
        if (e.target?.closest?.('input')) return;
        if (!this.visible) this.show();

        const parentRect = this.getParentRect();
        const pointerX = e.clientX - parentRect.left;
        const pointerY = e.clientY - parentRect.top;

        const startLeft = this.container.offsetLeft;
        const startTop = this.container.offsetTop;

        this.dragOffset.x = pointerX - startLeft;
        this.dragOffset.y = pointerY - startTop;
        this.dragging = true;

        this.container.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    }

    onDragMove(e) {
        if (!this.dragging) return;

        const parentRect = this.getParentRect();
        const pointerX = e.clientX - parentRect.left;
        const pointerY = e.clientY - parentRect.top;

        const nextLeft = pointerX - this.dragOffset.x;
        const nextTop = pointerY - this.dragOffset.y;
        const { left, top } = this.clampPosition(nextLeft, nextTop);

        this.container.style.left = `${left}px`;
        this.container.style.top = `${top}px`;
    }

    onDragEnd(e) {
        if (!this.dragging) return;
        this.dragging = false;
        try {
            this.container.releasePointerCapture?.(e.pointerId);
        } catch (err) {
            // ignore
        }
        this.saveState({ includeContent: false });
    }

    setMode(mode) {
        this.mode = mode === 'preview' ? 'preview' : 'edit';
        this.updateUI();
        if (this.mode === 'preview') {
            this.updatePreview();
        }
        this.saveState({ includeContent: false });
        if (this.mode === 'edit') {
            this.textarea?.focus?.();
        }
    }

    updateUI() {
        if (!this.container) return;
        this.container.classList.toggle('mode-edit', this.mode === 'edit');
        this.container.classList.toggle('mode-preview', this.mode === 'preview');
        this.editBtn?.classList.toggle('active', this.mode === 'edit');
        this.previewBtn?.classList.toggle('active', this.mode === 'preview');
        this.container.style.display = this.visible ? 'flex' : 'none';

        if (this.visible) {
            const left = Number.parseFloat(this.container.style.left) || this.container.offsetLeft || 0;
            const top = Number.parseFloat(this.container.style.top) || this.container.offsetTop || 0;
            const clamped = this.clampPosition(left, top);
            this.container.style.left = `${clamped.left}px`;
            this.container.style.top = `${clamped.top}px`;
        }
    }

    updatePreview() {
        if (!this.preview) return;
        const text = this.textarea?.value ?? '';
        this.preview.innerHTML = renderMarkdown(text);
        if (this.visible && this.mode === 'preview') {
            this.scheduleMathRender();
        }
    }

    clear() {
        if (!this.textarea) return;
        this.textarea.value = '';
        this.updatePreview();
        this.saveState({ includeContent: true });
        this.textarea.focus();
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.visible = true;
        this.updateUI();
        this.applyFontSize();
        if (this.mode === 'preview') {
            this.scheduleMathRender();
        }
        this.saveState({ includeContent: false });
    }

    hide() {
        this.visible = false;
        this.updateUI();
        this.saveState({ includeContent: false });
    }

    scheduleSave() {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
        this._saveTimer = setTimeout(() => {
            this._saveTimer = null;
            this.saveState({ includeContent: true });
        }, 250);
    }

    scheduleMathRender() {
        if (this._mathTimer) {
            clearTimeout(this._mathTimer);
        }
        this._mathTimer = setTimeout(() => {
            this._mathTimer = null;
            this.renderMath();
        }, 60);
    }

    loadCssOnce(href) {
        if (!href) return Promise.resolve();
        const existing = document.querySelector(`link[rel="stylesheet"][href="${href}"]`);
        if (existing) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load css: ${href}`));
            document.head.appendChild(link);
        });
    }

    loadScriptOnce(src) {
        if (!src) return Promise.resolve();
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    ensureKatex() {
        if (this._katexReady) return Promise.resolve(true);
        if (this._katexFailed) return Promise.resolve(false);
        if (typeof window !== 'undefined' && typeof window.renderMathInElement === 'function') {
            this._katexReady = true;
            return Promise.resolve(true);
        }
        if (this._katexPromise) return this._katexPromise;

        const katexVersion = '0.16.9';
        const base = `https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist`;
        const css = `${base}/katex.min.css`;
        const katexJs = `${base}/katex.min.js`;
        const autoRenderJs = `${base}/contrib/auto-render.min.js`;

        this._katexPromise = (async () => {
            try {
                await this.loadCssOnce(css);
                await this.loadScriptOnce(katexJs);
                await this.loadScriptOnce(autoRenderJs);
                if (typeof window.renderMathInElement === 'function') {
                    this._katexReady = true;
                    return true;
                }
            } catch (e) {
                // ignore
            }
            this._katexFailed = true;
            return false;
        })();

        return this._katexPromise;
    }

    async renderMath() {
        if (!this.preview) return;
        if (!this.visible || this.mode !== 'preview') return;

        const ok = await this.ensureKatex();
        if (!ok) return;

        try {
            window.renderMathInElement(this.preview, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false,
                strict: 'ignore',
                trust: false,
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            });
        } catch (e) {
            // ignore
        }
    }

    saveState(options = {}) {
        const includeContent = options.includeContent !== false;
        const { left, top, width, height } = this.getBoxMetrics();
        const state = {
            visible: this.visible,
            mode: this.mode,
            left: Number.isFinite(left) ? left : 0,
            top: Number.isFinite(top) ? top : 0,
            width: Number.isFinite(width) ? width : 0,
            height: Number.isFinite(height) ? height : 0,
            fontSize: this.fontSize
        };
        if (includeContent) {
            state.content = this.textarea?.value ?? '';
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (e) {
            // ignore
        }
    }

    restoreState() {
        let state = null;
        try {
            state = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
        } catch (e) {
            state = null;
        }

        if (state && typeof state === 'object') {
            this.visible = !!state.visible;
            this.mode = state.mode === 'preview' ? 'preview' : 'edit';

            if (Number.isFinite(state.width) && state.width > 100) {
                this.container.style.width = `${state.width}px`;
            }
            if (Number.isFinite(state.height) && state.height > 100) {
                this.container.style.height = `${state.height}px`;
            }

            const rawLeft = Number.isFinite(state.left) ? state.left : this.container.offsetLeft;
            const rawTop = Number.isFinite(state.top) ? state.top : this.container.offsetTop;
            const { left, top } = this.clampPosition(rawLeft, rawTop);
            this.container.style.left = `${left}px`;
            this.container.style.top = `${top}px`;

            if (Number.isFinite(state.fontSize)) {
                this.fontSize = this.clampFontSize(state.fontSize);
            } else if (this.fontInput && Number.isFinite(parseFloat(this.fontInput.value))) {
                this.fontSize = this.clampFontSize(parseFloat(this.fontInput.value));
            }

            if (typeof state.content === 'string' && this.textarea) {
                this.textarea.value = state.content;
            }
        } else {
            this.visible = false;
            this.mode = 'edit';
        }
    }

    getSceneState() {
        if (!this.container || !this.textarea) return null;
        const { left, top, width, height } = this.getBoxMetrics();
        return {
            visible: this.visible,
            mode: this.mode,
            left: Number.isFinite(left) ? left : 0,
            top: Number.isFinite(top) ? top : 0,
            width: Number.isFinite(width) ? width : 0,
            height: Number.isFinite(height) ? height : 0,
            fontSize: this.fontSize,
            content: this.textarea.value ?? ''
        };
    }

    applySceneState(state) {
        if (!state || typeof state !== 'object' || !this.container) return;

        this.visible = !!state.visible;
        this.mode = state.mode === 'preview' ? 'preview' : 'edit';

        if (Number.isFinite(state.width) && state.width > 100) {
            this.container.style.width = `${state.width}px`;
        }
        if (Number.isFinite(state.height) && state.height > 100) {
            this.container.style.height = `${state.height}px`;
        }

        const rawLeft = Number.isFinite(state.left) ? state.left : this.container.offsetLeft;
        const rawTop = Number.isFinite(state.top) ? state.top : this.container.offsetTop;
        const clamped = this.clampPosition(rawLeft, rawTop);
        this.container.style.left = `${clamped.left}px`;
        this.container.style.top = `${clamped.top}px`;

        if (typeof state.content === 'string' && this.textarea) {
            this.textarea.value = state.content;
        }

        if (Number.isFinite(state.fontSize)) {
            this.fontSize = this.clampFontSize(state.fontSize);
        }
        this.applyFontSize();
        this.updateUI();
        this.updatePreview();

        this.saveState({ includeContent: true });
    }
}
