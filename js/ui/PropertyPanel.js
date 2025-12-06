/**
 * 属性面板
 */

export class PropertyPanel {
    constructor(scene) {
        this.scene = scene;
        this.currentObject = null;
        this.init();
    }
    
    init() {
        // 监听显示属性事件
        document.addEventListener('show-properties', (e) => {
            this.show(e.detail.object);
        });
    }
    
    show(object) {
        this.currentObject = object;
        const content = document.getElementById('property-content');
        content.innerHTML = '';
        
        if (object.type === 'particle') {
            this.renderParticleProperties(content, object);
        } else if (object.type.includes('electric') || object.type === 'parallel-plate-capacitor') {
            this.renderElectricFieldProperties(content, object);
        } else if (object.type === 'magnetic-field') {
            this.renderMagneticFieldProperties(content, object);
        }
        
        document.getElementById('property-panel').style.display = 'flex';
    }
    
    hide() {
        document.getElementById('property-panel').style.display = 'none';
        this.currentObject = null;
    }
    
    renderParticleProperties(container, particle) {
        container.innerHTML = `
            <h4>粒子属性</h4>
            <div class="form-row">
                <label>质量 (kg)</label>
                <input type="number" id="prop-mass" value="${particle.mass}" step="1e-31">
            </div>
            <div class="form-row">
                <label>电荷量 (C)</label>
                <input type="number" id="prop-charge" value="${particle.charge}" step="1e-19">
            </div>
            <div class="form-row">
                <label>初始速度 vx (m/s)</label>
                <input type="number" id="prop-vx" value="${particle.velocity.x}" step="10">
            </div>
            <div class="form-row">
                <label>初始速度 vy (m/s)</label>
                <input type="number" id="prop-vy" value="${particle.velocity.y}" step="10">
            </div>
            <div class="form-row">
                <label>半径 (px)</label>
                <input type="number" id="prop-radius" value="${particle.radius}" min="2" max="20">
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-ignore-gravity" ${particle.ignoreGravity ? 'checked' : ''}>
                    忽略重力
                </label>
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-show-trajectory" ${particle.showTrajectory ? 'checked' : ''}>
                    显示轨迹
                </label>
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-show-energy" ${particle.showEnergy ? 'checked' : ''}>
                    显示能量
                </label>
            </div>
            <button class="btn btn-primary" id="apply-particle-props">应用</button>
            <button class="btn" id="clear-trajectory">清空轨迹</button>
        `;
        
        document.getElementById('apply-particle-props').addEventListener('click', () => {
            particle.mass = parseFloat(document.getElementById('prop-mass').value);
            particle.charge = parseFloat(document.getElementById('prop-charge').value);
            particle.velocity.x = parseFloat(document.getElementById('prop-vx').value);
            particle.velocity.y = parseFloat(document.getElementById('prop-vy').value);
            particle.radius = parseFloat(document.getElementById('prop-radius').value);
            particle.ignoreGravity = document.getElementById('prop-ignore-gravity').checked;
            particle.showTrajectory = document.getElementById('prop-show-trajectory').checked;
            particle.showEnergy = document.getElementById('prop-show-energy').checked;
        });
        
        document.getElementById('clear-trajectory').addEventListener('click', () => {
            particle.clearTrajectory();
        });
    }
    
