/**
 * App Configuration & Feature Toggles
 */

// Toggle this to true when capturing App Store assets
export const IS_SCREENSHOT_MODE = true;

// Mock data used during screenshot mode
export const SCREENSHOT_DATA = {
    currentStreak: 99,
    longestStreak: 100,
    level: 20,
    totalXP: 0, // Set to 0 to auto-calculate based on level, or specify a number
    xpProgress: 0.85,
    badges: ['streak_30', 'monthly_streak_30', 'daily_marathon'],
    lastCheckDate: new Date().toISOString(),
    // Custom heatmap data override (optional)
    heatmapData: null,
};
