#!/usr/bin/env python3
"""
主题切换功能集成测试
测试深色/浅色模式的完整功能链
"""

import json
import sys
from pathlib import Path

def test_theme_manager_imports():
    """测试 ThemeManager 导入"""
    theme_manager_path = Path('js/utils/ThemeManager.js')
    
    if not theme_manager_path.exists():
        print("❌ ThemeManager.js 不存在")
        return False
    
    content = theme_manager_path.read_text(encoding='utf-8')
    required_methods = [
        'constructor',
        'init',
        'loadTheme',
        'saveTheme',
        'applyTheme',
        'toggle',
        'getCurrentTheme',
        'getThemeInfo',
        'getThemeColors'
    ]
    
    for method in required_methods:
        if method not in content:
            print(f"❌ ThemeManager 缺少方法: {method}")
            return False
    
    print("✅ ThemeManager.js 包含所有必要方法")
    return True

def test_main_js_integration():
    """测试 main.js 中的集成"""
    main_js_path = Path('js/main.js')
    
    if not main_js_path.exists():
        print("❌ main.js 不存在")
        return False
    
    content = main_js_path.read_text(encoding='utf-8')
    
    # 检查导入
    if 'import { ThemeManager }' not in content:
        print("❌ main.js 没有导入 ThemeManager")
        return False
    
    # 检查初始化
    if 'this.themeManager = new ThemeManager()' not in content:
        print("❌ main.js 没有初始化 ThemeManager")
        return False
    
    # 检查事件绑定
    if 'theme-toggle-btn' not in content:
        print("❌ main.js 没有绑定主题切换按钮事件")
        return False
    
    # 检查切换方法
    if 'toggleTheme()' not in content:
        print("❌ main.js 没有定义 toggleTheme 方法")
        return False
    
    print("✅ main.js 完整集成了 ThemeManager")
    return True

def test_html_ui_element():
    """测试 HTML 中的UI元素"""
    index_html_path = Path('index.html')
    
    if not index_html_path.exists():
        print("❌ index.html 不存在")
        return False
    
    content = index_html_path.read_text(encoding='utf-8')
    
    # 检查主题切换按钮
    if 'id="theme-toggle-btn"' not in content:
        print("❌ HTML 没有主题切换按钮")
        return False
    
    if '🌙' not in content and '☀️' not in content:
        print("❌ HTML 按钮没有主题emoji")
        return False
    
    print("✅ HTML 包含主题切换按钮")
    return True

def test_css_theme_variables():
    """测试 CSS 主题变量"""
    theme_css_path = Path('styles/theme.css')
    
    if not theme_css_path.exists():
        print("❌ theme.css 不存在")
        return False
    
    content = theme_css_path.read_text(encoding='utf-8')
    
    # 检查深色主题变量
    dark_vars = [
        '--bg-primary',
        '--text-primary',
        '--accent-blue',
        '--electric-field-color',
        '--magnetic-field-color'
    ]
    
    for var in dark_vars:
        if var not in content:
            print(f"❌ CSS 缺少变量: {var}")
            return False
    
    # 检查浅色主题
    if 'body.light-theme' not in content:
        print("❌ CSS 没有 light-theme 选择器")
        return False
    
    print("✅ CSS 包含完整的主题变量系统")
    return True

def test_canvas_rendering():
    """测试 Canvas 渲染器的主题支持"""
    grid_renderer_path = Path('js/rendering/GridRenderer.js')
    field_visualizer_path = Path('js/rendering/FieldVisualizer.js')
    
    if not grid_renderer_path.exists():
        print("❌ GridRenderer.js 不存在")
        return False
    
    if not field_visualizer_path.exists():
        print("❌ FieldVisualizer.js 不存在")
        return False
    
    grid_content = grid_renderer_path.read_text(encoding='utf-8')
    field_content = field_visualizer_path.read_text(encoding='utf-8')
    
    # 检查主题检测逻辑
    if 'dark-theme' not in grid_content:
        print("❌ GridRenderer 没有主题检测")
        return False
    
    if 'isDarkTheme' not in field_content:
        print("❌ FieldVisualizer 没有主题检测")
        return False
    
    print("✅ Canvas 渲染器支持主题切换")
    return True

def test_documentation():
    """测试文档"""
    theme_guide_path = Path('THEME-GUIDE.md')
    
    if not theme_guide_path.exists():
        print("❌ THEME-GUIDE.md 不存在")
        return False
    
    content = theme_guide_path.read_text(encoding='utf-8')
    
    required_sections = [
        '主题系统实现',
        'ThemeManager',
        'CSS主题变量',
        '使用流程',
        '测试指南'
    ]
    
    for section in required_sections:
        if section not in content:
            print(f"❌ 文档缺少章节: {section}")
            return False
    
    print("✅ 文档完整")
    return True

def main():
    """运行所有测试"""
    print("🧪 主题系统功能测试\n")
    print("=" * 50)
    
    tests = [
        ("ThemeManager 模块", test_theme_manager_imports),
        ("main.js 集成", test_main_js_integration),
        ("HTML UI 元素", test_html_ui_element),
        ("CSS 主题变量", test_css_theme_variables),
        ("Canvas 渲染支持", test_canvas_rendering),
        ("文档完整性", test_documentation),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n测试: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ 测试异常: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("\n📊 测试总结")
    print("-" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status}: {test_name}")
    
    print("-" * 50)
    print(f"总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！主题系统已准备就绪。")
        return 0
    else:
        print(f"\n⚠️  有 {total - passed} 个测试失败。")
        return 1

if __name__ == '__main__':
    sys.exit(main())
