/**
 * 模态对话框
 */

export class Modal {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.modal = this.overlay.querySelector('.modal');
        this.title = document.getElementById('modal-title');
        this.content = document.getElementById('modal-content');
        this.confirmBtn = document.getElementById('modal-confirm-btn');
        this.cancelBtn = document.getElementById('modal-cancel-btn');
        this.closeBtn = document.getElementById('modal-close-btn');
        
        this.init();
    }
    
    init() {
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.closeBtn.addEventListener('click', () => this.hide());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
    }
    
    show(title, content, onConfirm) {
        this.title.textContent = title;
        this.content.innerHTML = content;
        this.overlay.style.display = 'flex';
        
        this.confirmBtn.onclick = () => {
            if (onConfirm) onConfirm();
            this.hide();
        };
    }
    
    hide() {
        this.overlay.style.display = 'none';
    }
}
