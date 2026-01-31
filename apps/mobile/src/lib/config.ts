/**
 * App Configuration & Feature Toggles
 */

// Toggle this to true when capturing App Store assets
export const IS_SCREENSHOT_MODE = false;

// Mock data used during screenshot mode
export const SCREENSHOT_DATA = {
    currentStreak: 127,
    longestStreak: 152,
    level: 15,
    xpProgress: 0.85,
    badges: ['streak_30', 'monthly_streak_30', 'daily_marathon'],
    lastCheckDate: new Date().toISOString(),
};
