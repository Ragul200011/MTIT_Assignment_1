/**
 * ==========================================
 * FOCUS MODE ARENA - REFACTORED & OPTIMIZED
 * ==========================================
 * 
 * Modern, performant Pomodoro timer with:
 * - State machine architecture
 * - High-precision timing with RAF
 * - Optimized event handling
 * - Clean, modular code structure
 * 
 * @version 3.0.0
 * @author Senior Frontend Engineer
 */

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const CONFIG = {
    TIMER: {
        DEFAULT_MINUTES: 25,
        UPDATE_INTERVAL: 100, // More frequent updates for precision
        DISPLAY_UPDATE: 1000 // Display updates every second
    },
    SCORING: {
        POINTS_PER_SECOND: 1,
        TAB_PENALTY: -10,
        IDLE_PENALTY: -20,
        MIN_SCORE: 0
    },
    IDLE: {
        THRESHOLD: 30000, // 30 seconds
        CHECK_INTERVAL: 1000
    },
    NOTIFICATION: {
        DURATION: 5000,
        AUTO_HIDE: true
    },
    VISUAL: {
        PROGRESS_CIRCUMFERENCE: 816.81, // 2 * PI * 130
        PARTICLE_COUNT: 20
    }
};

const APP_STATE = {
    IDLE: 'idle',
    FOCUSING: 'focusing',
    PAUSED: 'paused',
    DISTRACTED: 'distracted',
    COMPLETED: 'completed'
};

const EVENT_TYPE = {
    TAB_SWITCH: 'tab_switch',
    IDLE: 'idle'
};

const NOTIFY_TYPE = {
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const Utils = {
    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    formatTimeVerbose(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    },

    formatTimestamp() {
        return new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false
        });
    },

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// ==========================================
// STATE MANAGER (Finite State Machine)
// ==========================================

class StateManager {
    constructor() {
        this.currentState = APP_STATE.IDLE;
        this.prevState = null;
        this.stateData = {
            timeRemaining: CONFIG.TIMER.DEFAULT_MINUTES * 60,
            totalTime: CONFIG.TIMER.DEFAULT_MINUTES * 60,
            score: 0,
            potentialScore: 0,
            sessionBest: 0,
            streak: 0
        };
    }

    setState(newState) {
        if (this.currentState !== newState) {
            this.prevState = this.currentState;
            this.currentState = newState;
            this.onStateChange(newState, this.prevState);
        }
    }

    onStateChange(newState, oldState) {
        // Update UI to reflect state
        document.getElementById('app')?.setAttribute('data-state', newState);
        const stateLabel = document.getElementById('stateLabel');
        
        const labels = {
            [APP_STATE.IDLE]: 'Ready',
            [APP_STATE.FOCUSING]: 'Focusing',
            [APP_STATE.PAUSED]: 'Paused',
            [APP_STATE.DISTRACTED]: 'Distracted!',
            [APP_STATE.COMPLETED]: 'Complete!'
        };
        
        if (stateLabel) {
            stateLabel.textContent = labels[newState] || 'Ready';
        }
    }

    isRunning() {
        return this.currentState === APP_STATE.FOCUSING;
    }

    reset() {
        this.stateData = {
            ...this.stateData,
            timeRemaining: this.stateData.totalTime,
            score: 0,
            potentialScore: 0
        };
    }

    setDuration(seconds) {
        this.stateData.totalTime = seconds;
        this.stateData.timeRemaining = seconds;
    }

    updateScore(delta) {
        this.stateData.score = Math.max(
            CONFIG.SCORING.MIN_SCORE,
            this.stateData.score + delta
        );
        this.stateData.potentialScore += delta > 0 ? delta : 0;
        this.stateData.sessionBest = Math.max(this.stateData.sessionBest, this.stateData.score);
    }

    getEfficiency() {
        if (this.stateData.potentialScore === 0) return 100;
        return Math.round((this.stateData.score / this.stateData.potentialScore) * 100);
    }
}

// ==========================================
// HIGH-PRECISION TIMER
// ==========================================

class PrecisionTimer {
    constructor(onTick, onComplete) {
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.startTime = null;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.rafId = null;
        this.lastDisplayUpdate = 0;
    }

