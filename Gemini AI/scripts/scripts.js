/**
 * GEMINI FOCUS ARENA - CORE LOGIC
 * A gamified productivity timer with focus tracking.
 */

// --- Configuration ---
const CONFIG = {
    DEFAULT_DURATION_MS: 25 * 60 * 1000,
    SCORING: {
        POINTS_PER_SECOND: 1,
        TAB_SWITCH_PENALTY: -10,
        COMPLETION_BONUS: 100,
        LEVEL_BASE_XP: 500 // XP needed for level 1
    },
    UI: {
        RING_CIRCUMFERENCE: 2 * Math.PI * 120, // r=120
    },
    STORAGE_KEYS: {
        PROGRESS: 'gemini_focus_progress',
        SESSION: 'gemini_focus_session'
    }
};

// --- State Management ---
const STATE = {
    IDLE: 'idle',
    FOCUSING: 'focusing',
    PAUSED: 'paused',
    COMPLETED: 'completed'
};

class FocusApp {
    constructor() {
        // Core State
        this.status = STATE.IDLE;
        this.duration = CONFIG.DEFAULT_DURATION_MS;
        this.timeLeft = this.duration;
        this.xp = 0;
        this.level = 1;
        
        // Session Metrics
        this.sessionXP = 0;
        this.penalties = 0;
        
        // Modules
        this.timer = new Timer(this);
        this.ui = new UIController(this);
        this.scorer = new ScoreSystem(this);
        
        this.init();
    }

    init() {
        this.ui.init();
        this.bindEvents();
        this.loadProgress(); 
        this.checkActiveSession();
        
        // Save on close/refresh
        window.addEventListener('beforeunload', () => {
            if (this.status === STATE.FOCUSING || this.status === STATE.PAUSED) {
                this.saveSession();
            }
        });
    }

    bindEvents() {
        // Controls
        document.getElementById('btn-main').addEventListener('click', () => this.toggleFocus());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetSession());
        document.getElementById('btn-set-duration').addEventListener('click', () => this.applyCustomDuration());
        
