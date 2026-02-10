// Oxidian — Theme Management
import { invoke } from './tauri-bridge.js';

const BUILT_IN_THEMES = {
    system: 'System',
    dark: 'Dark',
    light: 'Light', 
    'high-contrast': 'High Contrast',
    nord: 'Nord',
    solarized: 'Solarized'
};

export class ThemeManager {
    constructor(app) {
        this.app = app;
        this.currentTheme = 'system';
        this.systemPreference = this.getSystemPreference();
        this.customStyleEl = null;
        this.mediaQuery = null;
    }

    async init() {
        // Create style element for custom themes
        this.customStyleEl = document.createElement('style');
        this.customStyleEl.id = 'custom-theme-style';
        document.head.appendChild(this.customStyleEl);

        // Listen for system theme changes
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery.addEventListener('change', () => {
            this.systemPreference = this.getSystemPreference();
            if (this.currentTheme === 'system') {
                this.applyActualTheme(this.systemPreference);
            }
        });
    }

    getSystemPreference() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    applyTheme(themeName) {
        this.currentTheme = themeName;
        
        if (themeName === 'system') {
            this.applyActualTheme(this.systemPreference);
        } else if (BUILT_IN_THEMES[themeName]) {
            this.applyActualTheme(themeName);
        } else {
            // Try loading custom theme
            this.loadCustomTheme(themeName);
        }
    }

    applyActualTheme(actualTheme) {
        const root = document.documentElement;
        
        // Clear custom CSS when applying built-in themes
        if (BUILT_IN_THEMES[actualTheme]) {
            this.customStyleEl.textContent = '';
            root.setAttribute('data-theme', actualTheme);
        }
    }

    async loadCustomTheme(name) {
        try {
            const css = await invoke('load_custom_theme', { name });
            this.customStyleEl.textContent = css;
            document.documentElement.setAttribute('data-theme', 'custom');
        } catch (err) {
            console.error('Failed to load custom theme:', err);
            // Fallback to dark theme
            this.applyActualTheme('dark');
        }
    }

    setAccentColor(color) {
        document.documentElement.style.setProperty('--text-accent', color);
        // Generate hover variant (slightly lighter)
        const hoverColor = this.lightenColor(color, 10);
        document.documentElement.style.setProperty('--text-accent-hover', hoverColor);
        // Update focus border
        document.documentElement.style.setProperty('--border-focus', color);
        // Update selection background
        const selectionColor = this.hexToRgba(color, 0.15);
        document.documentElement.style.setProperty('--bg-selection', selectionColor);
    }

    lightenColor(color, percent) {
        // Simple color lightening - convert hex to HSL, increase lightness, convert back
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const hsl = this.rgbToHsl(r, g, b);
        hsl[2] = Math.min(1, hsl[2] + percent / 100);
        const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
        
        return `#${Math.round(rgb[0]).toString(16).padStart(2, '0')}${Math.round(rgb[1]).toString(16).padStart(2, '0')}${Math.round(rgb[2]).toString(16).padStart(2, '0')}`;
    }

    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [r * 255, g * 255, b * 255];
    }

    getBuiltInThemeNames() {
        return Object.keys(BUILT_IN_THEMES);
    }

    getBuiltInThemeLabels() {
        return BUILT_IN_THEMES;
    }

    async getCustomThemeNames() {
        try {
            return await invoke('list_custom_themes');
        } catch {
            return [];
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getSystemPreferenceTheme() {
        return this.systemPreference;
    }
}
