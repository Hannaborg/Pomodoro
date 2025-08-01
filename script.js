class SwissPomodoroTimer {
    constructor() {
        // Clock elements
        this.hourHand = document.querySelector('.hour-hand');
        this.minuteHand = document.querySelector('.minute-hand');
        this.secondHand = document.querySelector('.second-hand');
        this.clock = document.getElementById('clock');
        this.timerOverlay = document.getElementById('timerOverlay');
        
        // Control elements
        this.timerStatus = document.getElementById('timerStatus');
        
        // Timer state
        this.isTimerActive = false;
        this.timerDuration = 60 * 60; // 1 hour in seconds
        this.timeRemaining = this.timerDuration;
        this.timerInterval = null;
        this.clockInterval = null;
        this.startTime = null; // Store when timer started
        this.endTime = null; // Store the target end time
        
        // Session management
        this.sessionStats = {
            totalSessions: 0,
            currentStreak: 0,
            todaySessions: 0,
            lastSessionDate: null,
            sessionHistory: [],
            dailyStats: {},
            weeklyStats: {},
            dailyGoals: {}
        };
        
        // Initialize
        this.loadState();
        this.loadSessionStats();
        this.setupEventListeners();
        this.startClock();
        this.updateUI();
        this.checkDailyGoal();
    }
    
    setupEventListeners() {
        // Clock click to start/stop timer
        this.clock.addEventListener('click', () => {
            if (this.isTimerActive) {
                this.stopTimer();
            } else {
                this.startTimer();
            }
        });
    }
    
    startClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    }
    
    updateClock() {
        const now = new Date();
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // Calculate angles for each hand
        const hourAngle = (hours * 30) + (minutes * 0.5) + (seconds * 0.0083); // Add seconds for smooth movement
        const minuteAngle = (minutes * 6) + (seconds * 0.1); // Add seconds for smooth movement (6 degrees per minute, 0.1 degrees per second)
        const secondAngle = seconds * 6;
        
        // Update hand rotations
        this.hourHand.style.transform = `rotate(${hourAngle}deg)`;
        this.minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
        this.secondHand.style.transform = `rotate(${secondAngle}deg)`;
        
        // Update timer overlay if active
        if (this.isTimerActive) {
            this.updateTimerOverlay();
        }
    }
    
    startTimer() {
        this.isTimerActive = true;
        
        // Set start and end times
        const now = new Date();
        this.startTime = new Date(now);
        this.endTime = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour from now
        
        this.timerOverlay.classList.add('active');
        this.updateTimerOverlay();
        
        this.timerInterval = setInterval(() => {
            this.updateTimeRemaining();
            this.updateTimerOverlay();
            this.updateUI();
            
            if (this.timeRemaining <= 0) {
                this.timerComplete();
            }
        }, 1000);
        
        this.saveState();
        this.updateUI();
    }
    
    updateTimeRemaining() {
        if (!this.endTime) return;
        
        const now = new Date();
        this.timeRemaining = Math.max(0, Math.floor((this.endTime.getTime() - now.getTime()) / 1000));
    }
    
    stopTimer() {
        this.isTimerActive = false;
        clearInterval(this.timerInterval);
        this.timerOverlay.classList.remove('active');
        this.timeRemaining = this.timerDuration;
        this.startTime = null;
        this.endTime = null;
        
        this.saveState();
        this.updateUI();
    }
    
    timerComplete() {
        this.recordCompletedSession();
        this.stopTimer();
        this.playNotificationSound();
        this.showCompletionNotification();
    }
    
    recordCompletedSession() {
        const now = new Date();
        const today = now.toDateString();
        const sessionData = {
            id: Date.now(),
            startTime: this.startTime,
            endTime: now,
            duration: 60, // 1 hour in minutes
            completed: true,
            timestamp: now.getTime()
        };
        
        // Update session stats
        this.sessionStats.totalSessions++;
        this.sessionStats.sessionHistory.push(sessionData);
        
        // Update daily stats
        if (!this.sessionStats.dailyStats[today]) {
            this.sessionStats.dailyStats[today] = {
                sessions: 0,
                totalTime: 0,
                completedSessions: 0
            };
        }
        this.sessionStats.dailyStats[today].sessions++;
        this.sessionStats.dailyStats[today].totalTime += 60;
        this.sessionStats.dailyStats[today].completedSessions++;
        
        // Update streak
        this.updateStreak(today);
        
        // Update today's sessions
        this.sessionStats.todaySessions = this.sessionStats.dailyStats[today].sessions;
        
        // Save session stats
        this.saveSessionStats();
    }
    
    updateStreak(today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        
        if (this.sessionStats.lastSessionDate === yesterdayString) {
            // Consecutive day
            this.sessionStats.currentStreak++;
        } else if (this.sessionStats.lastSessionDate !== today) {
            // New day, not consecutive
            this.sessionStats.currentStreak = 1;
        }
        
        this.sessionStats.lastSessionDate = today;
    }
    
    getDailyStats() {
        const today = new Date().toDateString();
        return this.sessionStats.dailyStats[today] || {
            sessions: 0,
            totalTime: 0,
            completedSessions: 0
        };
    }
    
    getWeeklyStats() {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        
        let weeklySessions = 0;
        let weeklyTime = 0;
        let weeklyCompleted = 0;
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateString = date.toDateString();
            
            if (this.sessionStats.dailyStats[dateString]) {
                weeklySessions += this.sessionStats.dailyStats[dateString].sessions;
                weeklyTime += this.sessionStats.dailyStats[dateString].totalTime;
                weeklyCompleted += this.sessionStats.dailyStats[dateString].completedSessions;
            }
        }
        
        return {
            sessions: weeklySessions,
            totalTime: weeklyTime,
            completedSessions: weeklyCompleted
        };
    }
    
    getBestFocusTimes() {
        const timeSlots = {};
        
        this.sessionStats.sessionHistory.forEach(session => {
            const hour = session.startTime.getHours();
            const timeSlot = `${hour}:00-${hour + 1}:00`;
            
            if (!timeSlots[timeSlot]) {
                timeSlots[timeSlot] = 0;
            }
            timeSlots[timeSlot]++;
        });
        
        // Sort by frequency and return top 3
        return Object.entries(timeSlots)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([time, count]) => ({ time, count }));
    }
    
    checkDailyGoal() {
        const today = new Date().toDateString();
        const lastGoalDate = localStorage.getItem('lastGoalDate');
        
        // Check if this is the first visit of the day
        if (lastGoalDate !== today) {
            this.showGoalSettingPopup();
        }
    }
    
    showGoalSettingPopup() {
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'goal-overlay';
        overlay.innerHTML = `
            <div class="goal-popup">
                <h2>Set Your Daily Goal</h2>
                <p>How many Pomodoro sessions would you like to complete today?</p>
                <div class="goal-input">
                    <input type="number" id="dailyGoalInput" min="1" max="12" value="4" />
                    <span class="goal-label">sessions</span>
                </div>
                <div class="goal-buttons">
                    <button id="setGoalBtn" class="goal-btn primary">Set Goal</button>
                    <button id="skipGoalBtn" class="goal-btn secondary">Skip</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Focus on input
        const input = document.getElementById('dailyGoalInput');
        input.focus();
        input.select();
        
        // Add event listeners
        document.getElementById('setGoalBtn').addEventListener('click', () => {
            this.setDailyGoal();
        });
        
        document.getElementById('skipGoalBtn').addEventListener('click', () => {
            this.skipDailyGoal();
        });
        
        // Allow Enter key to set goal
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setDailyGoal();
            }
        });
        
        // Allow Escape key to skip
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.skipDailyGoal();
            }
        });
    }
    
    setDailyGoal() {
        const input = document.getElementById('dailyGoalInput');
        const goal = parseInt(input.value) || 4;
        const today = new Date().toDateString();
        
        // Set the daily goal
        this.sessionStats.dailyGoals[today] = goal;
        localStorage.setItem('lastGoalDate', today);
        
        // Save and update UI
        this.saveSessionStats();
        this.updateUI();
        
        // Remove popup
        this.removeGoalPopup();
    }
    
    skipDailyGoal() {
        const today = new Date().toDateString();
        localStorage.setItem('lastGoalDate', today);
        this.removeGoalPopup();
    }
    
    removeGoalPopup() {
        const overlay = document.querySelector('.goal-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    getDailyGoal() {
        const today = new Date().toDateString();
        return this.sessionStats.dailyGoals[today] || 0;
    }
    
    updateTimerOverlay() {
        if (!this.isTimerActive || !this.startTime || !this.endTime) {
            this.timerOverlay.style.background = 'transparent';
            return;
        }
        
        const now = new Date();
        const totalDuration = this.endTime.getTime() - this.startTime.getTime();
        const elapsed = now.getTime() - this.startTime.getTime();
        const progress = Math.min(1, elapsed / totalDuration);
        
        // Calculate the start angle based on when the timer started
        const startDate = new Date(this.startTime);
        const startMinutes = startDate.getMinutes();
        const startSeconds = startDate.getSeconds();
        const startAngle = (startMinutes * 6) + (startSeconds * 0.1); // 6 degrees per minute + 0.1 degrees per second
        
        // Calculate how much white should be revealed (clockwise from start position)
        const revealAngle = progress * 360;
        
        // Create the conic gradient that starts entirely red and reveals white clockwise
        // The red background is the base, and white is revealed as a pie slice
        this.timerOverlay.style.background = `conic-gradient(from ${startAngle}deg, #ffffff 0deg, #ffffff ${revealAngle}deg, #d52d27 ${revealAngle}deg, #d52d27 360deg)`;
    }
    
    updateUI() {
        const dailyStats = this.getDailyStats();
        const dailyGoal = this.getDailyGoal();
        
        // Format today's sessions display
        const todayDisplay = dailyGoal > 0 ? `${dailyStats.sessions}/${dailyGoal} completed` : `${dailyStats.sessions} sessions`;
        
        // Update status text
        if (!this.isTimerActive) {
            this.timerStatus.innerHTML = `
                <span class="status-text">CLICK TO START</span>
                <div class="session-stats">
                    <div class="stat-line">TODAY: ${todayDisplay.toUpperCase()}</div>
                    <div class="stat-line">STREAK: ${this.sessionStats.currentStreak} DAYS</div>
                </div>
            `;
            // Reset tab title when timer is not active
            document.title = 'Pomodoro';
        } else {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            this.timerStatus.innerHTML = `
                <span class="status-text">${timeString}</span>
                <div class="session-stats">
                    <div class="stat-line">TODAY: ${todayDisplay.toUpperCase()}</div>
                    <div class="stat-line">STREAK: ${this.sessionStats.currentStreak} DAYS</div>
                </div>
            `;
            
            // Update tab title with countdown
            document.title = `${timeString} Pomodoro`;
        }
    }
    
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not supported');
        }
    }
    
    showCompletionNotification() {
        // Add a visual completion effect
        this.clock.style.transform = 'scale(1.05)';
        setTimeout(() => {
            this.clock.style.transform = 'scale(1)';
        }, 200);
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Focus Session Complete!', {
                body: `Great work! You've completed ${this.sessionStats.totalSessions} sessions with a ${this.sessionStats.currentStreak}-day streak!`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>'
            });
        }
    }
    
    saveState() {
        const state = {
            isTimerActive: this.isTimerActive,
            timeRemaining: this.timeRemaining,
            startTime: this.startTime ? this.startTime.getTime() : null,
            endTime: this.endTime ? this.endTime.getTime() : null,
            timestamp: Date.now()
        };
        localStorage.setItem('swissPomodoroState', JSON.stringify(state));
    }
    
    saveSessionStats() {
        localStorage.setItem('swissPomodoroStats', JSON.stringify(this.sessionStats));
    }
    
    loadState() {
        const saved = localStorage.getItem('swissPomodoroState');
        if (saved) {
            const state = JSON.parse(saved);
            
            if (state.startTime) {
                this.startTime = new Date(state.startTime);
            }
            if (state.endTime) {
                this.endTime = new Date(state.endTime);
                this.updateTimeRemaining();
            }
            
            if (state.isTimerActive && this.timeRemaining > 0) {
                this.isTimerActive = true;
                this.timerOverlay.classList.add('active');
                this.timerInterval = setInterval(() => {
                    this.updateTimeRemaining();
                    this.updateTimerOverlay();
                    this.updateUI();
                    
                    if (this.timeRemaining <= 0) {
                        this.timerComplete();
                    }
                }, 1000);
            }
        }
    }
    
    loadSessionStats() {
        const saved = localStorage.getItem('swissPomodoroStats');
        if (saved) {
            this.sessionStats = JSON.parse(saved);
            
            // Convert date strings back to Date objects for session history
            this.sessionStats.sessionHistory = this.sessionStats.sessionHistory.map(session => ({
                ...session,
                startTime: new Date(session.startTime),
                endTime: new Date(session.endTime)
            }));
        }
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SwissPomodoroTimer();
}); 