    start(initialTime) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = performance.now() - this.elapsedTime;
        this.lastDisplayUpdate = 0;
        this.tick();
    }

    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    tick() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.elapsedTime = currentTime - this.startTime;

        // Update display every second for performance
        if (this.elapsedTime - this.lastDisplayUpdate >= CONFIG.TIMER.DISPLAY_UPDATE) {
            const secondsElapsed = Math.floor(this.elapsedTime / 1000);
            this.onTick(secondsElapsed);
            this.lastDisplayUpdate = this.elapsedTime;
        }

        this.rafId = requestAnimationFrame(() => this.tick());
    }

    reset() {
        this.pause();
        this.startTime = null;
        this.elapsedTime = 0;
        this.lastDisplayUpdate = 0;
    }

    getElapsedSeconds() {
        return Math.floor(this.elapsedTime / 1000);
    }
}

// ==========================================
// ACTIVITY MONITOR
// ==========================================

class ActivityMonitor {
    constructor(onTabSwitch, onIdle) {
        this.onTabSwitch = onTabSwitch;
        this.onIdle = onIdle;
        this.isActive = true;
        this.lastActivityTime = Date.now();
        this.idleCheckInterval = null;
        this.hasIdlePenalty = false;
        this.hasTabPenalty = false;
        this.isMonitoring = false;

        this.handleActivity = this.handleActivity.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.checkIdle = this.checkIdle.bind(this);
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.lastActivityTime = Date.now();
        this.hasIdlePenalty = false;
        this.hasTabPenalty = false;

        // Activity events (throttled for performance)
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        const throttledHandler = Utils.throttle(this.handleActivity, 500);
        
        activityEvents.forEach(event => {
            document.addEventListener(event, throttledHandler, { passive: true });
        });

        // Visibility change
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Idle checker
        this.idleCheckInterval = setInterval(this.checkIdle, CONFIG.IDLE.CHECK_INTERVAL);
    }

    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;

        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.removeEventListener(event, this.handleActivity);
        });

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
            this.idleCheckInterval = null;
        }
    }

    handleActivity() {
        this.lastActivityTime = Date.now();
        this.isActive = true;
        this.hasIdlePenalty = false;
    }

    handleVisibilityChange() {
        if (document.hidden && !this.hasTabPenalty) {
            this.hasTabPenalty = true;
            this.onTabSwitch();
        } else if (!document.hidden) {
            this.hasTabPenalty = false;
        }
    }

    checkIdle() {
        const timeSinceActivity = Date.now() - this.lastActivityTime;
        
        if (timeSinceActivity >= CONFIG.IDLE.THRESHOLD && !this.hasIdlePenalty) {
            this.isActive = false;
            this.hasIdlePenalty = true;
            this.onIdle();
        }
    }

    getStatus() {
        return {
            isTabVisible: !document.hidden,
            isUserActive: this.isActive
        };
    }
}

// ==========================================
// EVENT LOGGER
// ==========================================

class EventLogger {
    constructor() {
        this.events = [];
        this.maxEvents = 50;
    }

    log(type, amount, reason) {
        const event = {
            timestamp: Utils.formatTimestamp(),
            type,
            amount,
            reason
        };
        
        this.events.unshift(event);
        
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }
        
        return event;
    }

    clear() {
        this.events = [];
    }

    getEvents() {
        return [...this.events];
    }

    getEventCount() {
        return this.events.length;
    }
}

// ==========================================
// SESSION ANALYZER
// ==========================================

class SessionAnalyzer {
    constructor() {
        this.sessionData = {
            focusTime: 0,
            idleTime: 0,
            tabSwitches: 0,
            idleEvents: 0
        };
    }

    reset() {
        this.sessionData = {
            focusTime: 0,
            idleTime: 0,
            tabSwitches: 0,
            idleEvents: 0
        };
    }

    recordTabSwitch() {
        this.sessionData.tabSwitches++;
    }

    recordIdleEvent() {
        this.sessionData.idleEvents++;
    }

    recordFocusTime(seconds) {
        this.sessionData.focusTime = seconds;
    }

