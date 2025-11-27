# Mobile App Improvement Roadmap

**Date**: 2025-11-27 (Updated)
**Goal**: 웹앱 디자인에 맞춰 네이티브 앱 스타일링 개선 + 코드 품질 확보
**Approach**: 버전 변경 없이 최소 변경으로 최대 효과
**Status**: ✅ **100% 완료** - 모든 Phase 및 Sprint 완료

---

## Executive Summary

웹앱과 모바일 앱의 디자인 차이를 분석하고, 효율적인 통일 전략을 수립합니다.

---

## ✅ Phase 0: IA Unification (Priority: CRITICAL) - COMPLETED

> **상세 문서**: [MOBILE_IA_UNIFICATION.md](./MOBILE_IA_UNIFICATION.md)

웹앱과 모바일앱의 탭 구조가 상이하여 사용자 경험 일관성 문제 발생. 웹앱 기준 4탭 구조로 통일.

### Current vs Target

| Position | Before | After | Web |
|----------|--------|-------|-----|
| 1 | 홈 | 홈 | 홈 |
| 2 | 오늘 | **투데이** ✅ | 투데이 |
| 3 | 만다라트 | 만다라트 | 만다라트 |
| 4 | 통계 | **리포트** ✅ | 리포트 |
| 5 | 설정 | ❌ 제거 ✅ | - |

### Tasks
- [x] RootNavigator.tsx 탭 구조 변경 (5탭 → 4탭)
- [x] "오늘" → "투데이" 라벨 변경
- [x] 통계 탭 제거, HomeScreen에 통합 (히트맵, 스트릭 카드 추가)
- [x] 설정 탭 제거, 홈 우측 상단 아이콘으로 이동
- [x] ReportsScreen을 메인 탭으로 승격

### Current State Comparison

