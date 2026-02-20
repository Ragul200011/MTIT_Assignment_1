# 🚀 Gemini Focus Arena

**Version 2.0.0** - A next-generation gamified productivity timer featuring deep-space aesthetics, robust session persistence, and RPG-style progression. Built for those who need to stay in the zone.

---

## 📋 Table of Contents

- [Features](#-features)
- [What's New in v2.0](#-whats-new-in-v20)
- [Quick Start](#-quick-start)
- [User Guide](#-user-guide)
- [Technical Overview](#-technical-overview)
- [Configuration](#-configuration)
- [Browser Compatibility](#-browser-compatibility)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🎯 Core Functionality
- ⏱️ **Drift-Free Timing**: Utilizes `requestAnimationFrame` and delta-time calculation for millisecond precision.
- 🌌 **Deep Space Theme**: Immersive dark mode with neon blue/cyan accents and glassmorphism.
- 💾 **Session Persistence**: Closing the tab doesn't lose your progress—the app remembers and resumes.
- ⏲️ **Custom Duration**: Set exact times with dedicated **HH:MM:SS** inputs.
- 🔄 **Smart Recovery**: Detects interruptions and applies penalties for closing the app mid-session.

### 🏆 Gamification System
- 📈 **XP Progression**: Earn XP for every second of focus.
- 🆙 **Leveling**: Climb the ranks from Novice to Focus Master.
- ⚡ **Efficiency Ratng**: Get a 0-100% score based on your focus quality vs. time.
- 🏅 **Visual Rewards**: Watch your XP bar fill and level up in real-time.

### 🛡️ Distraction Monitoring
- 👁️ **Tab Switch Detection**: Instant penalty for leaving the improved Focus Arena.
- 🚫 **Anti-Cheat**: Minimizing or closing the window triggers a "Desertion Penalty".
- 🔔 **Visual Feedback**: The UI pulses and status updates to reflect your current focus state.

---

## 🆕 What's New in v2.0

### 🎨 Complete UI Overhaul
- **Focus Ring**: Replaced static text with a dynamic SVG progress ring.
- **Glassmorphism**: Added frosted glass effects to the container and modal.
- **Animations**: Smooth transitions, pulse effects, and shake animations for penalties.

### 🛠️ Technical Refactor
- **Modular Architecture**: Split monolithic code into `FocusApp`, `Timer`, `ScoreSystem`, and `UIController`.
- **LocalStorage**: Implemented robust saving for XP, Levels, and Active Sessions.
- **State Machine**: Introduced strict states (`IDLE`, `FOCUSING`, `PAUSED`, `COMPLETED`) for reliable logic.

---

## 🚀 Quick Start

### Prerequisites
- Any modern web browser (Chrome, Firefox, Safari, Edge).
- No server required! Run directly or via a local server.

### Installation

1.  **Clone/Download:**
    ```bash
    git clone https://github.com/your-repo/gemini-focus-arena.git
    ```

2.  **Open Application:**
    -   Double-click `index.html` to open in your default browser.
    -   *Optional:* Use strict `http-server` if preferred, but it works out of the box.

3.  **Start Focusing!**

---

## 📖 User Guide

### Setting Duration
1.  Use the **HH**, **MM**, **SS** input fields to set your target time.
    -   *Example:* `00` h `45` m `00` s for a deep work block.
2.  Press **Enter** or click the **Refresh Icon** to lock in the duration.
3.  The Focus Ring will update to reflect the new time.

### The Focus Session
1.  Click **Start Focus**. The ring will begin to deplete.
2.  **Stay Focused!** Leaving the tab will deduct **10 XP**.
3.  **Don't Close!** Closing the tab will deduct **50 XP** when you return.
4.  **Pause**: Need a bio break? Click **Pause** (no penalty).

### Scoring Rules
-   **+1 XP** per second of focus.
-   **+100 XP** Bonus for completing a session.
-   **-10 XP** for Tab Switching.
-   **-50 XP** for Session Interruption (Closing tab).

### Session Analysis
When the timer hits 0, a **Session Report** modal appears:
-   **Efficiency**: Your focus quality percentage.
-   **XP Earned**: Total XP gained this session.
-   **Constructive Feedback**: AI-driven tips based on your efficiency score.

---

## 🔧 Technical Overview

### Architecture

**Pattern:** Modular Object-Oriented Design (MVC-lite)

```
┌──────────────┐
│   FocusApp   │  <-- Main Controller (State Machine)
└──────┬───────┘
       │
   ┌───┼──────────────┬──────────────┐
   ▼   ▼              ▼              ▼
┌────────┐    ┌─────────────┐    ┌─────────────┐
│ Timer  │    │ ScoreSystem │    │UIController │
│ (Logic)│    │ (Business)  │    │   (View)    │
└────────┘    └─────────────┘    └─────────────┘
```

### Key Components
1.  **FocusApp**: Central hub. Manages `localStorage` and `visibilitychange` events.
2.  **Timer**: Uses `requestAnimationFrame` for high-precision, non-blocking timing.
3.  **ScoreSystem**: Handles XP math, leveling curves, and penalty application.
4.  **UIController**: Manages DOM updates, SVG drawing, and modal visibility.

### Persistence Logic
The app uses `localStorage` to survive refreshes:
-   **State**: `gemini_focus_session` stores the timestamp and status.
-   **Progress**: `gemini_focus_progress` stores total XP and Level.
-   **Resume**: On load, it calculates `Date.now() - savedTime` to fast-forward the timer or expire it.

---

## ⚙️ Configuration

You can tweak the experience in `scripts/scripts.js`:

```javascript
const CONFIG = {
    DEFAULT_DURATION_MS: 25 * 60 * 1000,
    SCORING: {
        POINTS_PER_SECOND: 1,
        TAB_SWITCH_PENALTY: -10,
        COMPLETION_BONUS: 100,
        LEVEL_BASE_XP: 500
    },
    // ...
};
```

---

## 🌐 Browser Compatibility

| Browser | Supported? | Notes |
| :--- | :---: | :--- |
| **Chrome** | ✅ | Best experience |
| **Firefox** | ✅ | Full support |
| **Edge** | ✅ | Full support |
| **Safari** | ✅ | Works great |
| **IE11** | ❌ | Not supported (Modern ES6+ used) |

---

## 🐛 Troubleshooting

**App doesn't resume after refresh?**
-   Local Storage might be disabled or full. Check your browser settings.
-   You may have been away longer than the remaining time; the session expired correctly.

**No sound on completion?**
-   Browsers block auto-playing audio. You must interact with the page (click anywhere) at least once.

---

**Built with 💙 by Gemini AI**