    analyze(score, efficiency) {
        const { tabSwitches, idleEvents, focusTime } = this.sessionData;
        const totalDistractions = tabSwitches + idleEvents;

        let category = '💎';
        let categoryName = '';
        let summary = '';
        let suggestions = [];

        if (efficiency >= 90) {
            category = '💎';
            categoryName = 'Diamond Focus';
            summary = `Outstanding performance! Maintained ${efficiency}% efficiency with minimal distractions. You're in peak flow state.`;
            suggestions = [
                'Continue this exceptional focus streak to build lasting productivity habits',
                'Consider increasing session duration to maximize your flow state'
            ];
        } else if (efficiency >= 75) {
            category = '🏆';
            categoryName = 'Gold Focus';
            summary = `Great work! Achieved ${efficiency}% efficiency. Your focus is strong with room for minor improvements.`;
            suggestions = [
                'Minimize tab switches by using a dedicated workspace or focus mode',
                'Take micro-breaks to prevent idle time while staying engaged'
            ];
        } else if (efficiency >= 50) {
            category = '⚡';
            categoryName = 'Silver Focus';
            summary = `Good effort with ${efficiency}% efficiency. ${totalDistractions} distractions interrupted your flow. Let's refine your approach.`;
            suggestions = [
                'Use website blockers to eliminate digital distractions',
                'Set phone to Do Not Disturb mode during focus sessions'
            ];
        } else {
            category = '🎯';
            categoryName = 'Bronze Focus';
            summary = `${efficiency}% efficiency shows opportunity for growth. ${totalDistractions} distractions occurred. Focus is a skill you're developing.`;
            suggestions = [
                'Start with shorter 10-15 minute sessions to build focus stamina',
                'Create a distraction-free environment before starting your session'
            ];
        }

        return {
            category,
            categoryName,
            summary,
            suggestions,
            metrics: {
                focusTime: Utils.formatTimeVerbose(focusTime),
                idleTime: Utils.formatTimeVerbose((focusTime * (100 - efficiency)) / 100),
                distractions: totalDistractions,
                score
            }
        };
    }
}

// ==========================================
// UI CONTROLLER
// ==========================================

class UIController {
    constructor() {
        this.elements = this.cacheElements();
        this.notificationTimeout = null;
    }

    cacheElements() {
        const $ = id => document.getElementById(id);
        
        return {
            // Timer elements
            timerDisplay: $('timerDisplay'),
            stateLabel: $('stateLabel'),
            progressCircle: $('progressCircle'),
            particles: $('particles'),
            
            // Score elements
            currentScore: $('currentScore'),
            efficiency: $('efficiency'),
            sessionBest: $('sessionBest'),
            streakCount: $('streakCount'),
            
            // Controls
            startBtn: $('startBtn'),
            resetBtn: $('resetBtn'),
            applyDurationBtn: $('applyDurationBtn'),
            
            // Inputs
            hoursInput: $('hoursInput'),
            minutesInput: $('minutesInput'),
            secondsInput: $('secondsInput'),
            
            // Status
            tabStatus: $('tabStatus'),
            activityStatus: $('activityStatus'),
            
            // Notifications & Logs
            notification: $('notification'),
            penaltyLog: $('penaltyLog'),
            logCount: $('logCount'),
            
            // Analysis
            analysisSection: $('analysisSection'),
            performanceCategory: $('performanceCategory'),
            analysisFocusTime: $('analysisFocusTime'),
            analysisIdleTime: $('analysisIdleTime'),
            analysisDistractions: $('analysisDistractions'),
            analysisFinalScore: $('analysisFinalScore'),
            feedbackSummary: $('feedbackSummary'),
            suggestionsList: $('suggestionsList'),
            closeAnalysisBtn: $('closeAnalysisBtn')
        };
    }