| 항목 | Web | Mobile | Gap |
|-----|-----|--------|-----|
| Primary Color | HSL variables (#0a0a0a) | #667eea (Indigo) | Different |
| Action Colors | routine(blue), mission(green), reference(amber) | routine(indigo), mission(amber), reference(gray) | Different |
| Card Style | shadcn/ui Card components | View + direct styling | Different |
| Animation | Framer Motion | None | Missing |
| Typography | Pretendard + system | System only | Missing font |
| Dark Mode | Supported | Not supported | Missing |

---

## Phase 1: Design Token Unification (Priority: HIGH)

### 1.1 Color System Update
**File**: `apps/mobile/tailwind.config.js`
**Effort**: 1-2 hours

```javascript
// Current
colors: {
  primary: {
    DEFAULT: '#667eea', // Indigo
    ...
  }
}

// Target - Match web action type colors
colors: {
  primary: {
    DEFAULT: '#0a0a0a',  // Match web primary (dark)
    foreground: '#fafafa',
  },
  // Action type colors (from web)
  actionType: {
    routine: {
      DEFAULT: '#3b82f6',  // Blue
      light: '#eff6ff'
    },
    mission: {
      DEFAULT: '#10b981',  // Green (not amber!)
      light: '#f0fdf4'
    },
    reference: {
      DEFAULT: '#f59e0b',  // Amber
      light: '#fffbeb'
    }
  },
  // Semantic colors
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
  card: '#ffffff',
}
```

### 1.2 Action Type Icon Colors
**File**: `apps/mobile/src/screens/TodayScreen.tsx`
**Effort**: 30 min

```typescript
// Current (line 46-55)
function ActionTypeIcon({ type, size = 16 }) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#667eea" />  // Indigo
    case 'mission':
      return <Target size={size} color="#f59e0b" />    // Amber
    case 'reference':
      return <Lightbulb size={size} color="#6b7280" /> // Gray
  }
}

// Target - Match web colors
function ActionTypeIcon({ type, size = 16 }) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#3b82f6" />  // Blue (web)
    case 'mission':
      return <Target size={size} color="#10b981" />    // Green (web)
    case 'reference':
      return <Lightbulb size={size} color="#f59e0b" /> // Amber (web)
  }
}
```

---

## Phase 2: Component Styling (Priority: HIGH)

### 2.1 Card Component Styling
**Files**: All screens using card patterns
**Effort**: 2-3 hours

**Web Card Pattern:**
```html
<Card>
  <CardHeader>
    <CardTitle className="text-base">Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

**Mobile Target Pattern:**
```tsx
<View className="bg-white rounded-xl border border-gray-200 shadow-sm">
  <View className="px-4 pt-4 pb-2">
    <Text className="text-base font-semibold text-gray-900">Title</Text>
  </View>
  <View className="px-4 pb-4">Content</View>
</View>
```

### 2.2 Progress Bar Styling
**Web Style:**
- Background: `bg-gray-200`
- Progress: `bg-primary` (dark)
- Height: `h-3`
- Border Radius: `rounded-full`

**Mobile Current:**
```tsx
<View className="h-2 bg-white/30 rounded-full">
  <View className="h-full bg-white rounded-full" />
</View>
```

**Mobile Target:**
```tsx
<View className="h-3 bg-gray-200 rounded-full overflow-hidden">
  <View className="h-full bg-gray-900 rounded-full" />
</View>
```

### 2.3 Button Styling
**Create shared Button component**
**File**: `apps/mobile/src/components/ui/Button.tsx`

```tsx
type ButtonVariant = 'default' | 'outline' | 'ghost'

interface ButtonProps {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onPress?: () => void
  disabled?: boolean
}

export function Button({ variant = 'default', size = 'md', children, onPress, disabled }: ButtonProps) {
  const baseClass = "rounded-lg items-center justify-center flex-row"

  const variantClass = {
    default: "bg-gray-900",
    outline: "bg-white border border-gray-300",
    ghost: "bg-transparent",
  }[variant]

  const sizeClass = {
    sm: "px-3 py-2",
    md: "px-4 py-3",
    lg: "px-6 py-4",
  }[size]

  const textClass = {
    default: "text-white font-semibold",
    outline: "text-gray-900 font-semibold",
    ghost: "text-gray-600",
  }[variant]

  return (
    <Pressable
      className={`${baseClass} ${variantClass} ${sizeClass} ${disabled ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className={textClass}>{children}</Text>
    </Pressable>
  )
}
```

---

## Phase 3: Screen-by-Screen Improvements ✅

### 3.1 HomeScreen Improvements ✅
**File**: `apps/mobile/src/screens/HomeScreen.tsx`
**Effort**: 2-3 hours

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Header | "안녕하세요! 👋" | "홈" + "성장 대시보드" subtitle (like web) | ✅ |
| Stats Card | Blue numbers | Monochrome with accent | ✅ |
| Level Card | Full Indigo bg | White card with progress | ✅ |
| Quick Actions | Colored backgrounds | Outline style buttons | ✅ |
| Tutorial Banner | Gradient bg | Outline with icon | ✅ |
| Settings Icon | N/A | Header 우측 상단 | ✅ |
| Streak Cards | N/A | 현재/최장 스트릭 | ✅ |
| Activity Heatmap | N/A | 월별 히트맵 | ✅ |

**Specific Changes:**

```tsx
// Current Header
<Text className="text-2xl font-bold text-gray-900">안녕하세요! 👋</Text>

// Target Header (match web HomePage.tsx:95-98)
<View className="flex-row items-center mb-4">
  <Text className="text-3xl font-bold text-gray-900">홈</Text>
  <Text className="text-gray-500 ml-3 text-sm">성장 대시보드</Text>
</View>
```

```tsx
// Current Level Card (line 105-134) - Full colored card
<View className="bg-primary rounded-2xl p-6 mb-4">

// Target - White card with subtle accent
<View className="bg-white rounded-2xl p-6 mb-4 border border-gray-200 shadow-sm">
  <View className="flex-row justify-between items-center">
    <View>
      <Text className="text-gray-500 text-sm">현재 레벨</Text>
      <Text className="text-gray-900 text-3xl font-bold">Lv. {currentLevel}</Text>
    </View>
    <View className="items-end">
      <Text className="text-gray-500 text-sm">XP</Text>
      <Text className="text-gray-900 text-xl font-semibold">{xpProgress} / {xpRequired}</Text>
    </View>
  </View>
  {/* Progress Bar */}
  <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
    <View className="h-full bg-gray-900 rounded-full" style={{ width: `${xpPercentage}%` }} />
  </View>
</View>
```

### 3.2 TodayScreen Improvements ✅
**File**: `apps/mobile/src/screens/TodayScreen.tsx`
**Effort**: 2-3 hours

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Header | "오늘의 실천" only | + Date nav buttons | ✅ |
| Progress Card | Simple bar | + Type stats row | ✅ |
| Section Header | Gray bg | Border style (like web) | ✅ |
| Action Item | Basic card | Checkbox + type badge | ✅ |
| Date Navigation | N/A | 이전/오늘/다음 버튼 | ✅ |

**Date Navigation (from web TodayChecklistPage.tsx:534-573):**
```tsx
// Add date navigation buttons
<View className="flex-row items-center gap-2">
  <View className="flex-row rounded-lg border border-gray-300 overflow-hidden">
    <Pressable className="px-3 py-2 border-r border-gray-300" onPress={handlePreviousDay}>
      <Text className="text-gray-700">이전</Text>
    </Pressable>
    <Pressable className="px-3 py-2 border-r border-gray-300" onPress={handleToday}>
      <Text className={isToday ? "text-blue-600 font-semibold" : "text-gray-700"}>오늘</Text>
    </Pressable>
    <Pressable className="px-3 py-2" onPress={handleNextDay}>
      <Text className="text-gray-700">다음</Text>
    </Pressable>
  </View>
</View>
```

**Section Header (from web TodayChecklistPage.tsx:895-913):**
```tsx
// Current
<Pressable className="p-4 bg-gray-100 rounded-2xl">

// Target - Match web
<Pressable className="p-4 bg-gray-50 rounded-lg border border-gray-200">
```

### 3.3 MandalartListScreen Improvements ✅
**Effort**: 1-2 hours

- [x] Add status badges (활성/비활성)
- [x] Improve toggle switch styling
- [x] Add mandalart count in header

### 3.4 StatsScreen Improvements → HomeScreen 통합 ✅
**Status**: Archived (기능 HomeScreen으로 이전)

- [x] 히트맵 → HomeScreen에 통합
- [x] 스트릭 카드 → HomeScreen에 통합
- [x] XP/레벨 → HomeScreen에 기존 존재

### 3.5 SettingsScreen Improvements ✅
**Effort**: 1 hour

- [x] Add profile editing section (user info card)
- [x] Match toggle styling
- [x] Add logout confirmation

---

## Phase 4: Shared UI Components ✅

### 4.1 Create Mobile UI Library
**Directory**: `apps/mobile/src/components/ui/`
**Effort**: 3-4 hours

Components to create:
- [x] `Button.tsx` - Primary, outline, ghost, secondary variants ✅
- [x] `Card.tsx` - Header, Title, Description, Content, Footer sections ✅
- [x] `Input.tsx` - Text input with label, error, hint ✅
- [x] `Badge.tsx` - 6 variants (default, success, warning, error, info, outline) ✅
- [x] `Skeleton.tsx` - Loading placeholders (exists in components/) ✅
- [x] `Dialog.tsx` - Modal wrapper with Header, Title, Description, Content, Footer ✅
- [x] `Progress.tsx` - Progress bar with 5 variants and 3 sizes ✅
- [x] `index.ts` - Barrel export file ✅

> **Note**: 모든 UI 컴포넌트 구현 완료.

### 4.2 Icon Consistency
**Current**: `lucide-react-native` (correct)
**Action**: Ensure same icon names as web

Icon mapping check:
- `CalendarCheck` ✓
- `Grid3X3` ✓
- `TrendingUp` ✓
- `FileText` ✓
- `Award` ✓
- `HelpCircle` ✓

---

## Phase 5: Animation & Polish (Priority: LOW)

### 5.1 Basic Animations
**Library**: `react-native-reanimated` (already in deps)
**Effort**: 3-4 hours

```tsx
// Page entrance animation
import Animated, { FadeInUp } from 'react-native-reanimated'

<Animated.View entering={FadeInUp.duration(300).delay(index * 50)}>
  {/* Content */}
</Animated.View>
```

### 5.2 Checkbox Animation
```tsx
// Animate checkbox on toggle
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(isChecked ? 1.1 : 1) }],
}))
```

---

## Implementation Priority Order

### Sprint 1 (Day 1-2): Core Styling ✅
1. [x] Update tailwind.config.js with web colors
2. [x] Fix ActionTypeIcon colors in TodayScreen
3. [x] Update HomeScreen header style
4. [x] Update Level Card to white theme

### Sprint 2 (Day 3-4): Components ✅
5. [x] Create Button.tsx UI component
6. [x] Create Card.tsx UI component
7. [x] Update TodayScreen progress card
8. [x] Add date navigation to TodayScreen

### Sprint 3 (Day 5-6): Screens ✅
9. [x] Complete HomeScreen improvements
10. [x] Complete TodayScreen improvements
11. [x] Update MandalartListScreen (상태 뱃지, 토글, 카운트)
12. [x] StatsScreen → HomeScreen 통합

### Sprint 4 (Day 7): Polish ✅
13. [x] Add basic animations (FadeInUp 애니메이션 - 모든 메인 화면)
14. [x] Test on iOS Simulator
15. [x] Documentation update

> **Note**: Sprint 4 애니메이션 구현 완료 (2025-11-27). `react-native-reanimated` 플러그인 활성화 후 모든 메인 화면에 FadeInUp 애니메이션 적용:
> - HomeScreen: Stats Card, Level Card, Streak Cards, Quick Actions
> - TodayScreen: Progress Card, Empty State, Progress Bar
> - MandalartListScreen: Empty State, Card List (staggered)
> - ReportsScreen: Tab Selector, Weekly/Diagnosis tabs
> - SettingsScreen: User Card, Notification, Support, Info sections

### Sprint 5 (Day 8): Code Quality ✅
16. [x] Sentry 에러 추적 통합 (@sentry/react-native)
17. [x] Production Logger 시스템 (console.log → logger)
18. [x] 환경변수 검증 유틸리티 (env.ts)
19. [x] React.memo 최적화 (ActionListItem)
20. [x] 공유 XP 유틸리티 (@mandaact/shared)
21. [x] EAS Build 배포 가이드 문서화

> **Note**: Sprint 5 코드 품질 개선 완료 (2025-11-27):
> - `src/lib/logger.ts`: Sentry 통합 + 환경별 로깅
> - `src/lib/env.ts`: 런타임 환경변수 검증
> - `src/components/ActionListItem.tsx`: React.memo + 커스텀 비교 함수
> - `packages/shared/src/lib/xpUtils.ts`: XP 계산 공유 유틸리티
> - `docs/mobile/TESTING_GUIDE.md`: EAS Build 프로덕션 배포 가이드 추가

---

## Files to Modify

| File | Changes | Priority | Status |
|------|---------|----------|--------|
| `tailwind.config.js` | Color system update | P0 | ✅ |
| `HomeScreen.tsx` | Header, cards, heatmap, streak | P0 | ✅ |
| `TodayScreen.tsx` | Colors, layout, date nav | P0 | ✅ |
| `components/ui/Button.tsx` | New file | P1 | ✅ |
| `components/ui/Card.tsx` | New file | P1 | ✅ |
| `MandalartListScreen.tsx` | Status badges, toggle, count | P1 | ✅ |
| `StatsScreen.tsx` | Archived (features → Home) | P2 | ✅ |
| `SettingsScreen.tsx` | Profile, logout | P2 | ✅ |
| `RootNavigator.tsx` | 4-tab structure | P0 | ✅ |
| `ReportsScreen.tsx` | Tab-ready styling | P1 | ✅ |
| `lib/logger.ts` | Sentry + Production Logger | P1 | ✅ |
| `lib/env.ts` | Environment validation | P1 | ✅ |
| `components/ActionListItem.tsx` | React.memo optimization | P2 | ✅ |
| `App.tsx` | initSentry() + logger | P1 | ✅ |
| `@mandaact/shared/xpUtils.ts` | Shared XP utilities | P2 | ✅ |

---

## Success Metrics

1. **Visual Consistency**: Side-by-side comparison should show minimal differences
2. **Color Accuracy**: All action type colors match exactly
3. **Component Parity**: Same visual hierarchy as web
4. **No Version Changes**: package.json versions unchanged
5. **Build Success**: `npm run build` passes without errors

---

## Rollback Plan

All changes are CSS/styling only. If issues arise:
1. Git revert to previous commit
2. No database or API changes required
3. Minimal regression risk

---

## Notes

- Focus on NativeWind classes (not inline styles)
- Test on both iOS and Android simulators
- Keep animations minimal for performance
- Maintain existing functionality
