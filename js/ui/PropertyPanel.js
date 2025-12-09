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
        } else if (object.type.includes('electric') || object.type === 'parallel-plate-capacitor' || object.type === 'vertical-parallel-plate-capacitor') {
            this.renderElectricFieldProperties(content, object);
        } else if (object.type === 'magnetic-field') {
            this.renderMagneticFieldProperties(content, object);
        } else if (object.type === 'electron-gun') {
            this.renderElectronGunProperties(content, object);
        } else if (object.type === 'fluorescent-screen') {
            this.renderScreenProperties(content, object);
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
            if (window.app?.scene?.isPaused) {
                window.app.renderer.render(window.app.scene);
            }
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
        if (field.type === 'parallel-plate-capacitor' || field.type === 'vertical-parallel-plate-capacitor') {
            extraFields = `
            <div class="form-row">
                <label>板长度</label>
                <input type="number" id="prop-plate-width" value="${field.width}" min="50" step="10">
            </div>
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
            <div class="form-row">
                <label>电源类型</label>
                <select id="prop-source-type">
                    <option value="dc" ${field.sourceType !== 'ac' && field.sourceType !== 'custom' ? 'selected' : ''}>直流</option>
                    <option value="ac" ${field.sourceType === 'ac' ? 'selected' : ''}>交流</option>
                    <option value="custom" ${field.sourceType === 'custom' ? 'selected' : ''}>自定义</option>
                </select>
            </div>
            <div class="form-row ac-only">
                <label>交流幅值 (N/C)</label>
                <input type="number" id="prop-ac-amplitude" value="${field.acAmplitude ?? field.strength}" step="100">
            </div>
            <div class="form-row ac-only">
                <label>频率 (Hz)</label>
                <input type="number" id="prop-ac-frequency" value="${field.acFrequency ?? 50}" min="0" step="1">
            </div>
            <div class="form-row ac-only">
                <label>相位 (度)</label>
                <input type="number" id="prop-ac-phase" value="${field.acPhase ?? 0}" step="5">
            </div>
            <div class="form-row ac-only">
                <label>直流偏置 (N/C)</label>
                <input type="number" id="prop-dc-bias" value="${field.dcBias ?? 0}" step="100">
            </div>
            <div class="form-row ac-only">
                <label>波形</label>
                <select id="prop-waveform">
                    <option value="sine" ${field.waveform === 'sine' ? 'selected' : ''}>正弦</option>
                    <option value="square" ${field.waveform === 'square' ? 'selected' : ''}>方波</option>
                    <option value="triangle" ${field.waveform === 'triangle' ? 'selected' : ''}>三角波</option>
                </select>
            </div>
            <div class="form-row custom-only">
                <label>自定义 U(t)</label>
                <textarea id="prop-custom-expression" rows="2" placeholder="例如：Math.sin(2*Math.PI*50*t)">${field.customExpression || 'Math.sin(2*Math.PI*50*t)'}</textarea>
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
            ${(field.width !== undefined && field.height !== undefined && field.type !== 'vertical-parallel-plate-capacitor') ? `
            <div class="form-row">
                <label>宽度</label>
                <input type="number" id="prop-width" value="${field.width}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>高度</label>
                <input type="number" id="prop-height" value="${field.height}" min="50" step="10">
            </div>
            ` : ''}
            ${(field.type === 'vertical-parallel-plate-capacitor') ? `
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

        // 切换交流相关字段显示
        const sourceTypeSelect = document.getElementById('prop-source-type');
        const acOnlyRows = container.querySelectorAll('.ac-only');
        const customRows = container.querySelectorAll('.custom-only');
        const toggleAcFields = () => {
            const isAc = sourceTypeSelect && sourceTypeSelect.value === 'ac';
            const isCustom = sourceTypeSelect && sourceTypeSelect.value === 'custom';
            acOnlyRows.forEach(row => row.style.display = isAc ? 'flex' : 'none');
            customRows.forEach(row => row.style.display = isCustom ? 'flex' : 'none');
        };
        if (sourceTypeSelect) {
            toggleAcFields();
            sourceTypeSelect.addEventListener('change', toggleAcFields);
        }
        
        document.getElementById('apply-field-props').addEventListener('click', () => {
            field.x = parseFloat(document.getElementById('prop-x').value);
            field.y = parseFloat(document.getElementById('prop-y').value);
            if (field.width !== undefined && field.height !== undefined && field.type !== 'vertical-parallel-plate-capacitor') {
                field.width = parseFloat(document.getElementById('prop-width').value);
                field.height = parseFloat(document.getElementById('prop-height').value);
            }
            if (field.type === 'vertical-parallel-plate-capacitor') {
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
            
            if (field.type === 'parallel-plate-capacitor' || field.type === 'vertical-parallel-plate-capacitor') {
                const plateWidthInput = document.getElementById('prop-plate-width');
                const plateDistanceInput = document.getElementById('prop-plate-distance');
                const polarityInput = document.getElementById('prop-polarity');
                const sourceTypeInput = document.getElementById('prop-source-type');
                const acAmplitudeInput = document.getElementById('prop-ac-amplitude');
                const acFrequencyInput = document.getElementById('prop-ac-frequency');
                const acPhaseInput = document.getElementById('prop-ac-phase');
                const dcBiasInput = document.getElementById('prop-dc-bias');
                const waveformInput = document.getElementById('prop-waveform');
                const customExprInput = document.getElementById('prop-custom-expression');
                if (plateWidthInput) {
                    field.width = parseFloat(plateWidthInput.value);
                }
                if (plateDistanceInput) {
                    field.plateDistance = parseFloat(plateDistanceInput.value);
                }
                if (polarityInput) {
                    field.polarity = parseInt(polarityInput.value);
                }
                if (sourceTypeInput) {
                    field.sourceType = sourceTypeInput.value;
                }
                if (acAmplitudeInput) {
                    field.acAmplitude = parseFloat(acAmplitudeInput.value);
                }
                if (acFrequencyInput) {
                    field.acFrequency = parseFloat(acFrequencyInput.value);
                }
                if (acPhaseInput) {
                    field.acPhase = parseFloat(acPhaseInput.value);
                }
                if (dcBiasInput) {
                    field.dcBias = parseFloat(dcBiasInput.value);
                }
                if (waveformInput) {
                    field.waveform = waveformInput.value;
                }
                if (customExprInput) {
                    field.customExpression = customExprInput.value || '0';
                    field.compileCustomExpression?.();
                }
            }
            
            // 标记需要重绘
            window.app?.renderer?.invalidateFields();
            if (window.app?.scene?.isPaused) {
                window.app.renderer.render(window.app.scene);
            }
        });
    }

    renderElectronGunProperties(container, emitter) {
        const presets = emitter.constructor?.PARTICLE_PRESETS || {};
        const presetOptions = Object.entries(presets).map(
            ([key, value]) => `<option value="${key}" ${emitter.particleType === key ? 'selected' : ''}>${value.label || key}</option>`
        ).join('');
        const options = presetOptions + `<option value="custom" ${emitter.particleType === 'custom' ? 'selected' : ''}>自定义</option>`;

        container.innerHTML = `
            <h4>电子枪属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-gun-x" value="${emitter.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-gun-y" value="${emitter.y}" step="10">
            </div>
            <div class="form-row">
                <label>发射方向 (度)</label>
                <input type="number" id="prop-gun-direction" value="${emitter.direction}" min="0" max="360">
            </div>
            <div class="form-row">
                <label>发射频率 (个/秒)</label>
                <input type="number" id="prop-gun-rate" value="${emitter.emissionRate}" min="0" step="0.5">
            </div>
            <div class="form-row">
                <label>发射初速度 (px/s)</label>
                <input type="number" id="prop-gun-speed" value="${emitter.emissionSpeed}" step="10">
            </div>
            <div class="form-row">
                <label>粒子类型</label>
                <select id="prop-gun-particle-type">${options}</select>
            </div>
            <div class="form-row">
                <label>粒子电荷 (C)</label>
                <input type="number" id="prop-gun-charge" value="${emitter.particleCharge}" step="1e-20">
            </div>
            <div class="form-row">
                <label>粒子质量 (kg)</label>
                <input type="number" id="prop-gun-mass" value="${emitter.particleMass}" step="1e-30">
            </div>
            <div class="form-row">
                <label>粒子半径 (px)</label>
                <input type="number" id="prop-gun-radius" value="${emitter.particleRadius}" min="2" max="20">
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-gun-ignore-gravity" ${emitter.ignoreGravity ? 'checked' : ''}>
                    忽略重力
                </label>
            </div>
            <button class="btn btn-primary" id="apply-gun-props">应用</button>
        `;

        const typeSelect = document.getElementById('prop-gun-particle-type');
        const chargeInput = document.getElementById('prop-gun-charge');
        const massInput = document.getElementById('prop-gun-mass');

        const applyPreset = () => {
            const preset = presets[typeSelect.value];
            if (preset) {
                chargeInput.value = preset.charge;
                massInput.value = preset.mass;
            }
        };

        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                if (presets[typeSelect.value]) {
                    applyPreset();
                }
            });
        }

        document.getElementById('apply-gun-props').addEventListener('click', () => {
            emitter.x = parseFloat(document.getElementById('prop-gun-x').value);
            emitter.y = parseFloat(document.getElementById('prop-gun-y').value);
            emitter.direction = parseFloat(document.getElementById('prop-gun-direction').value);
            emitter.emissionRate = parseFloat(document.getElementById('prop-gun-rate').value);
            emitter.emissionSpeed = parseFloat(document.getElementById('prop-gun-speed').value);

            const chosenType = typeSelect.value;
            emitter.particleType = chosenType;
            if (presets[chosenType]) {
                applyPreset();
            }

            emitter.particleCharge = parseFloat(chargeInput.value);
            emitter.particleMass = parseFloat(massInput.value);
            emitter.particleRadius = parseFloat(document.getElementById('prop-gun-radius').value);
            emitter.ignoreGravity = document.getElementById('prop-gun-ignore-gravity').checked;

            emitter._emitAccumulator = 0;
            window.app?.renderer?.invalidateFields();
            if (window.app?.scene?.isPaused) {
                window.app.renderer.render(window.app.scene);
            }
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

    renderScreenProperties(container, screen) {
        container.innerHTML = `
            <h4>荧光屏属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-screen-x" value="${screen.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-screen-y" value="${screen.y}" step="10">
            </div>
            <div class="form-row">
                <label>正视宽度</label>
                <input type="number" id="prop-screen-width" value="${screen.width}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>正视高度</label>
                <input type="number" id="prop-screen-height" value="${screen.height}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>侧视厚度</label>
                <input type="number" id="prop-screen-depth" value="${screen.depth}" min="10" step="5">
            </div>
            <div class="form-row">
                <label>视距间隔</label>
                <input type="number" id="prop-screen-gap" value="${screen.viewGap ?? 12}" min="0" step="2">
            </div>
            <div class="form-row">
                <label>光斑大小</label>
                <input type="number" id="prop-screen-spot" value="${screen.spotSize}" min="2" max="20" step="1">
            </div>
            <div class="form-row">
                <label>余辉时间 (s)</label>
                <input type="number" id="prop-screen-persistence" value="${screen.persistence}" min="0.1" step="0.1">
            </div>
            <button class="btn btn-primary" id="apply-screen-props">应用</button>
            <button class="btn" id="clear-screen-spots">清除光斑</button>
        `;

        document.getElementById('apply-screen-props').addEventListener('click', () => {
            screen.x = parseFloat(document.getElementById('prop-screen-x').value);
            screen.y = parseFloat(document.getElementById('prop-screen-y').value);
            screen.width = parseFloat(document.getElementById('prop-screen-width').value);
            screen.height = parseFloat(document.getElementById('prop-screen-height').value);
            screen.depth = parseFloat(document.getElementById('prop-screen-depth').value);
            screen.viewGap = parseFloat(document.getElementById('prop-screen-gap').value);
            screen.spotSize = parseFloat(document.getElementById('prop-screen-spot').value);
            screen.persistence = parseFloat(document.getElementById('prop-screen-persistence').value);
            window.app?.renderer?.invalidateFields();
            if (window.app?.scene?.isPaused) {
                window.app.renderer.render(window.app.scene);
            }
        });

        document.getElementById('clear-screen-spots').addEventListener('click', () => {
            screen.hits = [];
            window.app?.renderer?.invalidateFields();
            if (window.app?.scene?.isPaused) {
                window.app.renderer.render(window.app.scene);
            }
        });
    }
}
