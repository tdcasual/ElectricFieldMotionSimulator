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
            }
        });
        
        // 删除按钮
        document.getElementById('menu-delete').addEventListener('click', () => {
            if (this.scene.selectedObject) {
                this.scene.removeObject(this.scene.selectedObject);
                this.scene.selectedObject = null;
            }
        });
    }
    
    showPropertyPanel() {
        const panel = document.getElementById('property-panel');
        panel.style.display = 'flex';
        
        // 触发属性面板更新
        const event = new CustomEvent('show-properties', {
            detail: { object: this.scene.selectedObject }
        });
        document.dispatchEvent(event);
    }
}
