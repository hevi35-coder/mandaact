/**
 * App Configuration & Feature Toggles
 */

// Toggle this to true when capturing App Store assets
export const IS_SCREENSHOT_MODE = true;

// Mock data used during screenshot mode
export const SCREENSHOT_DATA = {
    nickname: 'ASO_Expert',
    currentStreak: 99,
    longestStreak: 100,
    level: 25,
    totalXP: 0, // Set to 0 to auto-calculate based on level, or specify a number
    xpProgress: 0.85,
    totalChecks: 1004,
    activeDays: 248,
    badges: [
        'first_check', 'first_mandalart', // Getting Started (2/2)
        'streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100', 'streak_150', // Streak Badges (7/7)
        'checks_50', 'checks_100', 'checks_250', 'checks_500', 'checks_1000' // Check Milestones (5/7 - up to Grand Master)
    ],
    lastCheckDate: new Date().toISOString(),
    // Custom heatmap data override (optional)
    heatmapData: null,
};
