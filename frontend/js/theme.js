/**
 * theme.js — Theme Management System
 * Supports Light & Cyber Dark Mode with system preference detection and smooth transition.
 */
const ThemeManager = (() => {
  const THEME_STORAGE_KEY = 'airw_theme_mode';

  function getSavedTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Default to dark mode for 2025 cyber spatial aesthetic
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme, animate = true) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Update theme toggle buttons across DOM
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
      }
      btn.setAttribute('title', theme === 'dark' ? 'Switch to Warm Light Theme' : 'Switch to Cyber Dark Theme');
    });

    // Notify any listening modules (e.g. Chart.js recolor)
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: { theme } }));
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || getSavedTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function init() {
    const initialTheme = getSavedTheme();
    applyTheme(initialTheme, false);

    // Global keyboard shortcut: Ctrl+T or Cmd+T for instant theme toggle
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      }
    });

    // Listen to OS theme changes if user hasn't explicitly set one
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  // Self-execute on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    getTheme: () => document.documentElement.getAttribute('data-theme') || getSavedTheme(),
    setTheme: applyTheme,
    toggle: toggleTheme
  };
})();