        // Auto-update on Enter key in any input
        ['input-hrs', 'input-min', 'input-sec'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.applyCustomDuration();
            });
        });
        
        // Modal
        document.getElementById('btn-close-modal').addEventListener('click', () => this.ui.toggleModal(false));

        // Visibility API
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    toggleFocus() {
        if (this.status === STATE.IDLE || this.status === STATE.PAUSED || this.status === STATE.COMPLETED) {
            if (this.status === STATE.COMPLETED) {
                this.sessionXP = 0;
                this.penalties = 0;
            }
            this.startFocus();
        } else if (this.status === STATE.FOCUSING) {
            this.pauseFocus();
        }
    }

    startFocus() {
        this.status = STATE.FOCUSING;
        this.timer.start();
        this.ui.updateStatus('Focusing');
        this.ui.togglePulse(true);
        this.ui.updateMainButton('Pause Focus', 'stop');
    }

    pauseFocus() {
        this.status = STATE.PAUSED;
        this.timer.stop();
        this.ui.updateStatus('Paused');
        this.ui.togglePulse(false);
        this.ui.updateMainButton('Resume Focus', 'start');
    }

    resetSession() {
        this.timer.stop();
        this.status = STATE.IDLE;
        this.timeLeft = this.duration;
        this.sessionXP = 0;
        this.penalties = 0;
        this.clearSessionData();
        
        this.ui.updateTimer(this.timeLeft, this.duration);
        this.ui.updateStatus('Ready');
        this.ui.togglePulse(false);
        this.ui.updateMainButton('Start Focus', 'start');
    }

    completeSession() {
        this.status = STATE.COMPLETED;
        this.timer.stop();
        this.ui.togglePulse(false);
        
        this.clearSessionData();
        
        // Bonus XP
        this.scorer.addXP(CONFIG.SCORING.COMPLETION_BONUS);
        
        // Show Analysis
        this.ui.showAnalysis(this.sessionXP, this.duration);
        this.playSound('complete');
        
        // Prepare for next
        this.timeLeft = this.duration;
        this.ui.updateMainButton('Start New Session', 'start');
        this.ui.updateStatus('Completed');
    }

    handleTick(progressMs) {
        this.timeLeft = Math.max(0, this.timeLeft - progressMs);
        
        // Update UI
        this.ui.updateTimer(this.timeLeft, this.duration);
        
        // Scoring (1 point per second basically)
        // We accumulate partial seconds in Scorer if needed, but simple is better:
        // Every ~1s tick adds points. 
        // For smoother XP bar, we can add small increments or just wait for seconds.
        // Let's do per-second logic in Timer class or here.
        // Timer calls this every frame. Only add XP on second change.
        
        if (this.timeLeft <= 0) {
            this.completeSession();
        } else {
            // Periodic save (every ~5s) to prevent total data loss on crash
            if (Math.floor(this.timeLeft / 1000) % 5 === 0) {
                this.saveSession();
            }
        }
    }

    handleSecondPassed() {
        if (this.status === STATE.FOCUSING) {
            this.scorer.addXP(CONFIG.SCORING.POINTS_PER_SECOND);
        }
    }

    handleVisibilityChange() {
        if (document.hidden && this.status === STATE.FOCUSING) {
            // Tab Switch Penalty!
            this.scorer.penalize(CONFIG.SCORING.TAB_SWITCH_PENALTY);
            this.penalties++;
            // Optional: Pause logic? No, let's keep punishing >:) 
            // Or maybe pause to prevent cheating.
            // Let's just penalize but keep running.
        }
    }

    applyCustomDuration() {
        if (this.status === STATE.FOCUSING) return;
        
        const hrs = parseInt(this.ui.els.inputHrs.value) || 0;
        const min = parseInt(this.ui.els.inputMin.value) || 0;
        const sec = parseInt(this.ui.els.inputSec.value) || 0;
        
        // Validate
        let totalMs = (hrs * 3600 + min * 60 + sec) * 1000;
        
        // Clamp: Min 10 seconds, Max 24 hours
        totalMs = Math.max(10000, Math.min(24 * 60 * 60 * 1000, totalMs));
        
        this.duration = totalMs;
        this.timeLeft = totalMs;
        
        this.ui.updateTimer(this.timeLeft, this.duration);
        
        // Flash confirmation
        this.ui.flashDurationInputs();
    }

    loadProgress() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PROGRESS);
        if (saved) {
            const data = JSON.parse(saved);
            this.xp = data.xp || 0;
            this.level = data.level || 1;
        }
        this.ui.updateLevel(this.level, this.xp, this.scorer.getXPForNextLevel());
    }

    saveProgress() {
        const data = {
            xp: this.xp,
            level: this.level
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.PROGRESS, JSON.stringify(data));
    }

    saveSession() {
        const data = {
            status: this.status,
            timeLeft: this.timeLeft,
            duration: this.duration,
            sessionXP: this.sessionXP,
            lastTick: Date.now()
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(data));
    }

    clearSessionData() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
    }
    
    checkActiveSession() {
        const savedSession = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
        if (savedSession) {
            const data = JSON.parse(savedSession);
            
            if (data.status === STATE.FOCUSING) {
                // Calculate time passed while closed
                const timePassed = Date.now() - data.lastTick;
                const newTimeLeft = data.timeLeft - timePassed;
                
                if (newTimeLeft > 0) {
                    // Resume session
                    this.duration = data.duration;
                    this.timeLeft = newTimeLeft;
                    this.sessionXP = data.sessionXP; // Maybe penalty for offline time?
                    
                    // Penalty for leaving (closed tab)
                    this.scorer.penalize(CONFIG.SCORING.TAB_SWITCH_PENALTY * 5); // Heavier penalty
                    this.penalties++;
                    
                    this.startFocus();
                } else {
                    // Session expired while closed
                    this.duration = data.duration;
                    this.timeLeft = 0;
                    this.sessionXP = data.sessionXP;
                    this.completeSession();
                }
            } else if (data.status === STATE.PAUSED) {
                this.duration = data.duration;
                this.timeLeft = data.timeLeft;
                this.sessionXP = data.sessionXP;
                this.pauseFocus();
                this.ui.updateTimer(this.timeLeft, this.duration);
            }
        }
    }
    
    playSound(type) {
        // Placeholder for audio
        // console.log(`Playing sound: ${type}`);
    }
}

