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
        
        // Initialize
        this.loadState();
        this.setupEventListeners();
        this.startClock();
        this.updateUI();
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
        this.stopTimer();
        this.playNotificationSound();
        this.showCompletionNotification();
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
        // Update status text
        if (!this.isTimerActive) {
            this.timerStatus.innerHTML = '<span class="status-text">Click to start</span>';
            // Reset tab title when timer is not active
            document.title = 'Swiss Pomodoro';
        } else {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            this.timerStatus.innerHTML = `<span class="status-text">${timeString}</span>`;
            
            // Update tab title with countdown
            document.title = `${timeString} Swiss Pomodoro`;
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
                body: 'Your 1-hour focus session has ended. Great work!',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🕐</text></svg>'
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
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SwissPomodoroTimer();
}); 