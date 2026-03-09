export class ContextMenuController {
    constructor({ documentRef = document, setTimeoutRef = setTimeout, clearTimeoutRef = clearTimeout } = {}) {
        this.documentRef = documentRef;
        this.setTimeoutRef = setTimeoutRef;
        this.clearTimeoutRef = clearTimeoutRef;
        this.closeHandler = null;
        this.closeTimer = null;
    }

    clearCloseHandler() {
        if (!this.closeHandler) return;
        this.documentRef.removeEventListener('click', this.closeHandler);
        this.closeHandler = null;
    }

    clearCloseTimer() {
        if (this.closeTimer == null) return;
        this.clearTimeoutRef(this.closeTimer);
        this.closeTimer = null;
    }

    hide() {
        const contextMenu = this.documentRef.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        this.clearCloseTimer();
        this.clearCloseHandler();
    }

    show({ clientX, clientY }) {
        const contextMenu = this.documentRef.getElementById('context-menu');
        if (!contextMenu) return false;
        contextMenu.style.left = `${clientX}px`;
        contextMenu.style.top = `${clientY}px`;
        contextMenu.style.display = 'block';
        this.clearCloseTimer();
        this.clearCloseHandler();
        this.closeTimer = this.setTimeoutRef(() => {
            const closeMenu = () => {
                contextMenu.style.display = 'none';
                this.clearCloseHandler();
            };
            this.closeTimer = null;
            this.closeHandler = closeMenu;
            this.documentRef.addEventListener('click', closeMenu);
        }, 0);
        return true;
    }
}
