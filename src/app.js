// Enhanced Pomodoro Timer Application
class PomodoroApp {
    constructor() {
        this.timer = null;
        this.settings = null;
        this.analytics = null;
        this.themes = null;
        
        this.elements = {};
        this.panels = {
            settings: null,
            analytics: null
        };
        
        this.init();
    }
    
    async init() {
        // Wait for DOM to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    async initialize() {
        try {
            // Initialize managers
            this.settings = new SettingsManager();
            this.analytics = new AnalyticsManager();
            this.themes = new ThemeManager();
            this.timer = new PomodoroTimer();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Load data
            await Promise.all([
                this.settings.load(),
                this.analytics.loadData(),
                this.themes.loadTheme()
            ]);
            
            // Initialize themes and create preset themes
            this.themes.createPresetThemes();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup timer callbacks
            this.setupTimerCallbacks();
            
            // Initialize UI
            this.initializeUI();
            
            // Show success message
            this.showToast('Pomodoro Timer Ready!', 'All systems loaded successfully', 'success');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Initialization Error', 'Failed to load application', 'error');
        }
    }
    
    cacheElements() {
        this.elements = {
            // Timer elements
            timerDisplay: document.getElementById('timerDisplay'),
            currentMode: document.getElementById('currentMode'),
            sessionInfo: document.getElementById('sessionInfo'),
            sessionCounter: document.getElementById('sessionCounter'),
            progressFill: document.getElementById('progressFill'),
            
            // Control buttons
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            
            // Header buttons
            alwaysOnTopBtn: document.getElementById('alwaysOnTopBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            analyticsBtn: document.getElementById('analyticsBtn'),
            
            // Stats
            todaySessionsCount: document.getElementById('todaySessionsCount'),
            streakCount: document.getElementById('streakCount'),
            totalMinutes: document.getElementById('totalMinutes'),
            
            // Panels
            settingsPanel: document.getElementById('settingsPanel'),
            analyticsPanel: document.getElementById('analyticsPanel'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            closeAnalyticsBtn: document.getElementById('closeAnalyticsBtn'),
            
            // Settings inputs
            focusTime: document.getElementById('focusTime'),
            shortBreakTime: document.getElementById('shortBreakTime'),
            longBreakTime: document.getElementById('longBreakTime'),
            sessionsBeforeLongBreak: document.getElementById('sessionsBeforeLongBreak'),
            autoStartBreaks: document.getElementById('autoStartBreaks'),
            autoStartPomodoros: document.getElementById('autoStartPomodoros'),
            soundEnabled: document.getElementById('soundEnabled'),
            notificationsEnabled: document.getElementById('notificationsEnabled'),
            dailyGoal: document.getElementById('dailyGoal'),
            weeklyGoal: document.getElementById('weeklyGoal'),
            
            // Data management
            exportDataBtn: document.getElementById('exportDataBtn'),
            importDataBtn: document.getElementById('importDataBtn'),
            resetStatsBtn: document.getElementById('resetStatsBtn'),
            importFileInput: document.getElementById('importFileInput'),
            
            // Containers
            themeSelector: document.getElementById('themeSelector'),
            todayProgress: document.getElementById('todayProgress'),
            weeklyChart: document.getElementById('weeklyChart'),
            statisticsGrid: document.getElementById('statisticsGrid'),
            sessionHistory: document.getElementById('sessionHistory'),
            toastContainer: document.getElementById('toastContainer')
        };
        
        this.panels.settings = this.elements.settingsPanel;
        this.panels.analytics = this.elements.analyticsPanel;
    }
    
    setupEventListeners() {
        // Timer controls
        this.elements.startBtn.addEventListener('click', () => this.timer.start());
        this.elements.pauseBtn.addEventListener('click', () => this.timer.pause());
        this.elements.resetBtn.addEventListener('click', () => this.timer.reset());
        
        // Header controls
        this.elements.alwaysOnTopBtn.addEventListener('click', () => this.toggleAlwaysOnTop());
        this.elements.settingsBtn.addEventListener('click', () => this.togglePanel('settings'));
        this.elements.analyticsBtn.addEventListener('click', () => this.togglePanel('analytics'));
        
        // Panel close buttons
        this.elements.closeSettingsBtn.addEventListener('click', () => this.closePanel('settings'));
        this.elements.closeAnalyticsBtn.addEventListener('click', () => this.closePanel('analytics'));
        
        // Settings inputs
        const settingsInputs = [
            'focusTime', 'shortBreakTime', 'longBreakTime', 'sessionsBeforeLongBreak',
            'autoStartBreaks', 'autoStartPomodoros', 'soundEnabled', 'notificationsEnabled',
            'dailyGoal', 'weeklyGoal'
        ];
        
        settingsInputs.forEach(id => {
            const element = this.elements[id];
            if (element) {
                element.addEventListener('change', (e) => this.handleSettingChange(id, e));
            }
        });
        
        // Data management
        this.elements.exportDataBtn.addEventListener('click', () => this.exportData());
        this.elements.importDataBtn.addEventListener('click', () => this.elements.importFileInput.click());
        this.elements.importFileInput.addEventListener('change', (e) => this.importData(e));
        this.elements.resetStatsBtn.addEventListener('click', () => this.resetStats());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Close panels when clicking outside
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }
    
    setupTimerCallbacks() {
        this.timer.onTick = () => this.updateTimerDisplay();
        this.timer.onComplete = (sessionData) => this.handleSessionComplete(sessionData);
        this.timer.onStateChange = () => this.updateUI();
    }
    
    initializeUI() {
        // Load settings into UI
        this.loadSettingsIntoUI();
        
        // Create theme selector
        this.createThemeSelector();
        
        // Update initial display
        this.updateUI();
        this.updateAnalytics();
    }
    
    loadSettingsIntoUI() {
        const settings = this.settings.get();
        
        // Load timer settings
        if (this.elements.focusTime) this.elements.focusTime.value = settings.focusTime || 25;
        if (this.elements.shortBreakTime) this.elements.shortBreakTime.value = settings.shortBreakTime || 5;
        if (this.elements.longBreakTime) this.elements.longBreakTime.value = settings.longBreakTime || 15;
        if (this.elements.sessionsBeforeLongBreak) this.elements.sessionsBeforeLongBreak.value = settings.sessionsBeforeLongBreak || 4;
        
        // Load behavior settings
        if (this.elements.autoStartBreaks) this.elements.autoStartBreaks.checked = settings.autoStartBreaks || false;
        if (this.elements.autoStartPomodoros) this.elements.autoStartPomodoros.checked = settings.autoStartPomodoros || false;
        if (this.elements.soundEnabled) this.elements.soundEnabled.checked = settings.soundEnabled !== false;
        if (this.elements.notificationsEnabled) this.elements.notificationsEnabled.checked = settings.notificationsEnabled !== false;
        
        // Load goals
        if (this.elements.dailyGoal) this.elements.dailyGoal.value = settings.dailyGoal || 8;
        if (this.elements.weeklyGoal) this.elements.weeklyGoal.value = settings.weeklyGoal || 40;
    }
    
    createThemeSelector() {
        if (this.elements.themeSelector) {
            const themePicker = this.themes.createThemePicker();
            this.elements.themeSelector.appendChild(themePicker);
        }
    }
    
    async handleSettingChange(settingName, event) {
        try {
            const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
            
            // Update settings
            await this.settings.update(settingName, value);
            
            // Update timer with new settings if it affects timer
            if (['focusTime', 'shortBreakTime', 'longBreakTime', 'sessionsBeforeLongBreak', 'autoStartBreaks', 'autoStartPomodoros'].includes(settingName)) {
                this.timer.updateSettings(this.settings.get());
            }
            
            // Update UI
            this.updateUI();
            
            this.showToast('Settings Updated', `${settingName} has been updated`, 'success');
        } catch (error) {
            console.error('Error updating setting:', error);
            this.showToast('Settings Error', 'Failed to update setting', 'error');
        }
    }
    
    updateTimerDisplay() {
        // Update timer display
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = this.timer.getFormattedTime();
        }
        
        // Update progress bar
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${this.timer.getProgress()}%`;
        }
        
        // Update page title
        document.title = `${this.timer.getFormattedTime()} - Enhanced Pomodoro Timer`;
    }
    
    updateUI() {
        this.updateTimerDisplay();
        this.updateModeDisplay();
        this.updateSessionCounter();
        this.updateControls();
        this.updateStats();
    }
    
    updateModeDisplay() {
        const modeInfo = this.timer.getCurrentModeInfo();
        
        if (this.elements.currentMode) {
            this.elements.currentMode.textContent = `${modeInfo.icon} ${modeInfo.title}`;
            this.elements.currentMode.className = `current-mode ${modeInfo.className}`;
        }
        
        if (this.elements.sessionInfo) {
            this.elements.sessionInfo.textContent = modeInfo.description;
        }
    }
    
    updateSessionCounter() {
        if (!this.elements.sessionCounter) return;
        
        this.elements.sessionCounter.innerHTML = '';
        
        for (let i = 1; i <= this.timer.settings.sessionsBeforeLongBreak; i++) {
            const dot = document.createElement('div');
            dot.className = 'session-dot';
            
            if (i < this.timer.currentSession) {
                dot.classList.add('completed');
            } else if (i === this.timer.currentSession && this.timer.currentMode === 'focus') {
                dot.classList.add('current');
            }
            
            this.elements.sessionCounter.appendChild(dot);
        }
    }
    
    updateControls() {
        const { isRunning, isPaused } = this.timer;
        
        if (this.elements.startBtn) {
            this.elements.startBtn.disabled = isRunning && !isPaused;
            this.elements.startBtn.textContent = isPaused ? '▶️ Resume' : '▶️ Start';
        }
        
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.disabled = !isRunning || isPaused;
        }
    }
    
    updateStats() {
        const stats = this.timer.getTodayStats();
        
        if (this.elements.todaySessionsCount) {
            this.elements.todaySessionsCount.textContent = stats.completedSessions;
        }
        
        if (this.elements.streakCount) {
            this.elements.streakCount.textContent = this.timer.stats.streakCount;
        }
        
        if (this.elements.totalMinutes) {
            this.elements.totalMinutes.textContent = this.timer.stats.totalMinutes;
        }
    }
    
    async handleSessionComplete(sessionData) {
        // Add session to analytics
        await this.analytics.addSession(sessionData);
        
        // Update analytics display
        this.updateAnalytics();
        
        // Show completion notification
        const message = sessionData.type === 'focus' ? 
            'Focus session completed!' : 
            'Break completed!';
        this.showToast('Session Complete', message, 'success');
    }
    
    updateAnalytics() {
        this.updateTodayProgress();
        this.updateWeeklyChart();
        this.updateStatistics();
        this.updateSessionHistory();
    }
    
    updateTodayProgress() {
        if (!this.elements.todayProgress) return;
        
        const insights = this.analytics.getProductivityInsights();
        const todayStats = insights.today;
        
        this.elements.todayProgress.innerHTML = `
            <div class="progress-summary">
                <div class="progress-ring">
                    <svg width="120" height="120">
                        <circle class="background" cx="60" cy="60" r="52"></circle>
                        <circle class="progress" cx="60" cy="60" r="52" 
                                stroke-dasharray="${2 * Math.PI * 52}" 
                                stroke-dashoffset="${2 * Math.PI * 52 * (1 - todayStats.progress / 100)}"></circle>
                    </svg>
                    <div class="progress-text">
                        <div class="progress-value">${Math.round(todayStats.progress)}%</div>
                        <div class="progress-label">Daily Goal</div>
                    </div>
                </div>
                <div class="today-details">
                    <p><strong>${todayStats.completedSessions}</strong> sessions completed</p>
                    <p><strong>${todayStats.totalMinutes}</strong> minutes focused</p>
                    <p><strong>${todayStats.remaining}</strong> sessions remaining</p>
                </div>
            </div>
        `;
    }
    
    updateWeeklyChart() {
        if (!this.elements.weeklyChart) return;
        
        const pattern = this.analytics.getDailyPattern(7);
        const chartElement = this.analytics.createDailyChart(pattern);
        
        this.elements.weeklyChart.innerHTML = '';
        this.elements.weeklyChart.appendChild(chartElement);
    }
    
    updateStatistics() {
        if (!this.elements.statisticsGrid) return;
        
        const insights = this.analytics.getProductivityInsights();
        
        this.elements.statisticsGrid.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${insights.totalSessions}</div>
                    <div class="stat-label">Total Sessions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${insights.totalHours}h</div>
                    <div class="stat-label">Total Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${insights.currentStreak}</div>
                    <div class="stat-label">Current Streak</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${insights.averageDailySessions}</div>
                    <div class="stat-label">Avg Daily</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${insights.mostProductiveDay}</div>
                    <div class="stat-label">Best Day</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${insights.longestStreak}</div>
                    <div class="stat-label">Best Streak</div>
                </div>
            </div>
        `;
    }
    
    updateSessionHistory() {
        if (!this.elements.sessionHistory) return;
        
        const recentSessions = this.analytics.sessionHistory.slice(-10).reverse();
        
        this.elements.sessionHistory.innerHTML = recentSessions.map(session => `
            <div class="session-item ${session.completed ? 'completed' : 'interrupted'}">
                <div class="session-type">${session.type === 'focus' ? '🎯' : session.type === 'shortBreak' ? '☕' : '🌟'}</div>
                <div class="session-details">
                    <div class="session-duration">${session.duration} min</div>
                    <div class="session-date">${new Date(session.timestamp || session.date).toLocaleDateString()}</div>
                </div>
                <div class="session-status">${session.completed ? '✅' : '⏸️'}</div>
            </div>
        `).join('');
    }
    
    // Panel management
    togglePanel(panelName) {
        const panel = this.panels[panelName];
        if (panel) {
            if (panel.classList.contains('active')) {
                this.closePanel(panelName);
            } else {
                // Close other panels first
                Object.keys(this.panels).forEach(name => {
                    if (name !== panelName) this.closePanel(name);
                });
                panel.classList.add('active');
                
                // Update analytics when opening analytics panel
                if (panelName === 'analytics') {
                    this.updateAnalytics();
                }
            }
        }
    }
    
    closePanel(panelName) {
        const panel = this.panels[panelName];
        if (panel) {
            panel.classList.remove('active');
        }
    }
    
    handleOutsideClick(event) {
        // Close panels if clicking outside
        Object.keys(this.panels).forEach(panelName => {
            const panel = this.panels[panelName];
            if (panel && panel.classList.contains('active') && !panel.contains(event.target)) {
                // Check if click is on the toggle button
                const toggleBtn = panelName === 'settings' ? this.elements.settingsBtn : this.elements.analyticsBtn;
                if (!toggleBtn.contains(event.target)) {
                    this.closePanel(panelName);
                }
            }
        });
    }
    
    async toggleAlwaysOnTop() {
        try {
            const newState = await window.electronAPI.toggleAlwaysOnTop();
            const icon = newState ? '📌' : '📌';
            this.elements.alwaysOnTopBtn.style.opacity = newState ? '1' : '0.6';
            this.showToast('Always on Top', `Always on top ${newState ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            console.error('Error toggling always on top:', error);
        }
    }
    
    // Data management
    async exportData() {
        try {
            const data = await this.analytics.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `pomodoro-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showToast('Export Complete', 'Data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Export Failed', 'Failed to export data', 'error');
        }
    }
    
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const result = await this.settings.importSettings(data);
            if (result.success) {
                // Reload the app with new data
                await this.initialize();
                this.showToast('Import Complete', 'Data imported successfully', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('Import Failed', 'Failed to import data', 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    async resetStats() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            try {
                await this.analytics.clearHistory();
                await this.analytics.updateStats({ completedSessions: 0, totalMinutes: 0, streakCount: 0 });
                this.timer.stats = { completedSessions: 0, totalMinutes: 0, streakCount: 0, dailyGoal: 8, weeklyGoal: 40 };
                
                this.updateUI();
                this.updateAnalytics();
                
                this.showToast('Stats Reset', 'All statistics have been reset', 'success');
            } catch (error) {
                console.error('Reset error:', error);
                this.showToast('Reset Failed', 'Failed to reset statistics', 'error');
            }
        }
    }
    
    // Keyboard shortcuts
    handleKeyboard(event) {
        // Ignore if user is typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.timer.toggle();
                break;
            case 'KeyR':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.timer.reset();
                }
                break;
            case 'KeyS':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.togglePanel('settings');
                }
                break;
            case 'KeyA':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.togglePanel('analytics');
                }
                break;
            case 'Escape':
                this.closePanel('settings');
                this.closePanel('analytics');
                break;
        }
    }
    
    // Toast notifications
    showToast(title, message, type = 'info') {
        if (!this.elements.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the app
const app = new PomodoroApp();