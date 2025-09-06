class SettingsManager {
    constructor() {
        this.defaultSettings = {
            focusTime: 25,
            shortBreakTime: 5,
            longBreakTime: 15,
            sessionsBeforeLongBreak: 4,
            autoStartBreaks: false,
            autoStartPomodoros: false,
            alwaysOnTop: false,
            theme: 'auto',
            soundEnabled: true,
            notificationsEnabled: true,
            minimizeToTray: true
        };
        
        this.currentSettings = { ...this.defaultSettings };
        this.callbacks = [];
    }
    
    async load() {
        try {
            const settings = await window.electronAPI.getSettings();
            this.currentSettings = { ...this.defaultSettings, ...settings };
            return this.currentSettings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.defaultSettings;
        }
    }
    
    async save(newSettings) {
        try {
            const validatedSettings = this.validateSettings(newSettings);
            this.currentSettings = { ...this.currentSettings, ...validatedSettings };
            
            await window.electronAPI.saveSettings(this.currentSettings);
            this.notifyCallbacks('settingsChanged', this.currentSettings);
            
            return this.currentSettings;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }
    
    validateSettings(settings) {
        const validated = {};
        
        // Validate numeric settings
        const numericSettings = {
            focusTime: { min: 1, max: 120 },
            shortBreakTime: { min: 1, max: 60 },
            longBreakTime: { min: 1, max: 120 },
            sessionsBeforeLongBreak: { min: 2, max: 20 }
        };
        
        Object.keys(numericSettings).forEach(key => {
            if (settings[key] !== undefined) {
                const value = parseInt(settings[key]);
                const { min, max } = numericSettings[key];
                
                if (!isNaN(value) && value >= min && value <= max) {
                    validated[key] = value;
                } else {
                    console.warn(`Invalid value for ${key}: ${settings[key]}. Using default.`);
                }
            }
        });
        
        // Validate boolean settings
        const booleanSettings = [
            'autoStartBreaks',
            'autoStartPomodoros',
            'alwaysOnTop',
            'soundEnabled',
            'notificationsEnabled',
            'minimizeToTray'
        ];
        
        booleanSettings.forEach(key => {
            if (settings[key] !== undefined) {
                validated[key] = Boolean(settings[key]);
            }
        });
        
        // Validate theme setting
        if (settings.theme && ['light', 'dark', 'auto'].includes(settings.theme)) {
            validated.theme = settings.theme;
        }
        
        return validated;
    }
    
    get(key) {
        return key ? this.currentSettings[key] : this.currentSettings;
    }
    
    async update(key, value) {
        const newSettings = { [key]: value };
        return await this.save(newSettings);
    }
    
    async reset() {
        this.currentSettings = { ...this.defaultSettings };
        await window.electronAPI.saveSettings(this.currentSettings);
        this.notifyCallbacks('settingsReset', this.currentSettings);
        return this.currentSettings;
    }
    
    async exportSettings() {
        try {
            const data = await window.electronAPI.exportData();
            return data;
        } catch (error) {
            console.error('Error exporting settings:', error);
            throw error;
        }
    }
    
    async importSettings(data) {
        try {
            const result = await window.electronAPI.importData(data);
            if (result.success) {
                await this.load();
                this.notifyCallbacks('settingsImported', this.currentSettings);
            }
            return result;
        } catch (error) {
            console.error('Error importing settings:', error);
            throw error;
        }
    }
    
    // Event system
    onSettingsChange(callback) {
        this.callbacks.push({ event: 'settingsChanged', callback });
    }
    
    onSettingsReset(callback) {
        this.callbacks.push({ event: 'settingsReset', callback });
    }
    
    onSettingsImported(callback) {
        this.callbacks.push({ event: 'settingsImported', callback });
    }
    
    removeCallback(callback) {
        this.callbacks = this.callbacks.filter(cb => cb.callback !== callback);
    }
    
    notifyCallbacks(event, data) {
        this.callbacks
            .filter(cb => cb.event === event)
            .forEach(cb => cb.callback(data));
    }
    
    // UI helpers
    createSettingElement(key, type, options = {}) {
        const setting = this.currentSettings[key];
        const container = document.createElement('div');
        container.className = 'setting-group';
        
        const label = document.createElement('label');
        label.textContent = options.label || this.getSettingLabel(key);
        label.setAttribute('for', `setting-${key}`);
        
        let input;
        
        switch (type) {
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.value = setting;
                input.min = options.min || 1;
                input.max = options.max || 120;
                input.addEventListener('change', async (e) => {
                    await this.update(key, parseInt(e.target.value));
                });
                break;
                
            case 'boolean':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = setting;
                input.addEventListener('change', async (e) => {
                    await this.update(key, e.target.checked);
                });
                break;
                
            case 'select':
                input = document.createElement('select');
                options.options.forEach(option => {
                    const optElement = document.createElement('option');
                    optElement.value = option.value;
                    optElement.textContent = option.label;
                    optElement.selected = option.value === setting;
                    input.appendChild(optElement);
                });
                input.addEventListener('change', async (e) => {
                    await this.update(key, e.target.value);
                });
                break;
        }
        
        input.id = `setting-${key}`;
        input.className = 'setting-input';
        
        container.appendChild(label);
        container.appendChild(input);
        
        if (options.description) {
            const desc = document.createElement('small');
            desc.className = 'setting-description';
            desc.textContent = options.description;
            container.appendChild(desc);
        }
        
        return container;
    }
    
    getSettingLabel(key) {
        const labels = {
            focusTime: 'Focus Session (minutes)',
            shortBreakTime: 'Short Break (minutes)',
            longBreakTime: 'Long Break (minutes)',
            sessionsBeforeLongBreak: 'Sessions before Long Break',
            autoStartBreaks: 'Auto-start Breaks',
            autoStartPomodoros: 'Auto-start Focus Sessions',
            alwaysOnTop: 'Always on Top',
            theme: 'Theme',
            soundEnabled: 'Enable Sounds',
            notificationsEnabled: 'Enable Notifications',
            minimizeToTray: 'Minimize to Tray'
        };
        
        return labels[key] || key;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
} else {
    window.SettingsManager = SettingsManager;
}