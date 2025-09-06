class AnalyticsManager {
    constructor() {
        this.sessionHistory = [];
        this.stats = {
            completedSessions: 0,
            totalMinutes: 0,
            streakCount: 0,
            dailyGoal: 8,
            weeklyGoal: 40
        };
    }
    
    async loadData() {
        try {
            this.sessionHistory = await window.electronAPI.getSessionHistory();
            this.stats = await window.electronAPI.getStats();
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }
    
    async addSession(sessionData) {
        try {
            this.sessionHistory = await window.electronAPI.addSession(sessionData);
            return this.sessionHistory;
        } catch (error) {
            console.error('Error adding session:', error);
        }
    }
    
    async updateStats(newStats) {
        try {
            this.stats = { ...this.stats, ...newStats };
            await window.electronAPI.saveStats(this.stats);
            return this.stats;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = this.sessionHistory.filter(session => 
            session.date === today && session.type === 'focus' && session.completed
        );
        
        const completedToday = todaySessions.length;
        const minutesToday = todaySessions.reduce((total, session) => total + session.duration, 0);
        
        return {
            completedSessions: completedToday,
            totalMinutes: minutesToday,
            dailyGoal: this.stats.dailyGoal,
            progress: Math.min((completedToday / this.stats.dailyGoal) * 100, 100),
            remaining: Math.max(this.stats.dailyGoal - completedToday, 0)
        };
    }
    
    getWeekStats() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoString = weekAgo.toISOString().split('T')[0];
        
        const weekSessions = this.sessionHistory.filter(session => 
            session.date >= weekAgoString && session.type === 'focus' && session.completed
        );
        
        const completedThisWeek = weekSessions.length;
        const minutesThisWeek = weekSessions.reduce((total, session) => total + session.duration, 0);
        
        return {
            completedSessions: completedThisWeek,
            totalMinutes: minutesThisWeek,
            weeklyGoal: this.stats.weeklyGoal,
            progress: Math.min((completedThisWeek / this.stats.weeklyGoal) * 100, 100),
            remaining: Math.max(this.stats.weeklyGoal - completedThisWeek, 0)
        };
    }
    
    getDailyPattern(days = 7) {
        const pattern = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            const daySessions = this.sessionHistory.filter(session => 
                session.date === dateString && session.type === 'focus' && session.completed
            );
            
            pattern.push({
                date: dateString,
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                sessions: daySessions.length,
                minutes: daySessions.reduce((total, session) => total + session.duration, 0)
            });
        }
        
        return pattern;
    }
    
    getProductivityInsights() {
        const todayStats = this.getTodayStats();
        const weekStats = this.getWeekStats();
        const pattern = this.getDailyPattern(30);
        
        // Calculate average daily sessions
        const validDays = pattern.filter(day => day.sessions > 0);
        const avgDailySessions = validDays.length > 0 
            ? validDays.reduce((sum, day) => sum + day.sessions, 0) / validDays.length
            : 0;
        
        // Find most productive day of week
        const dayOfWeekStats = {};
        pattern.forEach(day => {
            const dayName = day.day;
            if (!dayOfWeekStats[dayName]) {
                dayOfWeekStats[dayName] = { sessions: 0, count: 0 };
            }
            dayOfWeekStats[dayName].sessions += day.sessions;
            dayOfWeekStats[dayName].count += 1;
        });
        
        let mostProductiveDay = 'Monday';
        let highestAverage = 0;
        
        Object.keys(dayOfWeekStats).forEach(day => {
            const average = dayOfWeekStats[day].sessions / dayOfWeekStats[day].count;
            if (average > highestAverage) {
                highestAverage = average;
                mostProductiveDay = day;
            }
        });
        
        // Calculate streak information
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        pattern.reverse().forEach(day => {
            if (day.sessions > 0) {
                if (tempStreak === currentStreak) {
                    currentStreak++;
                }
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                if (tempStreak === currentStreak) {
                    currentStreak = 0;
                }
                tempStreak = 0;
            }
        });
        
        return {
            today: todayStats,
            week: weekStats,
            averageDailySessions: Math.round(avgDailySessions * 10) / 10,
            mostProductiveDay,
            currentStreak,
            longestStreak,
            totalSessions: this.stats.completedSessions,
            totalMinutes: this.stats.totalMinutes,
            totalHours: Math.round((this.stats.totalMinutes / 60) * 10) / 10
        };
    }
    
    getSessionTypeBreakdown(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffString = cutoffDate.toISOString().split('T')[0];
        
        const recentSessions = this.sessionHistory.filter(session => session.date >= cutoffString);
        
        const breakdown = {
            focus: { completed: 0, interrupted: 0, totalMinutes: 0 },
            shortBreak: { completed: 0, interrupted: 0, totalMinutes: 0 },
            longBreak: { completed: 0, interrupted: 0, totalMinutes: 0 }
        };
        
        recentSessions.forEach(session => {
            const type = session.type;
            if (breakdown[type]) {
                if (session.completed) {
                    breakdown[type].completed++;
                } else {
                    breakdown[type].interrupted++;
                }
                breakdown[type].totalMinutes += session.duration;
            }
        });
        
        return breakdown;
    }
    
    async clearHistory() {
        try {
            this.sessionHistory = await window.electronAPI.clearSessionHistory();
            return this.sessionHistory;
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }
    
    async exportData() {
        try {
            return await window.electronAPI.exportData();
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }
    
    // UI helper methods
    createProgressBar(current, goal, className = 'progress-bar') {
        const container = document.createElement('div');
        container.className = className;
        
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        fill.style.width = `${Math.min((current / goal) * 100, 100)}%`;
        
        container.appendChild(fill);
        return container;
    }
    
    createStatsCard(title, value, subtitle, className = 'stat-card') {
        const card = document.createElement('div');
        card.className = className;
        
        const titleEl = document.createElement('div');
        titleEl.className = 'stat-title';
        titleEl.textContent = title;
        
        const valueEl = document.createElement('div');
        valueEl.className = 'stat-value';
        valueEl.textContent = value;
        
        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'stat-subtitle';
        subtitleEl.textContent = subtitle;
        
        card.appendChild(titleEl);
        card.appendChild(valueEl);
        card.appendChild(subtitleEl);
        
        return card;
    }
    
    createDailyChart(pattern) {
        const container = document.createElement('div');
        container.className = 'daily-chart';
        
        const maxSessions = Math.max(...pattern.map(day => day.sessions));
        
        pattern.forEach(day => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            
            const height = maxSessions > 0 ? (day.sessions / maxSessions) * 100 : 0;
            bar.style.height = `${height}%`;
            bar.title = `${day.day}: ${day.sessions} sessions`;
            
            const label = document.createElement('div');
            label.className = 'chart-label';
            label.textContent = day.day;
            
            const barContainer = document.createElement('div');
            barContainer.className = 'chart-bar-container';
            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            
            container.appendChild(barContainer);
        });
        
        return container;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsManager;
} else {
    window.AnalyticsManager = AnalyticsManager;
}