class Timer {
    constructor(app) {
        this.app = app;
        this.lastFrameTime = 0;
        this.accumulatedTime = 0;
        this.reqId = null;
    }

    start() {
        this.lastFrameTime = performance.now();
        this.loop();
    }

    stop() {
        if (this.reqId) cancelAnimationFrame(this.reqId);
        this.reqId = null;
    }

    loop() {
        this.reqId = requestAnimationFrame((currentTime) => {
            const delta = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            
            this.accumulatedTime += delta;
            
            this.app.handleTick(delta);
            
            if (this.accumulatedTime >= 1000) {
                this.accumulatedTime -= 1000;
                this.app.handleSecondPassed();
            }
            
            if (this.app.status === STATE.FOCUSING) {
                this.loop();
            }
        });
    }
}

class ScoreSystem {
    constructor(app) {
        this.app = app;
    }

    addXP(amount) {
        this.app.xp += amount;
        this.app.sessionXP += amount;
        this.checkLevelUp();
        this.app.saveProgress();
        this.app.ui.updateLevel(this.app.level, this.app.xp, this.getXPForNextLevel());
    }

    penalize(amount) {
        this.app.ui.showPenalty(amount);
        // We don't subtract global XP (too harsh?), maybe just session score?
        // Let's subtract global XP but not below current level base.
        // For now, simple subtraction.
        this.app.xp = Math.max(0, this.app.xp + amount); // amount is negative
        this.app.saveProgress();
        this.app.ui.updateLevel(this.app.level, this.app.xp, this.getXPForNextLevel());
    }

    checkLevelUp() {
        const xpNeeded = this.getXPForNextLevel();
        if (this.app.xp >= xpNeeded) {
            this.app.level++;
            this.app.ui.spawnConfetti(); // Visual flair
        }
    }

    getXPForNextLevel() {
        // Simple linear curve: Level * 500
        return this.app.level * CONFIG.SCORING.LEVEL_BASE_XP;
    }
    
    calculateEfficiency(sessionDuration) {
        // Ideal points = Duration in seconds + Completion Bonus
        // Actual points = Session XP
        // Efficiency = Actual / Ideal
        const totalSeconds = sessionDuration / 1000;
        const idealXP = totalSeconds + CONFIG.SCORING.COMPLETION_BONUS;
        
        let eff = (this.app.sessionXP / idealXP) * 100;
        return Math.min(100, Math.max(0, eff)).toFixed(1);
    }
}

class UIController {
    constructor(app) {
        this.app = app;
        this.els = {
            timerDisplay: document.getElementById('timer-display'),
            progressRing: document.getElementById('timer-progress'),
            statusBadge: document.getElementById('status-badge'),
            mainBtn: document.getElementById('btn-main'),
            penaltyIndicator: document.getElementById('penalty-indicator'),
            xpDisplay: document.getElementById('xp-display'),
            levelDisplay: document.getElementById('level-display'),
            xpBar: document.getElementById('xp-bar-fill'),
            inputHrs: document.getElementById('input-hrs'),
            inputMin: document.getElementById('input-min'),
            inputSec: document.getElementById('input-sec'),
            modal: document.getElementById('analysis-modal')
        };
        
        // Init Ring
        this.els.progressRing.style.strokeDasharray = `${CONFIG.UI.RING_CIRCUMFERENCE} ${CONFIG.UI.RING_CIRCUMFERENCE}`;
        this.els.progressRing.style.strokeDashoffset = CONFIG.UI.RING_CIRCUMFERENCE;
    }

    init() {
        this.updateTimer(CONFIG.DEFAULT_DURATION_MS, CONFIG.DEFAULT_DURATION_MS);
    }