    renderElectricFieldProperties(container, field) {
        let extraFields = '';
        
        // 为半圆电场添加朝向参数
        if (field.type === 'semicircle-electric-field') {
            extraFields = `
            <div class="form-row">
                <label>朝向 (度)</label>
                <input type="number" id="prop-orientation" value="${field.orientation || 0}" min="0" max="360">
            </div>
            `;
        }
        
        // 为平行板电容器添加极性参数
        if (field.type === 'parallel-plate-capacitor') {
            extraFields = `
            <div class="form-row">
                <label>板间距离</label>
                <input type="number" id="prop-plate-distance" value="${field.plateDistance}" min="20" step="10">
            </div>
            <div class="form-row">
                <label>极性</label>
                <select id="prop-polarity">
                    <option value="1" ${field.polarity === 1 ? 'selected' : ''}>正板在方向正侧</option>
                    <option value="-1" ${field.polarity === -1 ? 'selected' : ''}>负板在方向正侧</option>
                </select>
            </div>
            `;
        }
        
        container.innerHTML = `
            <h4>电场属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-x" value="${field.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-y" value="${field.y}" step="10">
            </div>
            ${field.width !== undefined ? `
            <div class="form-row">
                <label>宽度</label>
                <input type="number" id="prop-width" value="${field.width}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>高度</label>
                <input type="number" id="prop-height" value="${field.height}" min="50" step="10">
            </div>
            ` : ''}
            ${field.radius !== undefined ? `
            <div class="form-row">
                <label>半径</label>
                <input type="number" id="prop-radius" value="${field.radius}" min="20" step="10">
            </div>
            ` : ''}
            <div class="form-row">
                <label>场强 (N/C)</label>
                <input type="number" id="prop-strength" value="${field.strength}" step="100">
            </div>
            <div class="form-row">
                <label>方向 (度)</label>
                <input type="number" id="prop-direction" value="${field.direction}" min="0" max="360">
            </div>
            ${extraFields}
            <button class="btn btn-primary" id="apply-field-props">应用</button>
        `;
        
        document.getElementById('apply-field-props').addEventListener('click', () => {
            field.x = parseFloat(document.getElementById('prop-x').value);
            field.y = parseFloat(document.getElementById('prop-y').value);
            if (field.width !== undefined) {
                field.width = parseFloat(document.getElementById('prop-width').value);
                field.height = parseFloat(document.getElementById('prop-height').value);
            }
            if (field.radius !== undefined) {
                field.radius = parseFloat(document.getElementById('prop-radius').value);
            }
            field.strength = parseFloat(document.getElementById('prop-strength').value);
            field.direction = parseFloat(document.getElementById('prop-direction').value);
            
            // 处理特定属性
            if (field.type === 'semicircle-electric-field') {
                const orientationInput = document.getElementById('prop-orientation');
                if (orientationInput) {
                    field.orientation = parseFloat(orientationInput.value);
                }
            }
            
            if (field.type === 'parallel-plate-capacitor') {
                const plateDistanceInput = document.getElementById('prop-plate-distance');
                const polarityInput = document.getElementById('prop-polarity');
                if (plateDistanceInput) {
                    field.plateDistance = parseFloat(plateDistanceInput.value);
                }
                if (polarityInput) {
                    field.polarity = parseInt(polarityInput.value);
                }
            }
            
            // 标记需要重绘
            window.app?.renderer?.invalidateFields();
        });
    }
    
    renderMagneticFieldProperties(container, field) {
        container.innerHTML = `
            <h4>磁场属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-x" value="${field.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-y" value="${field.y}" step="10">
            </div>
            <div class="form-row">
                <label>宽度</label>
                <input type="number" id="prop-width" value="${field.width}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>高度</label>
                <input type="number" id="prop-height" value="${field.height}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>磁感应强度 (T)</label>
                <input type="number" id="prop-strength" value="${field.strength}" step="0.1">
            </div>
            <button class="btn btn-primary" id="apply-magnetic-props">应用</button>
        `;
        
        document.getElementById('apply-magnetic-props').addEventListener('click', () => {
            field.x = parseFloat(document.getElementById('prop-x').value);
            field.y = parseFloat(document.getElementById('prop-y').value);
            field.width = parseFloat(document.getElementById('prop-width').value);
            field.height = parseFloat(document.getElementById('prop-height').value);
            field.strength = parseFloat(document.getElementById('prop-strength').value);
            
            window.app?.renderer?.invalidateFields();
        });
    }
}