    updateTimer(seconds) {
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = Utils.formatTime(seconds);
        }
    }

    updateScore(score) {
        if (this.elements.currentScore) {
            this.elements.currentScore.textContent = score.toLocaleString();
            
            // Micro-interaction (scale pulse)
            this.elements.currentScore.style.transform = 'scale(1.05)';
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.elements.currentScore.style.transform = '';
                }, 100);
            });
        }
    }

    updateEfficiency(efficiency) {
        if (this.elements.efficiency) {
            this.elements.efficiency.textContent = `${efficiency}%`;
        }
    }

    updateSessionBest(best) {
        if (this.elements.sessionBest) {
            this.elements.sessionBest.textContent = best.toLocaleString();
        }
    }

    updateStreak(streak) {
        if (this.elements.streakCount) {
            this.elements.streakCount.textContent = streak;
        }
    }

    updateProgress(remaining, total) {
        if (this.elements.progressCircle) {
            const progress = 1 - (remaining / total);
            const offset = CONFIG.VISUAL.PROGRESS_CIRCUMFERENCE * (1 - progress);
            this.elements.progressCircle.style.strokeDashoffset = offset;
        }
    }

    updateStartButton(isRunning) {
        if (this.elements.startBtn) {
            const icon = this.elements.startBtn.querySelector('.btn-icon');
            const text = this.elements.startBtn.querySelector('.btn-text');
            
            if (icon) icon.textContent = isRunning ? '⏸' : '▶';
            if (text) text.textContent = isRunning ? 'Pause' : 'Start';
        }
    }

    updateStatusIndicators(isTabVisible, isUserActive) {
        if (this.elements.tabStatus) {
            this.elements.tabStatus.classList.toggle('active', isTabVisible);
            this.elements.tabStatus.classList.toggle('inactive', !isTabVisible);
        }
        
        if (this.elements.activityStatus) {
            this.elements.activityStatus.classList.toggle('active', isUserActive);
            this.elements.activityStatus.classList.toggle('inactive', !isUserActive);
        }
    }

    showNotification(message, type = NOTIFY_TYPE.WARNING) {
        if (!this.elements.notification) return;

        clearTimeout(this.notificationTimeout);

        this.elements.notification.textContent = message;
        this.elements.notification.className = `toast-notification ${type}`;
        this.elements.notification.style.display = 'block';

        if (CONFIG.NOTIFICATION.AUTO_HIDE) {
            this.notificationTimeout = setTimeout(() => {
                this.hideNotification();
            }, CONFIG.NOTIFICATION.DURATION);
        }
    }

    hideNotification() {
        if (this.elements.notification) {
            this.elements.notification.style.display = 'none';
        }
    }

    addLogEntry(event) {
        if (!this.elements.penaltyLog) return;

        const li = document.createElement('li');
        li.innerHTML = `
            <span>${event.reason} (${event.amount})</span>
            <span style="opacity: 0.6; font-size: 0.75rem;">${event.timestamp}</span>
        `;
        
        this.elements.penaltyLog.insertBefore(li, this.elements.penaltyLog.firstChild);

        // Update log count
        if (this.elements.logCount) {
            const count = this.elements.penaltyLog.children.length;
            this.elements.logCount.textContent = count;
            this.elements.logCount.style.display = count > 0 ? 'block' : 'none';
        }

        // Limit to 20 entries
        while (this.elements.penaltyLog.children.length > 20) {
            this.elements.penaltyLog.removeChild(this.elements.penaltyLog.lastChild);
        }
    }

    clearLog() {
        if (this.elements.penaltyLog) {
            this.elements.penaltyLog.innerHTML = '';
        }
        if (this.elements.logCount) {
            this.elements.logCount.textContent = '0';
            this.elements.logCount.style.display = 'none';
        }
    }

    showAnalysis(analysis) {
        if (!this.elements.analysisSection) return;

        // Performance category
        if (this.elements.performanceCategory) {
            this.elements.performanceCategory.innerHTML = `
                <div class="category-badge">${analysis.category}</div>
                <div style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">${analysis.categoryName}</div>
            `;
        }

        // Metrics
        if (this.elements.analysisFocusTime) {
            this.elements.analysisFocusTime.textContent = analysis.metrics.focusTime;
        }
        if (this.elements.analysisIdleTime) {
            this.elements.analysisIdleTime.textContent = analysis.metrics.idleTime;
        }
        if (this.elements.analysisDistractions) {
            this.elements.analysisDistractions.textContent = analysis.metrics.distractions;
        }
        if (this.elements.analysisFinalScore) {
            this.elements.analysisFinalScore.textContent = analysis.metrics.score;
        }

        // Feedback
        if (this.elements.feedbackSummary) {
            this.elements.feedbackSummary.textContent = analysis.summary;
        }

        // Suggestions
        if (this.elements.suggestionsList) {
            this.elements.suggestionsList.innerHTML = analysis.suggestions
                .map(s => `<li>${s}</li>`)
                .join('');
        }

        this.elements.analysisSection.style.display = 'block';
    }

    hideAnalysis() {
        if (this.elements.analysisSection) {
            this.elements.analysisSection.style.display = 'none';
        }
    }

    getDurationInputs() {
        return {
            hours: parseInt(this.elements.hoursInput?.value || 0),
            minutes: parseInt(this.elements.minutesInput?.value || 0),
            seconds: parseInt(this.elements.secondsInput?.value || 0)
        };
    }

    setDurationInputs(hours, minutes, seconds) {
        if (this.elements.hoursInput) this.elements.hoursInput.value = hours;
        if (this.elements.minutesInput) this.elements.minutesInput.value = minutes;
        if (this.elements.secondsInput) this.elements.secondsInput.value = seconds;
    }
}