    updateTimer(timeLeft, totalDuration) {
        // Time Text
        const secs = Math.ceil(timeLeft / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        this.els.timerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        
        // Ring Progress
        const progress = 1 - (timeLeft / totalDuration);
        const offset = CONFIG.UI.RING_CIRCUMFERENCE * (1 - progress); 
        // Note: For countdown, we want ring to deplete or fill. 
        // Let's make it fill. So offset starts at CIRCUMFERENCE (empty) and goes to 0 (full).
        // Actually, usually users like it to deplete. 
        // Let's make it deplete: Starts full (0 offset), goes to empty (CIRCUMFERENCE offset).
        const depleteOffset = CONFIG.UI.RING_CIRCUMFERENCE * progress; 
        this.els.progressRing.style.strokeDashoffset = depleteOffset;
        
        // Title update
        document.title = `${m}:${s.toString().padStart(2, '0')} - Focus Arena`;
    }

    updateStatus(text) {
        this.els.statusBadge.textContent = text;
        this.els.statusBadge.className = `status-badge ${text.toLowerCase()}`;
    }

    updateMainButton(text, type) {
        this.els.mainBtn.textContent = text;
        if (type === 'stop') {
            this.els.mainBtn.classList.add('stop');
        } else {
            this.els.mainBtn.classList.remove('stop');
        }
    }

    updateLevel(level, currentXP, nextLevelXP) {
        this.els.levelDisplay.textContent = level;
        this.els.xpDisplay.textContent = Math.floor(currentXP);
        
        // Calculate progress to next level
        // Previous level XP cap
        const prevLevelXP = (level - 1) * CONFIG.SCORING.LEVEL_BASE_XP;
        const levelProgress = (currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP);
        const width = Math.min(100, Math.max(0, levelProgress * 100));
        
        this.els.xpBar.style.width = `${width}%`;
    }

    showPenalty(amount) {
        this.els.penaltyIndicator.textContent = `${amount} XP`;
        this.els.penaltyIndicator.classList.remove('hidden');
        this.els.penaltyIndicator.classList.add('visible');
        
        setTimeout(() => {
            this.els.penaltyIndicator.classList.remove('visible');
            this.els.penaltyIndicator.classList.add('hidden');
        }, 2000);
    }

    togglePulse(active) {
        if (active) {
            document.querySelector('.timer-section').classList.add('focusing');
        } else {
            document.querySelector('.timer-section').classList.remove('focusing');
        }
    }
    
    flashDurationInputs() {
        const inputs = document.querySelector('.duration-setter');
        inputs.style.borderColor = 'var(--accent)';
        setTimeout(() => {
            inputs.style.borderColor = 'rgba(255,255,255,0.05)';
        }, 300);
    }
    
    showAnalysis(sessionXP, duration) {
        const efficiency = this.app.scorer.calculateEfficiency(duration);
        document.getElementById('modal-efficiency').textContent = `${efficiency}%`;
        document.getElementById('modal-xp').textContent = `+${Math.floor(sessionXP)}`;
        
        // Smart Feedback
        let summary = "Good job!";
        let suggestions = [];
        
        if (efficiency >= 95) {
            summary = "Flawless Victory! You were completely verified.";
            suggestions.push("Keep this flow going!");
        } else if (efficiency >= 80) {
            summary = "Solid Focus. A few distractions, but great work.";
            suggestions.push("Try to eliminate that one tab switch.");
        } else {
            summary = "Fragmented Focus. The Arena demands your attention!";
            suggestions.push("Close other tabs before starting.");
            suggestions.push("Shorten the duration if you're struggling.");
        }
        
        document.getElementById('modal-summary').textContent = summary;
        const ul = document.getElementById('modal-suggestions');
        ul.innerHTML = '';
        suggestions.forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            ul.appendChild(li);
        });
        
        this.toggleModal(true);
    }
    
    toggleModal(show) {
        if (show) {
            this.els.modal.classList.remove('hidden');
        } else {
            this.els.modal.classList.add('hidden');
        }
    }

    spawnConfetti() {
        // Placeholder for visual effect
        alert("LEVEL UP! 🎉"); 
    }
}

// Initialize
const app = new FocusApp();