/**
 * 模态对话框
 */

export class Modal {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.modal = this.overlay.querySelector('.modal');
        this.title = document.getElementById('modal-title');
        this.content = document.getElementById('modal-content');
        this.footer = this.overlay.querySelector('.modal-footer');
        this.closeBtn = document.getElementById('modal-close-btn');
        this.onDismiss = null;
        
        this.init();
    }
    
    init() {
        this.closeBtn.addEventListener('click', () => this.dismiss());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.dismiss();
            }
        });
    }
    
    show(title, content, onConfirm) {
        this.showActions({
            title,
            content,
            actions: [
                { label: '取消', className: 'btn' },
                { label: '确定', className: 'btn btn-primary', onClick: onConfirm }
            ]
        });
    }

    showActions({ title, content, actions = [], onDismiss = null } = {}) {
        this.title.textContent = title || '';
        this.content.innerHTML = content || '';
        this.onDismiss = typeof onDismiss === 'function' ? onDismiss : null;
        this.renderActions(actions);
        this.overlay.style.display = 'flex';
    }

    renderActions(actions) {
        if (!this.footer) return;
        this.footer.innerHTML = '';

        for (const action of actions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = action?.className || 'btn';
            button.textContent = action?.label || '确定';
            button.addEventListener('click', () => {
                const result = action?.onClick ? action.onClick() : undefined;
                if (result === false || action?.closeOnClick === false) {
                    return;
                }
                this.onDismiss = null;
                this.hide();
            });
            this.footer.appendChild(button);
        }
    }

    dismiss() {
        const callback = this.onDismiss;
        this.onDismiss = null;
        this.hide();
        if (typeof callback === 'function') {
            callback();
        }
    }
    
    hide() {
        this.overlay.style.display = 'none';
    }
}
