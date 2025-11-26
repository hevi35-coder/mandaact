# Mobile App IA Unification Plan

**Date**: 2025-11-27
**Status**: ✅ COMPLETED
**Priority**: HIGH
**Goal**: 모바일앱 탭 구조를 웹앱과 동일하게 통일

---

## Executive Summary

웹앱과 모바일앱의 Information Architecture(IA)가 상이하여 사용자 경험 일관성이 떨어짐. 웹앱 기준 4탭 구조로 모바일앱을 통일하여 크로스 플랫폼 UX 일관성 확보.

---

## Current State Comparison

### Tab Navigation Structure

| Position | Web App (4 tabs) | Mobile App (5 tabs) | Gap |
|----------|------------------|---------------------|-----|
| 1 | 🏠 홈 | 🏠 홈 | ✅ Match |
| 2 | 📅 투데이 | ✅ 오늘 | ⚠️ Label differs |
| 3 | 📊 만다라트 | 📊 만다라트 | ✅ Match |
| 4 | 📝 리포트 | 📈 통계 | ❌ Different |
| 5 | - | ⚙️ 설정 | ❌ Extra tab |

### Access Pattern Comparison

| Feature | Web Access | Mobile Access | Issue |
|---------|------------|---------------|-------|
| Reports | Main Tab (4th) | Stack Screen (from Home) | Low discoverability |
| Stats | Part of Home | Main Tab (4th) | Inconsistent |
| Settings | Bell icon (top) | Main Tab (5th) | Over-promoted |
| Badges | Section in Home | Stack Screen | Consistent |

---

## Target State (Option A)

### New Mobile Tab Structure (4 tabs)

```
┌─────────┬─────────┬─────────┬─────────┐
│   홈    │ 투데이   │ 만다라트 │ 리포트   │
│  Home   │  Today  │Mandalart│ Reports │
│   🏠    │   📅    │   📊    │   📝    │
└─────────┴─────────┴─────────┴─────────┘
```

### Removed/Relocated Features

| Feature | Current | Target | Notes |
|---------|---------|--------|-------|
| 통계 탭 | Tab #4 | 홈에 통합 | 히트맵, 스트릭은 홈 하단에 |
| 설정 탭 | Tab #5 | 홈 우측상단 아이콘 | 웹과 동일한 접근 패턴 |
| 리포트 | Stack Screen | Tab #4 | 메인 탭으로 승격 |

---

## Implementation Tasks

### Phase 1: Tab Structure Change

#### Task 1.1: Update RootNavigator.tsx
- [x] Remove Stats tab
- [x] Remove Settings tab
- [x] Add Reports tab (4th position)
- [x] Change "오늘" label to "투데이"

```typescript
// Target tab configuration
<Tab.Screen name="Home" ... tabBarLabel="홈" />
<Tab.Screen name="Today" ... tabBarLabel="투데이" />  // Changed from "오늘"
<Tab.Screen name="Mandalart" ... tabBarLabel="만다라트" />
<Tab.Screen name="Reports" ... tabBarLabel="리포트" />  // NEW - was Stack
```

#### Task 1.2: Update MainTabParamList Type
```typescript
export type MainTabParamList = {
  Home: undefined
  Today: undefined
  Mandalart: undefined
  Reports: undefined  // NEW
  // Removed: Stats, Settings
}
```

### Phase 2: Feature Relocation

#### Task 2.1: Integrate Stats into HomeScreen
- [ ] Add heatmap section to HomeScreen (below level card)
- [ ] Add streak stats to HomeScreen
- [ ] Keep XP/Level display in HomeScreen (already exists)

#### Task 2.2: Settings Access via Icon
- [x] Add settings icon to HomeScreen header (top-right)
- [x] Navigate to Settings as Stack Screen
- [x] Update RootStackParamList to include Settings

```typescript
// HomeScreen header
<View className="flex-row justify-between">
  <Text>홈</Text>
  <Pressable onPress={() => navigation.navigate('Settings')}>
    <Settings size={24} />
  </Pressable>
</View>
```

### Phase 3: Screen Updates

#### Task 3.1: ReportsScreen Enhancement
- [ ] Ensure full feature parity with web ReportsPage
- [ ] Weekly report generation
- [ ] Goal diagnosis

#### Task 3.2: HomeScreen Enhancement
- [ ] Add mini heatmap (from StatsScreen) - Future
- [x] Add streak display (from StatsScreen) - Already exists
- [x] Settings icon in header

#### Task 3.3: Remove/Archive StatsScreen
- [ ] Keep file for reference but remove from navigation
- [ ] Or delete entirely after confirming all features migrated

---

## File Changes Summary

| File | Action | Details |
|------|--------|---------|
| `RootNavigator.tsx` | MODIFY | Tab structure, types |
| `HomeScreen.tsx` | MODIFY | Add stats section, settings icon |
| `ReportsScreen.tsx` | MODIFY | Tab-ready styling |
| `StatsScreen.tsx` | ARCHIVE | Features moved to Home |
| `SettingsScreen.tsx` | KEEP | Stack access only |

---

## Testing Checklist

- [x] All 4 tabs navigate correctly
- [x] Tab icons and labels match web
- [x] Settings accessible from Home header
- [ ] Stats features visible in Home - Future (heatmap integration)
- [x] Reports fully functional as tab
- [x] No broken navigation links
- [x] Quick actions in Home still work

---

## Rollback Plan

If issues arise:
1. Git revert to previous commit
2. Only navigation changes, no data/API impact
3. Low regression risk

---

## Success Metrics

1. **Tab Count**: 5 → 4 (matches web)
2. **Label Consistency**: All labels match web
3. **Feature Accessibility**: All features accessible within 2 taps
4. **User Journey**: Same flow on web and mobile

---

## Notes

- Icon color should remain `#374151` (gray-700) for inactive, `#667eea` for active
- Tab bar height: 60px (keep current)
- Consider adding haptic feedback on tab switch (future)
