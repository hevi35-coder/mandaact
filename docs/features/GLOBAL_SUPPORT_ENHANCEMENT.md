# Global Support Enhancement Plan

## Overview

This document outlines the requirements and implementation plan for enhancing MandaAct's global support capabilities.

---

## 1. AI Report Generation Global Support

### Current State
- **Weekly Report (`generate-report/index.ts`)**: All prompts are in Korean
  - `systemPrompt`: Korean instructions for JSON structure
  - `userPrompt`: Korean data labels ("실천일수", "총 실천횟수", etc.)
  - Day names: Korean ("월요일", "화요일", etc.)
  - Time periods: Korean ("아침", "오후", "저녁", "밤")
  - Period labels: Korean ("지난 주", "지난 달", "최근")

- **Goal Diagnosis**: Same Korean-only prompts for SMART analysis

### Proposed Solution

#### Option A: Language Parameter (Recommended)
Pass `language` parameter from client to Edge Function:

```typescript
// Client call
const response = await fetch('/functions/v1/generate-report', {
  body: JSON.stringify({
    report_type: 'weekly',
    language: i18n.language // 'en' or 'ko'
  })
})

// Edge Function
const prompts = {
  en: {
    systemPrompt: `You are a data analysis expert...`,
    dayNames: ['Sunday', 'Monday', 'Tuesday', ...],
    timeNames: { morning: 'Morning', afternoon: 'Afternoon', ... }
  },
  ko: {
    systemPrompt: `당신은 데이터 분석 전문가입니다...`,
    dayNames: ['일요일', '월요일', '화요일', ...],
    timeNames: { morning: '아침', afternoon: '오후', ... }
  }
}
```

#### Option B: User Profile Language
Store language preference in `user_profiles` table and read during report generation.

### Implementation Tasks
1. [ ] Add bilingual prompt templates to `generate-report/index.ts`
2. [ ] Add `language` parameter to API request
3. [ ] Update `collectReportData()` to use localized labels
4. [ ] Update mobile app to pass `language` in report generation calls
5. [ ] Test reports in both languages

### Effort Estimate
- Edge Function modification: 2-3 hours
- Mobile app changes: 30 minutes
- Testing: 1 hour

---

## 2. Timezone Global Support

### Current State
- All dates use server time (UTC) or KST
- `check_history.checked_at` stored as UTC timestamp
- Streak calculation assumes KST timezone
- "Today" filtering in `TodayScreen` may not match user's actual day

### Problem Scenarios
| User Location | Server Time | User's "Today" | Issue |
|---------------|-------------|----------------|-------|
| New York (EST) | 2025-01-01 03:00 UTC | Dec 31 still | Shows "tomorrow's" actions |
| Tokyo (JST) | 2025-01-01 03:00 UTC | Jan 1 afternoon | Correct |
| London (GMT) | 2025-01-01 03:00 UTC | Jan 1 morning | Correct |

### Proposed Solution

#### Phase 1: Client-side Timezone Handling
```typescript
// Store user's timezone in profile
interface UserProfile {
  timezone: string // e.g., 'America/New_York', 'Asia/Seoul'
}

// Calculate "today" based on user's timezone
const userToday = new Date().toLocaleDateString('en-CA', {
  timeZone: userProfile.timezone
})
```

#### Phase 2: Server-side Awareness
```sql
-- Add timezone column to user_profiles
ALTER TABLE user_profiles ADD COLUMN timezone TEXT DEFAULT 'Asia/Seoul';

-- Streak calculation considering timezone
CREATE OR REPLACE FUNCTION calculate_streak(user_id UUID, user_tz TEXT)
RETURNS INTEGER AS $$
  -- Convert checked_at to user's local date
  SELECT COUNT(DISTINCT (checked_at AT TIME ZONE user_tz)::DATE) ...
$$;
```

### Implementation Tasks
1. [ ] Add `timezone` field to user registration
2. [ ] Auto-detect timezone from device on first launch
3. [ ] Allow manual timezone selection in Settings
4. [ ] Update `TodayScreen` to filter by user's local date
5. [ ] Update streak calculation RPC to accept timezone parameter
6. [ ] Update check history queries to respect timezone

### Effort Estimate
- Database schema: 30 minutes
- Auto-detection: 1 hour
- TodayScreen updates: 2 hours
- Streak calculation: 2-3 hours
- Testing across timezones: 2 hours

---

## 3. Language Selection on Login Screen

### Current State
- Language selector only available in Settings (requires login)
- Default language based on device locale
- New users see Korean if device locale is not supported

### Problem
- Users who prefer a different language than device default cannot change it before signing up
- App Store users from different regions may be confused

### Proposed Solution

#### UI Design
```
┌─────────────────────────────┐
│  🌐 EN ▼                    │  ← Top-right corner
├─────────────────────────────┤
│                             │
│         MandaAct            │
│   AI-Powered Goal Tracker   │
│                             │
│     [ Sign in with Google ] │
│     [ Sign in with Apple  ] │
│                             │
└─────────────────────────────┘
```

### Implementation Tasks
1. [ ] Add language selector dropdown to `LoginScreen`
2. [ ] Store selected language in AsyncStorage before login
3. [ ] Apply language change immediately without reload
4. [ ] Keep existing Settings language selector for logged-in users

### Code Changes
```typescript
// LoginScreen.tsx
const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

// Top-right language selector
<Pressable onPress={() => setShowLanguageDropdown(true)}>
  <View className="flex-row items-center">
    <Globe size={16} />
    <Text>{i18n.language === 'ko' ? '한국어' : 'English'}</Text>
    <ChevronDown size={12} />
  </View>
</Pressable>
```

