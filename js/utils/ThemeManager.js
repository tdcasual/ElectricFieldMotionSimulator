/**
 * 主题管理器 - 处理深色/浅色模式切换
 */

export class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.init();
    }
    
    init() {
        // 应用保存的主题
        this.applyTheme(this.currentTheme);
        
        // 监听系统主题变化
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery?.addEventListener?.('change', () => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }
    
    /**
     * 从localStorage加载主题设置
     */
    loadTheme() {
        const storage = this.getStorage();
        const saved = storage?.getItem?.('theme-preference');
        if (saved) return saved;
        
        // 检测系统偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')?.matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    /**
     * 保存主题设置
     */
    saveTheme(theme) {
        const storage = this.getStorage();
        storage?.setItem?.('theme-preference', theme);
        this.currentTheme = theme;
    }

    getStorage() {
        try {
            const storage = globalThis.localStorage;
            if (!storage) return null;
            if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return null;
            return storage;
        } catch {
            return null;
        }
    }
    
    /**
     * 应用主题
     */
    applyTheme(theme) {
        const html = document.documentElement;
        const body = document.body;
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        
        if (theme === 'auto') {
            // 自动根据系统设置
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = isDark ? 'dark' : 'light';
        }
        
        if (theme === 'dark') {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            html.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            html.setAttribute('data-theme', 'light');
            if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
        }
        
        this.currentTheme = theme;
    }
    
    /**
     * 切换主题
     */
    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.saveTheme(newTheme);
        this.applyTheme(newTheme);
    }
    
    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
}
