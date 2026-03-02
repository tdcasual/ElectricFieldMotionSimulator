import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeManager } from '../src/engine/runtimeEngineBridge';

function installLocalStorageMock() {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem(key: string) {
        return storage.has(key) ? storage.get(key)! : null;
      },
      setItem(key: string, value: string) {
        storage.set(key, String(value));
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      clear() {
        storage.clear();
      }
    }
  });
}

function installMatchMediaMock(matches = false) {
  const listener = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: listener,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

describe('ThemeManager', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.className = '';
    document.body.innerHTML = '<button id="theme-toggle-btn">🌙 主题</button>';
    installLocalStorageMock();
    globalThis.localStorage.clear();
    installMatchMediaMock(false);
  });

  it('keeps explicit theme label text when initializing', () => {
    const manager = new ThemeManager();
    expect(manager.getCurrentTheme()).toBe('light');
    expect(document.getElementById('theme-toggle-btn')?.textContent).toContain('主题');
  });

  it('keeps explicit theme label text when toggling', () => {
    const manager = new ThemeManager();
    manager.toggle();
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(document.getElementById('theme-toggle-btn')?.textContent).toContain('主题');
  });
});
