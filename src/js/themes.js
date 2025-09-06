class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.themes = {
            light: {
                name: 'Light',
                colors: {
                    background: '#ffffff',
                    surface: '#f8f9fa',
                    primary: '#3498db',
                    secondary: '#6c757d',
                    accent: '#e74c3c',
                    success: '#27ae60',
                    warning: '#f39c12',
                    text: '#2c3e50',
                    textSecondary: '#7f8c8d',
                    border: '#dee2e6'
                }
            },
            dark: {
                name: 'Dark',
                colors: {
                    background: '#1a1a1a',
                    surface: '#2d2d2d',
                    primary: '#3498db',
                    secondary: '#adb5bd',
                    accent: '#e74c3c',
                    success: '#27ae60',
                    warning: '#f39c12',
                    text: '#ffffff',
                    textSecondary: '#adb5bd',
                    border: '#495057'
                }
            }
        };
        
        this.customThemes = {};
        this.init();
    }
    
    init() {
        this.loadTheme();
        this.setupMediaQuery();
    }
    
    async loadTheme() {
        try {
            const settings = await window.electronAPI.getSettings();
            this.currentTheme = settings.theme || 'auto';
            this.applyTheme(this.currentTheme);
        } catch (error) {
            console.error('Error loading theme:', error);
            this.applyTheme('auto');
        }
    }
    
    setupMediaQuery() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
            if (this.currentTheme === 'auto') {
                this.applyTheme('auto');
            }
        });
    }
    
    applyTheme(themeName) {
        let theme;
        
        if (themeName === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? this.themes.dark : this.themes.light;
        } else {
            theme = this.themes[themeName] || this.customThemes[themeName] || this.themes.light;
        }
        
        this.setThemeColors(theme.colors);
        this.updateThemeClass(themeName);
        this.currentTheme = themeName;
    }
    
    setThemeColors(colors) {
        const root = document.documentElement;
        
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
        
        // Update specific component colors based on theme
        this.updateComponentColors(colors);
    }
    
    updateComponentColors(colors) {
        // Update CSS custom properties for components
        const root = document.documentElement;
        
        // Focus mode colors
        root.style.setProperty('--focus-mode-bg', colors.accent);
        root.style.setProperty('--focus-mode-text', '#ffffff');
        
        // Break mode colors
        root.style.setProperty('--break-mode-bg', colors.success);
        root.style.setProperty('--break-mode-text', '#ffffff');
        
        // Long break mode colors
        root.style.setProperty('--long-break-mode-bg', colors.primary);
        root.style.setProperty('--long-break-mode-text', '#ffffff');
        
        // Button colors
        root.style.setProperty('--btn-primary-bg', colors.primary);
        root.style.setProperty('--btn-success-bg', colors.success);
        root.style.setProperty('--btn-warning-bg', colors.warning);
        root.style.setProperty('--btn-danger-bg', colors.accent);
        
        // Background gradient
        if (colors.background === '#ffffff') {
            root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        } else {
            root.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)');
        }
    }
    
    updateThemeClass(themeName) {
        const body = document.body;
        
        // Remove existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Add new theme class
        if (themeName === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            body.classList.add(`theme-${themeName}`);
        }
    }
    
    async setTheme(themeName) {
        try {
            this.applyTheme(themeName);
            await window.electronAPI.saveSettings({ theme: themeName });
            return true;
        } catch (error) {
            console.error('Error setting theme:', error);
            return false;
        }
    }
    
    createCustomTheme(name, colors) {
        this.customThemes[name] = {
            name: name,
            colors: { ...this.themes.light.colors, ...colors }
        };
    }
    
    getAvailableThemes() {
        return {
            ...this.themes,
            ...this.customThemes
        };
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    // Preset theme variations
    createPresetThemes() {
        // Pomodoro Red theme
        this.createCustomTheme('pomodoro', {
            primary: '#e74c3c',
            accent: '#c0392b',
            success: '#27ae60',
            warning: '#f39c12',
            background: '#fdf2f2',
            surface: '#fceaea',
            text: '#2c3e50'
        });
        
        // Nature Green theme
        this.createCustomTheme('nature', {
            primary: '#27ae60',
            accent: '#2ecc71',
            success: '#16a085',
            warning: '#f39c12',
            background: '#f0f8f0',
            surface: '#e8f5e8',
            text: '#2c3e50'
        });
        
        // Ocean Blue theme
        this.createCustomTheme('ocean', {
            primary: '#3498db',
            accent: '#2980b9',
            success: '#1abc9c',
            warning: '#f39c12',
            background: '#f0f8ff',
            surface: '#e6f3ff',
            text: '#2c3e50'
        });
        
        // High Contrast theme
        this.createCustomTheme('contrast', {
            primary: '#000000',
            accent: '#ffffff',
            success: '#00ff00',
            warning: '#ffff00',
            background: '#ffffff',
            surface: '#f0f0f0',
            text: '#000000',
            textSecondary: '#333333',
            border: '#000000'
        });
    }
    
    // Theme picker UI
    createThemePicker() {
        const container = document.createElement('div');
        container.className = 'theme-picker';
        
        const title = document.createElement('h4');
        title.textContent = 'Theme';
        container.appendChild(title);
        
        const themeGrid = document.createElement('div');
        themeGrid.className = 'theme-grid';
        
        // Add built-in themes
        Object.entries(this.getAvailableThemes()).forEach(([key, theme]) => {
            const themeOption = this.createThemeOption(key, theme);
            themeGrid.appendChild(themeOption);
        });
        
        container.appendChild(themeGrid);
        return container;
    }
    
    createThemeOption(key, theme) {
        const option = document.createElement('div');
        option.className = 'theme-option';
        
        if (this.currentTheme === key) {
            option.classList.add('active');
        }
        
        const preview = document.createElement('div');
        preview.className = 'theme-preview';
        
        // Create color swatches
        const swatches = ['background', 'primary', 'accent', 'success'];
        swatches.forEach(colorKey => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = theme.colors[colorKey];
            preview.appendChild(swatch);
        });
        
        const label = document.createElement('div');
        label.className = 'theme-label';
        label.textContent = theme.name;
        
        option.appendChild(preview);
        option.appendChild(label);
        
        option.addEventListener('click', async () => {
            await this.setTheme(key);
            
            // Update active state
            document.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.remove('active');
            });
            option.classList.add('active');
        });
        
        return option;
    }
    
    // CSS generation for themes
    generateThemeCSS() {
        return `
            :root {
                --color-background: ${this.themes.light.colors.background};
                --color-surface: ${this.themes.light.colors.surface};
                --color-primary: ${this.themes.light.colors.primary};
                --color-secondary: ${this.themes.light.colors.secondary};
                --color-accent: ${this.themes.light.colors.accent};
                --color-success: ${this.themes.light.colors.success};
                --color-warning: ${this.themes.light.colors.warning};
                --color-text: ${this.themes.light.colors.text};
                --color-text-secondary: ${this.themes.light.colors.textSecondary};
                --color-border: ${this.themes.light.colors.border};
            }
            
            .theme-picker {
                margin: 20px 0;
            }
            
            .theme-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 15px;
                margin-top: 10px;
            }
            
            .theme-option {
                cursor: pointer;
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .theme-option:hover {
                border-color: var(--color-primary);
            }
            
            .theme-option.active {
                border-color: var(--color-primary);
                background-color: var(--color-surface);
            }
            
            .theme-preview {
                display: flex;
                height: 30px;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .color-swatch {
                flex: 1;
                height: 100%;
            }
            
            .theme-label {
                font-size: 0.9rem;
                font-weight: 500;
                color: var(--color-text);
            }
        `;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} else {
    window.ThemeManager = ThemeManager;
}