/**
 * 右键菜单
 */

export class ContextMenu {
    constructor(scene) {
        this.scene = scene;
        this.init();
    }
    
    init() {
        // 属性按钮
        document.getElementById('menu-properties').addEventListener('click', () => {
            if (this.scene.selectedObject) {
                this.showPropertyPanel();
            }
        });
        
        // 复制按钮
        document.getElementById('menu-duplicate').addEventListener('click', () => {
            if (this.scene.selectedObject) {
                this.scene.duplicateObject(this.scene.selectedObject);
                window.app?.renderer?.invalidateFields?.();
                if (this.scene.isPaused) {
                    window.app?.renderer?.render?.(this.scene);
                }
                window.app?.updateUI?.();
            }
        });
        
        // 删除按钮
        document.getElementById('menu-delete').addEventListener('click', () => {
            if (this.scene.selectedObject) {
                this.scene.removeObject(this.scene.selectedObject);
                this.scene.selectedObject = null;
                window.app?.renderer?.invalidateFields?.();
                if (this.scene.isPaused) {
                    window.app?.renderer?.render?.(this.scene);
                }
                window.app?.updateUI?.();
            }
        });
    }
    
    showPropertyPanel() {
        // 触发属性面板更新
        const event = new CustomEvent('show-properties', {
            detail: { object: this.scene.selectedObject }
        });
        document.dispatchEvent(event);
    }
}
