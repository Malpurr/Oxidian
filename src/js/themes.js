// Oxidian — Theme Management
const { invoke } = window.__TAURI__.core;

const BUILT_IN_THEMES = {
    dark: {
        '--bg-ribbon': '#141419',
        '--bg-sidebar': '#1a1a24',
        '--bg-primary': '#1e1e2e',
        '--bg-secondary': '#1a1a24',
        '--bg-tertiary': '#141419',
        '--bg-surface': '#2a2a3c',
        '--bg-hover': '#2e2e42',
        '--bg-active': '#3e3e56',
        '--bg-tab': '#1e1e2e',
        '--bg-tab-active': '#262636',
        '--text-primary': '#dcddde',
        '--text-secondary': '#a9aaab',
        '--text-muted': '#686a6e',
        '--text-faint': '#4a4c50',
        '--text-accent': '#7f6df2',
        '--text-accent-hover': '#8b7cf3',
        '--text-green': '#a6e3a1',
        '--text-yellow': '#f9e2af',
        '--text-red': '#f38ba8',
        '--text-purple': '#cba6f7',
        '--text-teal': '#94e2d5',
        '--text-pink': '#f5c2e7',
        '--text-blue': '#89b4fa',
        '--text-orange': '#fab387',
        '--border-color': '#2a2a3c',
        '--border-light': '#353548',
    },
    light: {
        '--bg-ribbon': '#e8e8ee',
        '--bg-sidebar': '#f0f0f5',
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f5f5fa',
        '--bg-tertiary': '#e8e8ee',
        '--bg-surface': '#eeeef3',
        '--bg-hover': '#e2e2ea',
        '--bg-active': '#d5d5e0',
        '--bg-tab': '#f0f0f5',
        '--bg-tab-active': '#ffffff',
        '--text-primary': '#1e1e2e',
        '--text-secondary': '#444455',
        '--text-muted': '#888899',
        '--text-faint': '#aaaabc',
        '--text-accent': '#6c5ce7',
        '--text-accent-hover': '#5a4bd5',
        '--text-green': '#2ecc71',
        '--text-yellow': '#f39c12',
        '--text-red': '#e74c3c',
        '--text-purple': '#9b59b6',
        '--text-teal': '#1abc9c',
        '--text-pink': '#e91e8c',
        '--text-blue': '#3498db',
        '--text-orange': '#e67e22',
        '--border-color': '#d5d5e0',
        '--border-light': '#e0e0ea',
    },
    nord: {
        '--bg-ribbon': '#2e3440',
        '--bg-sidebar': '#3b4252',
        '--bg-primary': '#2e3440',
        '--bg-secondary': '#3b4252',
        '--bg-tertiary': '#2e3440',
        '--bg-surface': '#434c5e',
        '--bg-hover': '#434c5e',
        '--bg-active': '#4c566a',
        '--bg-tab': '#3b4252',
        '--bg-tab-active': '#2e3440',
        '--text-primary': '#eceff4',
        '--text-secondary': '#d8dee9',
        '--text-muted': '#7b88a1',
        '--text-faint': '#616e88',
        '--text-accent': '#88c0d0',
        '--text-accent-hover': '#8fbcbb',
        '--text-green': '#a3be8c',
        '--text-yellow': '#ebcb8b',
        '--text-red': '#bf616a',
        '--text-purple': '#b48ead',
        '--text-teal': '#8fbcbb',
        '--text-pink': '#b48ead',
        '--text-blue': '#81a1c1',
        '--text-orange': '#d08770',
        '--border-color': '#434c5e',
        '--border-light': '#4c566a',
    },
    solarized: {
        '--bg-ribbon': '#002b36',
        '--bg-sidebar': '#073642',
        '--bg-primary': '#002b36',
        '--bg-secondary': '#073642',
        '--bg-tertiary': '#002b36',
        '--bg-surface': '#073642',
        '--bg-hover': '#0a4050',
        '--bg-active': '#1a5060',
        '--bg-tab': '#073642',
        '--bg-tab-active': '#002b36',
        '--text-primary': '#fdf6e3',
        '--text-secondary': '#eee8d5',
        '--text-muted': '#839496',
        '--text-faint': '#657b83',
        '--text-accent': '#268bd2',
        '--text-accent-hover': '#2aa198',
        '--text-green': '#859900',
        '--text-yellow': '#b58900',
        '--text-red': '#dc322f',
        '--text-purple': '#6c71c4',
        '--text-teal': '#2aa198',
        '--text-pink': '#d33682',
        '--text-blue': '#268bd2',
        '--text-orange': '#cb4b16',
        '--border-color': '#094959',
        '--border-light': '#0a5468',
    },
};

export class ThemeManager {
    constructor(app) {
        this.app = app;
        this.currentTheme = 'dark';
        this.customStyleEl = null;
    }

    async init() {
        // Create style element for custom themes
        this.customStyleEl = document.createElement('style');
        this.customStyleEl.id = 'custom-theme-style';
        document.head.appendChild(this.customStyleEl);
    }

    applyTheme(themeName) {
        this.currentTheme = themeName;
        const root = document.documentElement;

        if (BUILT_IN_THEMES[themeName]) {
            // Clear custom CSS
            this.customStyleEl.textContent = '';
            const vars = BUILT_IN_THEMES[themeName];
            for (const [prop, value] of Object.entries(vars)) {
                root.style.setProperty(prop, value);
            }
            // Update color-scheme for native elements (scrollbars, inputs, etc.)
            document.documentElement.style.colorScheme = themeName === 'light' ? 'light' : 'dark';
        } else {
            // Try loading custom theme
            this.loadCustomTheme(themeName);
        }
    }

    async loadCustomTheme(name) {
        try {
            const css = await invoke('load_custom_theme', { name });
            this.customStyleEl.textContent = css;
        } catch (err) {
            console.error('Failed to load custom theme:', err);
        }
    }

    setAccentColor(color) {
        document.documentElement.style.setProperty('--text-accent', color);
        // Generate hover variant
        document.documentElement.style.setProperty('--text-accent-hover', color);
    }

    getBuiltInThemeNames() {
        return Object.keys(BUILT_IN_THEMES);
    }

    async getCustomThemeNames() {
        try {
            return await invoke('list_custom_themes');
        } catch {
            return [];
        }
    }
}
