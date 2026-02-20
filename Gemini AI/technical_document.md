# Gemini Focus Arena - Technical Report

## 1. Project Overview
The Gemini Focus Arena is a high-performance productivity web application refactored from a simple Pomodoro timer. It features a modular class-based architecture, a custom state machine, and browser-native persistence strategies.

---

## 2. Architecture & Refactoring (Phase 2)

### 2.1 Modular Design
The monolithic script was refactored into distinct classes to improve maintainability and separation of concerns:

-   **`FocusApp` (Controller):** Manages the central state machine (`IDLE`, `FOCUSING`, `PAUSED`) and coordinates communication between modules.
-   **`Timer` (Core Logic):** Handles high-precision timing using `requestAnimationFrame` and delta-time calculation to prevent timer drift, which is common with standard `setInterval`.
-   **`ScoreSystem` (Business Logic):** Manages Gamification (XP, Levels), calculates session efficiency, and handles penalties.
-   **`UIController` (View):** Manages all DOM manipulations, SVG animations, and Modal states.

### 2.2 Persistence Strategy
To handle accidental tab closures and browser refreshes, the app implements a robust persistence layer using `localStorage`:

-   **`gemini_focus_progress`:** Persists user progression (Level, Total XP).
-   **`gemini_focus_session`:** Persists the active session snapshot:
    -   `timeLeft`, `duration`, `status`
    -   `lastTick` (Timestamp of the last valid update)
    
**Resume Logic:**
On page load, the app checks for a saved session. If found, it calculates the `timePassed` since `lastTick`.
-   If `timeLeft > timePassed`: The session resumes, but a heavy penalty is applied for the offline time.
-   If `timeLeft < timePassed`: The session is marked as completed (and expired) retroactively.

---

## 3. Debugging Log (Phase 1)

*This section documents critical bugs fixed in the legacy version of the application.*

### 3.1 Bug #1: Assignment vs Comparison
**Issue:** `if (this.isRunning = true)` caused the timer to always assume it was running.
**Fix:** Changed to strict equality `===`.

### 3.2 Bug #3: Double Subtraction
**Issue:** The timer subtracted time twice per tick, causing it to run at 2x speed.
**Fix:** Removed the redundant `this.timeLeft -= 1` line.

### 3.3 Bug #6: Null Reference Protection
**Issue:** `updateTimerDisplay` crashed if the DOM element wasn't found immediately.
**Fix:** Added null checks `if (!this.timerDisplay) return;`.

### 3.4 Logic Flaw: Start New Session
**Issue:** The "Start New Session" button failed to reset internal metrics after a session completion.
**Fix:** Updated `toggleFocus` to explicitly handle `STATE.COMPLETED`, resetting `sessionXP` and `penalties` before starting.

---

## 4. UI/UX Specifications
-   **Theme:** "Deep Space" (Dark Mode) with Neon Blue/Cyan accents.
-   **Styling:** CSS Custom Properties (Variables) for easy theming.
-   **Feedback:** Shake animations for penalties, pulse animations for focus state.
-   **Inputs:** Custom `input[type="number"]` implementation for HH:MM:SS selection.