// ==========================================
// AUDIO MANAGER (Optional)
// ==========================================

class AudioManager {
    constructor() {
        this.context = null;
        this.enabled = true;
    }

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    playTone(frequency = 440, duration = 200) {
        if (!this.enabled || !this.context) return;

        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration / 1000);

            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration / 1000);
        } catch (e) {
            console.warn('Audio playback failed', e);
        }
    }

    playSuccess() {
        this.playTone(660, 150);
        setTimeout(() => this.playTone(880, 150), 100);
    }

    playWarning() {
        this.playTone(300, 200);
    }

    playComplete() {
        this.playTone(523, 120);
        setTimeout(() => this.playTone(659, 120), 120);
        setTimeout(() => this.playTone(784, 200), 240);
    }
}

// ==========================================
// MAIN APPLICATION
// ==========================================

class FocusModeArena {
    constructor() {
        this.state = new StateManager();
        this.ui = new UIController();
        this.audio = new AudioManager();
        this.logger = new EventLogger();
        this.analyzer = new SessionAnalyzer();
        
        this.timer = new PrecisionTimer(
            (elapsed) => this.onTimerTick(elapsed),
            () => this.onTimerComplete()
        );
        
        this.monitor = new ActivityMonitor(
            () => this.onTabSwitch(),
            () => this.onIdle()
        );

        this.elapsedSeconds = 0;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        this.audio.init();
        this.setupEventListeners();
        this.updateAllUI();
        this.initialized = true;
        
        console.log('🎯 Focus Mode Arena initialized');
    }