### Effort Estimate
- UI implementation: 1-2 hours
- Language persistence: 30 minutes
- Testing: 30 minutes

---

## 4. Signup Language & Timezone Settings

### Current State
- No explicit language/timezone selection during signup
- OAuth signup (Google/Apple) doesn't collect additional preferences
- Language defaults to device locale
- Timezone not stored

### Options Analysis

| Option | Pros | Cons |
|--------|------|------|
| A: Add during signup | Explicit user choice | Adds friction to signup |
| B: Post-signup prompt | Non-blocking | Easy to dismiss |
| C: Auto-detect + Settings | Seamless onboarding | May need correction later |

### Recommendation: Option C (Auto-detect + Settings)

**Rationale:**
- OAuth signup should remain frictionless (1-click)
- Most users' device settings match their preferences
- Power users can change in Settings
- Can show a one-time "confirm your settings" prompt after first login

### Implementation Flow
```
OAuth Login → Auto-detect Language/Timezone → Save to Profile →
(Optional) Show confirmation toast: "Using English, Asia/Seoul timezone"
```

### Implementation Tasks
1. [ ] Add auto-detection on first login
2. [ ] Store detected values in `user_profiles`
3. [ ] Add timezone selector to Settings screen
4. [ ] (Optional) Add one-time confirmation prompt

### Effort Estimate
- Auto-detection: 1 hour
- Database storage: 30 minutes
- Settings UI: 1 hour
- Confirmation prompt: 1 hour (optional)

---

## Priority & Roadmap

### Phase 1: Essential (Week 1)
1. **Login screen language selector** - Highest impact, lowest effort
2. **Auto-detect timezone** - Foundation for other features

### Phase 2: Core (Week 2)
3. **AI Report localization** - Major feature for global users
4. **TodayScreen timezone support** - Critical for daily usage

### Phase 3: Polish (Week 3)
5. **Streak calculation timezone** - Accuracy improvement
6. **Settings timezone selector** - User control

---

## Technical Notes

### Timezone Libraries
- **Recommended**: `date-fns-tz` (already in project)
- Auto-detect: `Intl.DateTimeFormat().resolvedOptions().timeZone`

### Database Changes
```sql
-- Migration: Add timezone to user_profiles
ALTER TABLE user_profiles
ADD COLUMN timezone TEXT DEFAULT 'Asia/Seoul',
ADD COLUMN language TEXT DEFAULT 'ko';

-- Index for efficient queries
CREATE INDEX idx_user_profiles_timezone ON user_profiles(timezone);
```

### Testing Checklist
- [ ] Test with device set to different timezones
- [ ] Test streak calculation at day boundaries
- [ ] Test report generation in both languages
- [ ] Test language switch persistence across app restarts
- [ ] Test with users in EST, PST, GMT, JST timezones

---

## Implementation Progress

### Status Legend
- [ ] Not started
- [x] Completed
- [~] In progress

### Phase 1: Essential (P0)
| Task | Status | Completed Date |
|------|--------|----------------|
| P0-1: Login screen language selector | [x] | 2025-11-30 |
| P0-2: Auto-detect timezone | [x] | 2025-11-30 |

### Phase 2: Core (P1)
| Task | Status | Completed Date |
|------|--------|----------------|
| P1-1: AI Report localization | [x] | 2025-11-30 |
| P1-2: TodayScreen timezone support | [x] | 2025-11-30 |

### Phase 3: Polish (P2)
| Task | Status | Completed Date |
|------|--------|----------------|
| P2-1: Streak calculation timezone | [x] | 2025-11-30 |
| P2-2: Settings timezone selector UI | [x] | 2025-11-30 |

---

## Summary

| Feature | Effort | Priority | Impact |
|---------|--------|----------|--------|
| Login language selector | Low | P0 | High |
| Auto-detect timezone | Low | P0 | High |
| AI Report localization | Medium | P1 | High |
| TodayScreen timezone | Medium | P1 | High |
| Streak timezone | Medium | P2 | Medium |
| Settings timezone UI | Low | P2 | Medium |
| Signup flow changes | Low | P3 | Low |

**Total Estimated Effort: 15-20 hours**

---

## Additional Timezone Impact (2025-11-30)

### Notification System Updates
All notification functions have been updated to use user timezone:

1. **Daily Reminder** (`process_daily_reminder_notifications`)
   - Now runs hourly and checks each user's local time
   - Matches user's `reminder_hour` with their local timezone
   - Messages localized for ko/en

2. **Streak Warning** (`process_streak_warning_notifications`)
   - "Today" calculated in user's timezone
   - Messages localized for ko/en

3. **Comeback Notification** (`process_comeback_notifications`)
   - Days since last check calculated in user's timezone
   - Messages localized for ko/en

4. **Weekly Report** (`scheduled-report` Edge Function)
   - SQL function returns `user_timezone` and `user_language`
   - AI report generated in user's language
   - Push notification localized

### Migration Files Added
- `20251130000010_timezone_aware_notifications.sql`
- `20251130000011_timezone_aware_weekly_report.sql`

### Edge Functions Updated
- `scheduled-report/index.ts` - v2 with timezone & i18n support
- `streak-warning/index.ts` - v2 with i18n support (ko/en messages)
- `comeback-notification/index.ts` - v2 with i18n support (ko/en messages)
