class PomodoroTimer {
    constructor() {
        // Default settings
        this.settings = {
            focusTime: 25,
            shortBreakTime: 5,
            longBreakTime: 15,
            sessionsBeforeLongBreak: 4,
            autoStartBreaks: false,
            autoStartPomodoros: false,
            soundEnabled: true,
            notificationsEnabled: true
        };
        
        // Timer state
        this.currentSession = 1;
        this.isRunning = false;
        this.isPaused = false;
        this.currentMode = 'focus'; // 'focus', 'shortBreak', 'longBreak'
        this.timeLeft = 0;
        this.totalTime = 0;
        this.timer = null;
        
        // Stats
        this.stats = {
            completedSessions: 0,
            totalMinutes: 0,
            streakCount: 0,
            dailyGoal: 8,
            weeklyGoal: 40
        };
        
        // Session tracking
        this.sessionStartTime = null;
        this.interruptions = 0;
        
        // Callbacks
        this.onTick = null;
        this.onComplete = null;
        this.onStateChange = null;
        
        this.initialize();
    }
    
    async initialize() {
        await this.loadSettings();
        await this.loadStats();
        this.reset();
        this.setupEventListeners();
    }
    
    async loadSettings() {
        try {
            const savedSettings = await window.electronAPI.getSettings();
            this.settings = { ...this.settings, ...savedSettings };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async loadStats() {
        try {
            const savedStats = await window.electronAPI.getStats();
            this.stats = { ...this.stats, ...savedStats };
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    async saveSettings() {
        try {
            await window.electronAPI.saveSettings(this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    async saveStats() {
        try {
            await window.electronAPI.saveStats(this.stats);
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }
    
    setupEventListeners() {
        // Global shortcuts
        window.electronAPI.onGlobalShortcutToggle(() => {
            this.toggle();
        });
        
        window.electronAPI.onGlobalShortcutReset(() => {
            this.reset();
        });
        
        // Tray controls
        window.electronAPI.onTrayTimerToggle(() => {
            this.toggle();
        });
        
        window.electronAPI.onTrayTimerReset(() => {
            this.reset();
        });
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        // If timer is not running, update current session time
        if (!this.isRunning && this.currentMode === 'focus') {
            this.timeLeft = this.settings.focusTime * 60;
            this.totalTime = this.settings.focusTime * 60;
        } else if (!this.isRunning && this.currentMode === 'shortBreak') {
            this.timeLeft = this.settings.shortBreakTime * 60;
            this.totalTime = this.settings.shortBreakTime * 60;
        } else if (!this.isRunning && this.currentMode === 'longBreak') {
            this.timeLeft = this.settings.longBreakTime * 60;
            this.totalTime = this.settings.longBreakTime * 60;
        }
        
        if (this.onStateChange) this.onStateChange();
    }
    
    start() {
        if (this.isPaused) {
            this.isPaused = false;
        } else if (!this.isRunning) {
            this.isRunning = true;
            this.sessionStartTime = new Date();
        }
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTray();
            
            if (this.onTick) this.onTick();
            
            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
        
        if (this.onStateChange) this.onStateChange();
    }
    
    pause() {
        this.isPaused = true;
        this.interruptions++;
        clearInterval(this.timer);
        if (this.onStateChange) this.onStateChange();
    }
    
    toggle() {
        if (this.isRunning && !this.isPaused) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.interruptions = 0;
        clearInterval(this.timer);
        
        this.currentSession = 1;
        this.currentMode = 'focus';
        this.timeLeft = this.settings.focusTime * 60;
        this.totalTime = this.settings.focusTime * 60;
        this.sessionStartTime = null;
        
        this.updateTray();
        if (this.onStateChange) this.onStateChange();
    }
    
    async completeSession() {
        clearInterval(this.timer);
        this.isRunning = false;
        this.isPaused = false;
        
        const sessionData = {
            date: new Date().toISOString().split('T')[0],
            type: this.currentMode,
            duration: Math.floor((this.totalTime - this.timeLeft) / 60),
            completed: this.timeLeft <= 0,
            interruptions: this.interruptions,
            startTime: this.sessionStartTime
        };
        
        // Save session to history
        try {
            await window.electronAPI.addSession(sessionData);
        } catch (error) {
            console.error('Error saving session:', error);
        }
        
        // Update stats
        if (this.currentMode === 'focus' && this.timeLeft <= 0) {
            this.stats.completedSessions++;
            this.stats.totalMinutes += this.settings.focusTime;
            this.stats.streakCount++;
            await this.saveStats();
        }
        
        // Show notification
        await this.showNotification();
        
        // Determine next session
        this.transitionToNextSession();
        
        if (this.onComplete) this.onComplete(sessionData);
        if (this.onStateChange) this.onStateChange();
    }
    
    transitionToNextSession() {
        if (this.currentMode === 'focus') {
            if (this.currentSession % this.settings.sessionsBeforeLongBreak === 0) {
                this.currentMode = 'longBreak';
                this.timeLeft = this.settings.longBreakTime * 60;
                this.totalTime = this.settings.longBreakTime * 60;
            } else {
                this.currentMode = 'shortBreak';
                this.timeLeft = this.settings.shortBreakTime * 60;
                this.totalTime = this.settings.shortBreakTime * 60;
            }
            
            if (this.settings.autoStartBreaks) {
                setTimeout(() => this.start(), 2000);
            }
        } else {
            if (this.currentMode === 'longBreak') {
                this.currentSession = 1;
            } else {
                this.currentSession++;
            }
            
            this.currentMode = 'focus';
            this.timeLeft = this.settings.focusTime * 60;
            this.totalTime = this.settings.focusTime * 60;
            
            if (this.settings.autoStartPomodoros) {
                setTimeout(() => this.start(), 2000);
            }
        }
        
        this.interruptions = 0;
        this.sessionStartTime = null;
        this.updateTray();
    }
    
    async showNotification() {
        if (!this.settings.notificationsEnabled) return;
        
        let title = '';
        let body = '';
        
        if (this.currentMode === 'focus') {
            title = '🎯 Focus Session Complete!';
            body = `Great work! You completed a ${this.settings.focusTime}-minute focus session. Time for a break!`;
        } else if (this.currentMode === 'shortBreak') {
            title = '☕ Short Break Complete!';
            body = 'Break time is over. Ready for your next focus session?';
        } else {
            title = '🌟 Long Break Complete!';
            body = 'Long break finished! Time to start a new cycle of focus sessions.';
        }
        
        try {
            await window.electronAPI.showNotification(title, body, {
                urgent: true
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
    
    updateTray() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        let modeIcon = '';
        let modeText = '';
        
        if (this.currentMode === 'focus') {
            modeIcon = '🎯';
            modeText = 'Focus';
        } else if (this.currentMode === 'shortBreak') {
            modeIcon = '☕';
            modeText = 'Break';
        } else {
            modeIcon = '🌟';
            modeText = 'Long Break';
        }
        
        const status = this.isRunning && !this.isPaused ? 'Running' : 'Paused';
        const title = this.isRunning || this.isPaused ? timeString : '';
        const tooltip = `Pomodoro Timer - ${modeIcon} ${modeText} - ${status}`;
        
        try {
            window.electronAPI.updateTray({ title, tooltip });
        } catch (error) {
            console.error('Error updating tray:', error);
        }
    }
    
    // Utility methods
    getCurrentModeInfo() {
        const modes = {
            focus: {
                icon: '🎯',
                title: 'Focus Session',
                className: 'focus-mode',
                description: `Session ${this.currentSession} of ${this.settings.sessionsBeforeLongBreak}`
            },
            shortBreak: {
                icon: '☕',
                title: 'Short Break',
                className: 'break-mode',
                description: 'Take a short break!'
            },
            longBreak: {
                icon: '🌟',
                title: 'Long Break',
                className: 'long-break-mode',
                description: 'Enjoy your long break!'
            }
        };
        
        return modes[this.currentMode];
    }
    
    getFormattedTime() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    getProgress() {
        return ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
    }
    
    getTodayStats() {
        // This would typically fetch from session history
        // For now, return current stats
        return {
            completedSessions: this.stats.completedSessions,
            totalMinutes: this.stats.totalMinutes,
            dailyGoal: this.stats.dailyGoal,
            progress: Math.min((this.stats.completedSessions / this.stats.dailyGoal) * 100, 100)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PomodoroTimer;
} else {
    window.PomodoroTimer = PomodoroTimer;
}