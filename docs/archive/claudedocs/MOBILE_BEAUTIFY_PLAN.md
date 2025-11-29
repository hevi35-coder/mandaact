# Mobile App Beautify Plan

**Date**: 2025-11-29
**Status**: ✅ Completed

## Overview

모바일 앱 전체에 대한 뷰티파이 작업 계획입니다. 사용자 관점에서 세련되고 가독성 좋으며 심미성 있는 디자인을 적용합니다.

## 1. Font System (Pretendard)

### 1.1 Installation
- `expo-font` + Pretendard Variable 웹폰트 적용
- Font weights: Light(300), Regular(400), Medium(500), SemiBold(600), Bold(700)

### 1.2 Typography Scale (Readability Focused)

| Purpose | Before | After | Notes |
|---------|--------|-------|-------|
| Page Title | text-2xl (24px) | text-3xl (30px) | More emphasis |
| Section Title | text-lg (18px) | text-xl (20px) | |
| Card Title | text-base (16px) | text-lg (18px) | |
| Body Text | text-sm (14px) | text-base (16px) | Minimum size |
| Sub Text | text-xs (12px) | text-sm (14px) | Improved readability |
| Caption/Hint | text-[10px] | text-xs (12px) | Min 12px maintained |

## 2. Layout Improvements

### 2.1 Header
| Item | Before | After |
|------|--------|-------|
| Height | h-14 (56px) | h-16 (64px) |
| Brand Size | text-xl (20px) | text-2xl (24px) |
| Settings Icon | 22px | 24px |
| Padding | px-4 | px-5 |

### 2.2 Bottom Tab Navigation
| Item | Before | After |
|------|--------|-------|
| Height | 60px | 72px |
| Icon Size | 24px | 26px |
| Label Size | 11px | 12px |
| Label Weight | 500 | 600 |
| Padding | 8px top/bottom | 10px top, 12px bottom |

## 3. Card & Component Design

### 3.1 Card Style
| Item | Before | After |
|------|--------|-------|
| Border Radius | rounded-2xl (16px) | rounded-3xl (24px) |
| Padding | p-5 | p-6 |
| Border Color | border-gray-200 | border-gray-100 |
| Shadow | shadow-sm | Softer shadow |

### 3.2 Shadow Style
```javascript
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
}
```

### 3.3 Button Style
- Larger touch area (min-h-12)
- Border radius: rounded-xl → rounded-2xl
- Font weight: semibold → bold

### 3.4 Input Field
- Height: py-3 → py-4
- Border radius: rounded-xl → rounded-2xl
- Font size: text-base (16px) maintained

## 4. Spacing System

### 4.1 Screen Padding
| Location | Before | After |
|----------|--------|-------|
| Horizontal | px-4 (16px) | px-5 (20px) |
| Top | pt-4 (16px) | pt-5 (20px) |

### 4.2 Element Spacing
| Type | Before | After |
|------|--------|-------|
| Card Gap | mb-4 | mb-5 |
| Section Gap | space-y-3 | space-y-4 |

## 5. Visual Effects

### 5.1 Gradient Usage
- Extend brand logo gradient to key UI elements
- Apply to progress bars, highlights

### 5.2 Touch Feedback
- Card press: scale(0.98) animation
- Button press: clear visual change
- Checkbox: haptic feedback consideration

## 6. Files to Modify

| File | Changes |
|------|---------|
| `App.tsx` | Font loading setup |
| `tailwind.config.js` | Custom font, colors, spacing |
| `Header.tsx` | Size increase |
| `RootNavigator.tsx` | Bottom tab style |
| `HomeScreen.tsx` | Typography, card styles |
| `TodayScreen.tsx` | Typography, card styles |
| `MandalartListScreen.tsx` | Typography, card styles |
| `ReportsScreen.tsx` | Typography, card styles |
| `MandalartDetailScreen.tsx` | Typography, card styles |
| All other screens & components | Unified styles |

## 7. Implementation Order

1. Font setup - Load and apply Pretendard
2. tailwind.config.js - Add custom settings
3. Header component - Size increase
4. Bottom navigation - Size increase
5. Common styles - Cards, buttons, inputs
6. Apply to each screen - Typography and spacing

## Completed Tasks

- [x] Document beautify plan
- [x] Install Pretendard font
- [x] Update tailwind.config.js
- [x] Update Header component
- [x] Update bottom navigation
- [x] Apply to HomeScreen
- [x] Apply to TodayScreen
- [x] Apply to MandalartListScreen
- [x] Apply to ReportsScreen
- [x] Apply to SettingsScreen
- [x] Apply to BadgeScreen
- [x] Apply to MandalartDetailScreen
- [x] Apply to MandalartCreateScreen

## Status: ✅ COMPLETED (2025-11-29)
