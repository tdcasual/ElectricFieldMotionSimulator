# 功能测试指南

## 测试步骤

### 1. 清除浏览器缓存
- **Chrome/Edge**: 按 `Ctrl + Shift + Delete`，选择"缓存的图片和文件"，点击清除
- 或者在开发者工具(F12)中，右键刷新按钮，选择"清空缓存并硬性重新加载"

### 2. 测试主题切换功能
1. 打开 http://localhost:8000/index.html
2. 查看右上角的主题切换按钮 (🌙 或 ☀️)
3. 点击按钮，应该看到：
   - 背景颜色变化
   - 按钮图标从 🌙 变为 ☀️ (或反之)
   - 右下角出现通知："已切换到深色/浅色模式"

### 3. 测试拖拽功能  
1. 在左侧工具栏找到"半圆电场"或"平行板电容器"
2. 按住鼠标左键拖动到中间的画布区域
3. 松开鼠标，应该看到：
   - 对象出现在画布上
   - 半圆电场显示为半圆形状
   - 平行板电容器显示为两条平行线

### 4. 使用调试页面
如果主页面有问题，使用调试页面诊断：

1. 打开 http://localhost:8000/test-debug.html
2. 右侧会显示详细的调试信息
3. 点击"测试主题切换"按钮
4. 拖拽左侧组件到画布
5. 查看调试日志了解具体问题

### 5. 检查浏览器控制台
1. 按 F12 打开开发者工具
2. 切换到 Console 标签
3. 查找红色错误信息
4. 如果有错误，记下错误内容

## 已修复的问题

✅ 修复了 `SemiCircleElectricField` 中的 position.x/y 引用错误
✅ 修复了 `ParallelPlateCapacitor` 中的 position.x/y 引用错误  
✅ 修复了 `Renderer.js` 中的 position.x/y 引用错误
✅ 已在 `DragDropManager.js` 中添加新对象类型的处理
✅ 已在 `Scene.js` 中添加反序列化支持
✅ 已在 `PropertyPanel.js` 中添加属性编辑支持

## 可能的问题和解决方案

### 问题1: 拖拽没反应
**原因**: 浏览器缓存了旧的JavaScript文件
**解决**: 强制刷新 (Ctrl + F5) 或清空缓存

### 问题2: 主题切换没反应
**原因**: ThemeManager事件绑定问题
**解决**: 检查浏览器控制台是否有错误

### 问题3: 对象创建但不显示
**原因**: Canvas渲染问题
**解决**: 检查 Renderer.js 是否正确加载

## 测试文件

- **test-debug.html**: 完整的调试界面，包含实时日志
- **test-simple.html**: 简单的拖拽测试
- **test-objects-drag.html**: 对象集成测试
- **test-new-objects.html**: 新对象类测试

## 技术细节

所有修改都是为了修复以下问题：
- BaseObject 定义了 `x` 和 `y` 属性
- 新对象类错误地使用了 `position.x` 和 `position.y`
- Renderer也需要更新以使用正确的属性

现在所有代码都使用 `object.x` 和 `object.y`，与BaseObject一致。
