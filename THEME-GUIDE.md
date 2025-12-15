# 主题系统实现 - 使用指南

## 🎨 功能描述

本应用现已支持**深色模式**和**浅色模式**两种主题切换，用户可以根据个人偏好灵活切换。

### 核心特性

- ✅ **自动检测系统偏好** - 首次加载时自动检测操作系统主题设置
- ✅ **一键切换** - 点击头部🌙/☀️按钮瞬间切换主题
- ✅ **持久化存储** - 用户选择保存到localStorage，下次访问自动应用
- ✅ **平滑过渡** - CSS变量驱动的主题切换，所有UI元素 smooth transition
- ✅ **完整覆盖** - 所有UI组件、Canvas元素、网格、场可视化都支持主题适配

## 📋 实现细节

### 1. ThemeManager.js

**文件路径**: `js/utils/ThemeManager.js`

提供完整的主题管理功能：

```javascript
// 创建主题管理器实例
const themeManager = new ThemeManager();

// 切换主题
themeManager.toggle();

// 获取当前主题
const theme = themeManager.getCurrentTheme(); // 'dark' 或 'light'

// 获取主题信息
const info = themeManager.getThemeInfo();
// { current: 'dark', isDark: true, options: ['light', 'dark', 'auto'] }

// 获取主题色值（CSS变量）
const colors = themeManager.getThemeColors();
```

**关键方法**：
- `init()` - 初始化，自动应用保存的或系统偏好的主题
- `loadTheme()` - 从localStorage加载用户偏好，若无则检测系统设置
- `saveTheme(theme)` - 保存主题偏好到localStorage
- `applyTheme(theme)` - 应用主题并更新按钮显示
- `toggle()` - 在深色/浅色之间切换
- `getThemeColors()` - 获取当前主题的所有CSS变量值

### 2. CSS主题变量系统

**文件路径**: `styles/theme.css`

使用CSS Custom Properties (变量)支持主题切换：

**深色模式** (默认, `:root`):
```css
--bg-primary: #1e1e1e;
--text-primary: #cccccc;
--accent-blue: #0e639c;
--electric-field-color: rgba(255, 200, 0, 0.3);
```

**浅色模式** (`body.light-theme`):
```css
--bg-primary: #ffffff;
--text-primary: #333333;
--accent-blue: #0078d4;
--electric-field-color: rgba(255, 200, 0, 0.15);
```

### 3. Canvas元素主题适配

**GridRenderer.js** - 网格颜色随主题变化：
```javascript
ctx.strokeStyle = isDarkTheme ? 
    'rgba(51, 51, 51, 0.5)' :     // 深色主题
    'rgba(200, 200, 200, 0.5)';   // 浅色主题
```

**FieldVisualizer.js** - 电场/磁场箭头和点颜色变化：
- 电场箭头: 深色 `rgba(255, 200, 0, 0.6)` ↔ 浅色 `rgba(255, 150, 0, 0.7)`
- 磁场点: 深色 `rgba(100, 150, 255, 0.6)` ↔ 浅色 `rgba(100, 150, 255, 0.7)`

## 🎯 使用流程

### 用户端

1. **首次打开**
   - 应用自动检测系统主题（Windows/macOS暗色模式）
   - 若系统无明确设置，默认使用深色模式

2. **切换主题**
   - 点击头部右上角的 🌙 (深色) 或 ☀️ (浅色) 按钮
   - 看到通知信息："已切换到浅色模式"
   - 所有UI、Canvas元素、网格、场可视化立即切换颜色

3. **下次访问**
   - 上次选择的主题自动应用
   - 无需重新设置

### 开发者端

**在main.js中集成**：

```javascript
import { ThemeManager } from './utils/ThemeManager.js';

class Application {
    constructor() {
        // ... 其他初始化
        this.themeManager = new ThemeManager();  // 创建实例
    }
    
    bindEvents() {
        // 绑定按钮事件
        document.getElementById('theme-toggle-btn')
            .addEventListener('click', () => this.toggleTheme());
    }
    
    toggleTheme() {
        this.themeManager.toggle();
        const theme = this.themeManager.getCurrentTheme();
        this.showNotification(
            `已切换到${theme === 'dark' ? '深色' : '浅色'}模式`,
            'success'
        );
    }
}
```

## 🎨 主题色彩对照表

### 深色模式 (Dark Theme)

| 元素 | 颜色值 | RGB值 |
|------|--------|-------|
| 背景 | #1e1e1e | VS Code深灰 |
| 文字 | #cccccc | 浅灰 |
| 强调 | #0e639c | VS Code蓝 |
| 电场 | rgba(255,200,0,0.3) | 金黄半透 |
| 成功 | #4ec9b0 | 青绿 |
| 错误 | #f48771 | 橙红 |

### 浅色模式 (Light Theme)

| 元素 | 颜色值 | RGB值 |
|------|--------|-------|
| 背景 | #ffffff | 纯白 |
| 文字 | #333333 | 深灰 |
| 强调 | #0078d4 | Windows蓝 |
| 电场 | rgba(255,200,0,0.15) | 金黄淡色 |
| 成功 | #107c10 | 绿色 |
| 错误 | #f7630c | 橙色 |

## 🧪 测试指南

### 测试文件

打开 `test-theme.html` 进行功能验证：

```bash
# 启动服务器
python -m http.server 8000

# 访问测试页面
http://localhost:8000/test-theme.html
```

### 测试场景

1. **CSS变量检测**
   - 查看"颜色变量测试"部分
   - 验证所有颜色值正确应用

2. **Canvas颜色**
   - 检查"Canvas网格测试" - 网格线颜色应适应主题
   - 检查"Canvas箭头测试" - 箭头和磁场点颜色应适应主题

3. **localStorage持久化**
   - 切换主题
   - 刷新页面 (F5)
   - 验证主题是否保持

4. **系统主题同步**
   - Windows: 设置 > 个性化 > 颜色 > 切换亮度模式
   - 验证应用主题是否跟随系统变化

## 📱 兼容性

- ✅ Chrome/Edge (所有现代版本)
- ✅ Firefox 31+
- ✅ Safari 9.1+ (iOS 9.3+)
- ✅ Opera (所有现代版本)

**注意**: 需要浏览器支持：
- CSS Custom Properties (CSS变量)
- ES6 Modules
- localStorage API
- CSS媒体查询 `prefers-color-scheme`

## 🔧 常见问题

### Q: 深色/浅色主题没有完全切换？
**A**: 检查是否加载了ThemeManager.js，确保main.js中有初始化代码。

### Q: Canvas元素颜色不变？
**A**: 检查GridRenderer.js和FieldVisualizer.js中是否有主题检测逻辑。

### Q: 页面刷新后主题重置？
**A**: 确认localStorage写入权限，检查浏览器隐私设置。

### Q: 系统主题变化应用不响应？
**A**: 仅在首次加载和主题为'auto'时检测。用户主动选择后，系统变化不会自动切换。

## 📝 未来改进

- [ ] 三种主题选项: 深色/浅色/自动跟随系统
- [ ] 自定义颜色主题编辑器
- [ ] 导出/导入主题配置
- [ ] 更多主题预设 (高对比度、色盲友好等)
- [ ] 主题切换动画优化

## 📞 支持

如遇问题，请检查浏览器控制台(F12)错误信息，或参考test-theme.html中的测试代码。