    setupEventListeners() {
        // Start/Pause button
        this.ui.elements.startBtn?.addEventListener('click', () => this.toggleTimer());
        
        // Reset button
        this.ui.elements.resetBtn?.addEventListener('click', () => this.reset());
        
        // Apply duration button
        this.ui.elements.applyDurationBtn?.addEventListener('click', () => this.applyDuration());
        
        // Close analysis button
        this.ui.elements.closeAnalysisBtn?.addEventListener('click', () => {
            this.ui.hideAnalysis();
        });

        // Enter key on duration inputs
        [this.ui.elements.hoursInput, this.ui.elements.minutesInput, this.ui.elements.secondsInput]
            .forEach(input => {
                input?.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.applyDuration();
                });
            });
    }

    toggleTimer() {
        if (this.state.isRunning()) {
            this.pause();
        } else {
            this.start();
        }
    }

    start() {
        if (this.state.isRunning()) return;

        this.state.setState(APP_STATE.FOCUSING);
        this.timer.start();
        this.monitor.start();
        this.ui.updateStartButton(true);
        this.ui.hideAnalysis();
        
        console.log('⏱ Timer started');
    }

    pause() {
        if (!this.state.isRunning()) return;

        this.state.setState(APP_STATE.PAUSED);
        this.timer.pause();
        this.monitor.stop();
        this.ui.updateStartButton(false);
        
        console.log('⏸ Timer paused');
    }

    reset() {
        if (this.state.isRunning()) {
            const confirmed = confirm('Reset timer? Your current session will be lost.');
            if (!confirmed) return;
        }

        this.timer.reset();
        this.monitor.stop();
        this.state.setState(APP_STATE.IDLE);
        this.state.reset();
        this.analyzer.reset();
        this.logger.clear();
        this.elapsedSeconds = 0;
        
        this.ui.clearLog();
        this.ui.hideAnalysis();
        this.ui.updateStartButton(false);
        this.updateAllUI();
        
        console.log('🔄 Timer reset');
    }

    applyDuration() {
        if (this.state.isRunning()) {
            this.ui.showNotification('Cannot change duration while timer is running', NOTIFY_TYPE.WARNING);
            return;
        }

        const { hours, minutes, seconds } = this.ui.getDurationInputs();
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

        if (totalSeconds === 0) {
            this.ui.showNotification('Duration must be greater than 0', NOTIFY_TYPE.ERROR);
            return;
        }

        if (totalSeconds > 86400) { // 24 hours
            this.ui.showNotification('Duration cannot exceed 24 hours', NOTIFY_TYPE.ERROR);
            return;
        }

        this.state.setDuration(totalSeconds);
        this.updateAllUI();
        this.ui.showNotification(`Duration set to ${Utils.formatTime(totalSeconds)}`, NOTIFY_TYPE.SUCCESS);
        
        console.log(`⏱ Duration set: ${totalSeconds}s`);
    }

    onTimerTick(elapsed) {
        this.elapsedSeconds = elapsed;
        const remaining = Math.max(0, this.state.stateData.totalTime - elapsed);

        // Update time and score
        this.state.stateData.timeRemaining = remaining;
        this.state.updateScore(1); // +1 point per second
        
        // Update UI
        this.ui.updateTimer(remaining);
        this.ui.updateScore(this.state.stateData.score);
        this.ui.updateEfficiency(this.state.getEfficiency());
        this.ui.updateSessionBest(this.state.stateData.sessionBest);
        this.ui.updateProgress(remaining, this.state.stateData.totalTime);

        // Update activity status
        const status = this.monitor.getStatus();
        this.ui.updateStatusIndicators(status.isTabVisible, status.isUserActive);

        // Check completion
        if (remaining === 0) {
            this.complete();
        }
    }

    onTabSwitch() {
        if (!this.state.isRunning()) return;

        this.state.setState(APP_STATE.DISTRACTED);
        this.state.updateScore(CONFIG.SCORING.TAB_PENALTY);
        this.analyzer.recordTabSwitch();
        
        const event = this.logger.log(EVENT_TYPE.TAB_SWITCH, CONFIG.SCORING.TAB_PENALTY, 'Tab Switched');
        this.ui.addLogEntry(event);
        this.ui.showNotification('Focus lost! Tab switched', NOTIFY_TYPE.WARNING);
        this.audio.playWarning();

        // Return to focusing state after brief moment
        setTimeout(() => {
            if (this.state.currentState === APP_STATE.DISTRACTED) {
                this.state.setState(APP_STATE.FOCUSING);
            }
        }, 1000);
        
        console.log('⚠ Penalty: Tab switch');
    }

    onIdle() {
        if (!this.state.isRunning()) return;

        this.state.setState(APP_STATE.DISTRACTED);
        this.state.updateScore(CONFIG.SCORING.IDLE_PENALTY);
        this.analyzer.recordIdleEvent();
        
        const event = this.logger.log(EVENT_TYPE.IDLE, CONFIG.SCORING.IDLE_PENALTY, 'Idle Detected');
        this.ui.addLogEntry(event);
        this.ui.showNotification('Idle detected! Resume activity', NOTIFY_TYPE.WARNING);
        this.audio.playWarning();
        
        console.log('⚠ Penalty: Idle');
    }

    complete() {
        this.timer.pause();
        this.monitor.stop();
        this.state.setState(APP_STATE.COMPLETED);
        this.analyzer.recordFocusTime(this.elapsedSeconds);
        
        const analysis = this.analyzer.analyze(
            this.state.stateData.score,
            this.state.getEfficiency()
        );

        this.state.stateData.streak++;
        this.ui.updateStreak(this.state.stateData.streak);
        this.ui.showAnalysis(analysis);
        this.ui.updateStartButton(false);
        this.audio.playComplete();
        
        console.log('✅ Session completed!', analysis);
    }

    updateAllUI() {
        this.ui.updateTimer(this.state.stateData.timeRemaining);
        this.ui.updateScore(this.state.stateData.score);
        this.ui.updateEfficiency(this.state.getEfficiency());
        this.ui.updateSessionBest(this.state.stateData.sessionBest);
        this.ui.updateProgress(this.state.stateData.timeRemaining, this.state.stateData.totalTime);
        this.ui.updateStreak(this.state.stateData.streak);
    }
}

// ==========================================
// INITIALIZE APP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new FocusModeArena();
    app.init();
    
    // Make app globally accessible for debugging
    window.FocusApp = app;
});
