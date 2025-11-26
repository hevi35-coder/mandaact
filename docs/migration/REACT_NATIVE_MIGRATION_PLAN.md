# MandaAct React Native 마이그레이션 계획서

> **Version**: 1.0
> **Date**: 2025-11-26
> **Target**: iOS App Store + Google Play Store 배포

---

## 1. Executive Summary

### 1.1 현재 상태 분석

| 항목 | 현재 (Web) | 목표 (Native) |
|------|------------|---------------|
| Frontend | React 18 + Vite + Tailwind + shadcn/ui | React Native + Expo + NativeWind |
| Navigation | React Router v6 | React Navigation v6 |
| Animation | Framer Motion | React Native Reanimated |
| State | Zustand + TanStack Query | **그대로 사용** (RN 호환) |
| Backend | Supabase Edge Functions | **그대로 사용** (변경 없음) |
| Push | PWA Web Push | Expo Notifications (FCM/APNs) |

### 1.2 권장 접근 방식

**Expo (Managed Workflow) + EAS Build** 권장

이유:
- 네이티브 빌드 복잡도 최소화
- OTA 업데이트 가능
- TestFlight/Play Console 배포 자동화
- 필요시 Eject 가능 (bare workflow)

### 1.3 예상 기간

| Phase | 예상 작업량 | 비고 |
|-------|------------|------|
| Phase 0: 준비 | 소 | 환경 설정 |
| Phase 1: PoC | 중 | 핵심 기능 검증 |
| Phase 2: UI 마이그레이션 | **대** | 9페이지 + 20+ 컴포넌트 |
| Phase 3: 기능 마이그레이션 | 중 | 대부분 로직 재사용 |
| Phase 4: 품질/성능 | 중 | 테스트, 최적화 |
| Phase 5: 스토어 배포 | 소 | 심사 대응 |

---

## 2. 코드베이스 분석 및 재사용 전략

### 2.1 재사용 가능한 코드 (수정 없이)

```
src/lib/
├── actionTypes.ts      ✅ 순수 로직
├── xpMultipliers.ts    ✅ 순수 로직
├── badgeEvaluator.ts   ✅ 순수 로직
├── badgeCategories.ts  ✅ 순수 로직
├── badgeStages.ts      ✅ 순수 로직
├── badgeHints.ts       ✅ 순수 로직
├── stats.ts            ✅ 순수 로직 (date-fns 사용)
├── reportParser.ts     ✅ 순수 로직
├── timezone.ts         ✅ 순수 로직
├── notificationMessages.ts  ✅ 순수 로직
└── utils.ts            ⚠️ clsx/tailwind-merge 부분만 수정

src/types/
└── index.ts            ✅ 타입 정의 그대로

src/store/
└── authStore.ts        ⚠️ AsyncStorage로 persist 변경
```

### 2.2 수정이 필요한 코드

```
src/lib/
├── supabase.ts         🔄 AsyncStorage로 세션 저장 변경
├── notifications.ts    ❌ 전면 재작성 (Expo Notifications)
├── imageOptimization.ts 🔄 expo-image-manipulator로 대체
├── animations.ts       ❌ 전면 재작성 (Reanimated)
├── sentry.ts          🔄 @sentry/react-native로 변경
├── posthog.ts         🔄 posthog-react-native로 변경
└── performanceUtils.ts 🔄 React Native 성능 API로 변경

src/hooks/
├── useStats.ts         ⚠️ 일부 수정 필요
├── useActions.ts       ⚠️ 일부 수정 필요
├── useMandalarts.ts    ⚠️ 일부 수정 필요
└── use-toast.ts        ❌ RN toast 라이브러리로 대체
```

### 2.3 전면 재작성 필요 (RN 컴포넌트)

```
src/pages/ (9개)
├── LoginPage.tsx           → screens/LoginScreen.tsx
├── HomePage.tsx            → screens/HomeScreen.tsx
├── TodayChecklistPage.tsx  → screens/TodayScreen.tsx
├── MandalartListPage.tsx   → screens/MandalartListScreen.tsx
├── MandalartCreatePage.tsx → screens/CreateScreen.tsx
├── MandalartDetailPage.tsx → screens/DetailScreen.tsx
├── ReportsPage.tsx         → screens/ReportsScreen.tsx
├── TutorialPage.tsx        → screens/TutorialScreen.tsx
└── NotificationSettingsPage.tsx → screens/SettingsScreen.tsx

src/components/ (20+ 컴포넌트)
├── MandalartGrid.tsx       ❌ 가장 복잡, 완전 재작성
├── Navigation.tsx          ❌ React Navigation으로 대체
├── ActionListItem.tsx      ❌ RN 컴포넌트로 재작성
├── SubGoalModal.tsx        ❌ RN Modal로 재작성
├── CoreGoalEditModal.tsx   ❌ RN Modal로 재작성
├── ActionTypeSelector.tsx  ❌ RN 컴포넌트로 재작성
├── InputMethodSelector.tsx ❌ RN 컴포넌트로 재작성
└── ui/*                    ❌ shadcn/ui → RN UI 라이브러리

src/components/stats/ (10+ 컴포넌트)
├── UserProfileCard.tsx     ❌
├── StreakHero.tsx          ❌
├── AchievementGallery.tsx  ❌
├── AIWeeklyReport.tsx      ❌ (react-markdown → rn-markdown)
└── ...
```

---

## 3. 라이브러리 매핑 (Web → React Native)

### 3.1 핵심 라이브러리

| Web (현재) | RN (대체) | 비고 |
|------------|-----------|------|
| `react` 18 | `react` 18 | 동일 |
| `vite` | `expo` / `metro` | 번들러 변경 |
| `react-router-dom` | `@react-navigation/native` | 네비게이션 |
| `tailwindcss` + `shadcn/ui` | `nativewind` + custom | 스타일링 |
| `framer-motion` | `react-native-reanimated` | 애니메이션 |
| `@tanstack/react-query` | `@tanstack/react-query` | **동일** |
| `zustand` | `zustand` | **동일** |
| `@supabase/supabase-js` | `@supabase/supabase-js` | **동일** |
| `date-fns` | `date-fns` | **동일** |

### 3.2 UI 컴포넌트

| Web (현재) | RN (대체) | 비고 |
|------------|-----------|------|
| `@radix-ui/*` (20개) | Custom 또는 `react-native-paper` | 재작성 필요 |
| `lucide-react` | `lucide-react-native` | 아이콘 |
| `recharts` | `victory-native` 또는 `react-native-chart-kit` | 차트 |
| `react-markdown` | `react-native-markdown-display` | 마크다운 |
| `react-day-picker` | `react-native-calendars` | 캘린더 |

### 3.3 기능별 라이브러리

| 기능 | Web (현재) | RN (대체) |
|------|------------|-----------|
| 이미지 캡처 | `modern-screenshot` | `react-native-view-shot` |
| 이미지 최적화 | Canvas API | `expo-image-manipulator` |
| 카메라/갤러리 | `<input type="file">` | `expo-image-picker` |
| 드래그앤드롭 | `@dnd-kit/*` | `react-native-draggable-flatlist` |
| 푸시 알림 | Web Push API | `expo-notifications` |
| 폼 | `react-hook-form` | `react-hook-form` | **동일** |
| 유효성검증 | `zod` | `zod` | **동일** |

### 3.4 모니터링/분석

| 기능 | Web (현재) | RN (대체) |
|------|------------|-----------|
| 에러 추적 | `@sentry/react` | `@sentry/react-native` |
| 분석 | `posthog-js` | `posthog-react-native` |

---

## 4. Phase별 상세 계획

### Phase 0: 준비 및 환경 설정

#### 0.1 리포지토리 구조

```bash
# 옵션 A: 별도 리포지토리
mandaact-native/

# 옵션 B: 모노레포 (권장)
mandaact/
├── apps/
│   ├── web/          # 기존 웹 앱
│   └── mobile/       # 새로운 RN 앱
├── packages/
│   └── shared/       # 공유 로직
│       ├── lib/      # actionTypes, xpMultipliers 등
│       ├── types/    # 타입 정의
│       └── hooks/    # 공유 가능한 hooks
└── package.json      # 워크스페이스 설정
```

**권장: 옵션 B (모노레포)**
- 코드 재사용 극대화
- 타입 일관성 유지
- 동시 개발 가능

#### 0.2 Expo 프로젝트 초기화

```bash
# Expo 앱 생성
npx create-expo-app mandaact-native --template expo-template-blank-typescript

# 필수 패키지 설치
cd mandaact-native

# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# State Management
npm install @tanstack/react-query zustand

# Storage
npm install @react-native-async-storage/async-storage

# Supabase
npm install @supabase/supabase-js

# Styling
npm install nativewind
npm install --save-dev tailwindcss

# Animation
npm install react-native-reanimated react-native-gesture-handler

# UI Components
npm install lucide-react-native react-native-svg
npm install react-native-markdown-display

# Image handling
npm install expo-image-picker expo-image-manipulator react-native-view-shot

# Notifications
npm install expo-notifications expo-device

# Forms
npm install react-hook-form @hookform/resolvers zod

# Utils
npm install date-fns date-fns-tz

# Monitoring
npm install @sentry/react-native posthog-react-native
```

#### 0.3 CI/CD 설정 (EAS Build)

```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 설정
eas init
eas build:configure
```

**eas.json 설정:**
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

**GitHub Actions 워크플로우:**
```yaml
# .github/workflows/eas-build.yml
name: EAS Build

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: npm ci
      - name: Build for iOS
        run: eas build --platform ios --non-interactive
      - name: Build for Android
        run: eas build --platform android --non-interactive
```

---

### Phase 1: 핵심 인프라 PoC

**목표**: 최소 기능 동작 확인으로 기술적 리스크 조기 검증

#### 1.1 Supabase 연동 검증

**`lib/supabase.ts` (RN 버전):**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN에서는 false
  },
})
```

#### 1.2 인증 Flow PoC

```typescript
// store/authStore.ts (RN 버전)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        set({ user: data.user })
      },
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null })
      },
      initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        set({ user: session?.user ?? null, loading: false })

        // 세션 변경 구독
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ user: session?.user ?? null })
        })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
)
```

#### 1.3 기본 화면 PoC (로그인 + Today 리스트)

**Navigation 구조:**
```typescript
// navigation/RootNavigator.tsx
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Mandalart" component={MandalartListScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  )
}

export function RootNavigator() {
  const { user, loading } = useAuthStore()

  if (loading) return <LoadingScreen />

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="MandalartDetail" component={DetailScreen} />
            <Stack.Screen name="CreateMandalart" component={CreateScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

#### 1.4 OCR 흐름 PoC

```typescript
// services/ocr.ts
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from '@/lib/supabase'

export async function pickAndProcessImage() {
  // 1. 이미지 선택
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  })

  if (result.canceled) return null

  // 2. 이미지 최적화 (리사이즈)
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  )

  // 3. Supabase Storage 업로드
  const fileName = `ocr/${Date.now()}.jpg`
  const response = await fetch(manipulated.uri)
  const blob = await response.blob()

  const { data, error } = await supabase.storage
    .from('mandalart-images')
    .upload(fileName, blob)

  if (error) throw error

  // 4. Edge Function으로 OCR 호출
  const { data: { publicUrl } } = supabase.storage
    .from('mandalart-images')
    .getPublicUrl(fileName)

  const { data: ocrResult } = await supabase.functions.invoke('ocr-mandalart', {
    body: { image_url: publicUrl }
  })

  return ocrResult
}
```

#### 1.5 이미지 Export PoC

```typescript
// services/export.ts
import { captureRef } from 'react-native-view-shot'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'

export async function captureGridAsImage(gridRef: React.RefObject<View>) {
  const uri = await captureRef(gridRef, {
    format: 'png',
    quality: 1,
  })

  // 갤러리에 저장
  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status === 'granted') {
    await MediaLibrary.saveToLibraryAsync(uri)
  }

  // 또는 공유
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri)
  }

  return uri
}
```

---

### Phase 2: UI/UX 마이그레이션

#### 2.1 디자인 시스템 구축

**NativeWind 설정:**
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // MandaAct 브랜드 컬러
        primary: {
          DEFAULT: '#667eea',
          50: '#f0f4ff',
          100: '#e0e7ff',
          // ...
        },
        accent: '#764ba2',
      },
    },
  },
  plugins: [],
}
```

**공통 컴포넌트 (shadcn/ui 대체):**

```typescript
// components/ui/Button.tsx
import { Pressable, Text, ActivityIndicator } from 'react-native'
import { styled } from 'nativewind'

interface ButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  onPress: () => void
  children: React.ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  loading,
  disabled,
  onPress,
  children
}: ButtonProps) {
  const baseStyles = 'rounded-lg items-center justify-center'

  const variantStyles = {
    default: 'bg-primary',
    outline: 'border border-primary bg-transparent',
    ghost: 'bg-transparent',
  }

  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  }

  return (
    <Pressable
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={variant === 'default' ? 'text-white font-medium' : 'text-primary font-medium'}>
          {children}
        </Text>
      )}
    </Pressable>
  )
}
```

#### 2.2 MandalartGrid 컴포넌트 (핵심)

**RN 버전 구현 전략:**

```typescript
// components/MandalartGrid.tsx (RN 버전)
import React, { memo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native'
import { MandalartGridData } from '@/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_SIZE = SCREEN_WIDTH - 32 // 좌우 패딩 16px씩
const SECTION_SIZE = GRID_SIZE / 3
const CELL_SIZE = SECTION_SIZE / 3

interface Props {
  data: MandalartGridData
  onSectionPress?: (sectionPos: number) => void
  onCoreGoalPress?: () => void
  readonly?: boolean
}

function MandalartGrid({ data, onSectionPress, onCoreGoalPress, readonly }: Props) {
  const sectionPositions = [1, 2, 3, 4, 0, 5, 6, 7, 8]

  const getSubGoalByPosition = useCallback((position: number) => {
    return data.sub_goals.find(sg => sg.position === position)
  }, [data.sub_goals])

  const renderCell = useCallback((sectionPos: number, cellPos: number) => {
    // Center section
    if (sectionPos === 0) {
      if (cellPos === 4) {
        // Core goal
        return (
          <Pressable
            style={styles.coreGoalCell}
            onPress={!readonly ? onCoreGoalPress : undefined}
          >
            <Text style={styles.coreGoalText} numberOfLines={3}>
              {data.center_goal}
            </Text>
          </Pressable>
        )
      } else {
        // Sub-goal titles in center
        const subGoalPosition = cellPos < 4 ? cellPos + 1 : cellPos
        const subGoal = getSubGoalByPosition(subGoalPosition)
        return (
          <View style={styles.subGoalTitleCell}>
            <Text style={styles.subGoalTitleText} numberOfLines={4}>
              {subGoal?.title}
            </Text>
          </View>
        )
      }
    }

    // Outer sections
    const subGoal = getSubGoalByPosition(sectionPos)

    if (cellPos === 4) {
      // Section center: sub-goal title
      return (
        <View style={styles.subGoalTitleCell}>
          <Text style={styles.subGoalTitleText} numberOfLines={4}>
            {subGoal?.title}
          </Text>
        </View>
      )
    } else {
      // Actions
      const actionIndex = cellPos < 4 ? cellPos : cellPos - 1
      const action = subGoal?.actions[actionIndex]
      return (
        <View style={styles.actionCell}>
          <Text style={styles.actionText} numberOfLines={4}>
            {action?.title}
          </Text>
        </View>
      )
    }
  }, [data, getSubGoalByPosition, onCoreGoalPress, readonly])

  const renderSection = useCallback((sectionPos: number) => {
    const isCenter = sectionPos === 0

    return (
      <Pressable
        key={sectionPos}
        style={[styles.section, isCenter && styles.centerSection]}
        onPress={!readonly && !isCenter && onSectionPress
          ? () => onSectionPress(sectionPos)
          : undefined}
      >
        <View style={styles.sectionGrid}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(cellPos => (
            <View key={cellPos} style={styles.cellContainer}>
              {renderCell(sectionPos, cellPos)}
            </View>
          ))}
        </View>
      </Pressable>
    )
  }, [renderCell, onSectionPress, readonly])

  return (
    <View style={styles.grid}>
      {sectionPositions.map(renderSection)}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  section: {
    width: SECTION_SIZE - 3,
    height: SECTION_SIZE - 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  centerSection: {
    // 중앙 섹션 스타일
  },
  sectionGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cellContainer: {
    width: '33.33%',
    height: '33.33%',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  coreGoalCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    // 그라데이션은 expo-linear-gradient 사용
  },
  coreGoalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subGoalTitleCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    backgroundColor: '#eff6ff',
  },
  subGoalTitleText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    backgroundColor: 'white',
  },
  actionText: {
    fontSize: 8,
    textAlign: 'center',
    color: '#374151',
  },
})

export default memo(MandalartGrid)
```

#### 2.3 페이지별 마이그레이션 우선순위

| 순서 | 페이지 | 복잡도 | 우선순위 | 비고 |
|------|--------|--------|----------|------|
| 1 | LoginScreen | 낮음 | **필수** | 인증 flow |
| 2 | HomeScreen | 중간 | **필수** | 대시보드 |
| 3 | TodayScreen | 중간 | **필수** | 핵심 기능 |
| 4 | MandalartListScreen | 낮음 | **필수** | 목록 관리 |
| 5 | DetailScreen | **높음** | **필수** | 9x9 Grid |
| 6 | CreateScreen | **높음** | **필수** | OCR + 입력 |
| 7 | ReportsScreen | 중간 | 중요 | AI 리포트 |
| 8 | TutorialScreen | 중간 | 중요 | 온보딩 |
| 9 | SettingsScreen | 낮음 | 낮음 | 알림 설정 |

#### 2.4 애니메이션 마이그레이션

**Framer Motion → Reanimated 매핑:**

```typescript
// 기존 (Framer Motion)
import { motion, AnimatePresence } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

// RN (Reanimated)
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  withTiming
} from 'react-native-reanimated'

<Animated.View
  entering={FadeInDown.duration(300)}
  exiting={FadeOut.duration(200)}
>
  <Text>Content</Text>
</Animated.View>
```

**공통 애니메이션 프리셋:**
```typescript
// lib/animations.ts (RN 버전)
import {
  FadeIn, FadeOut, FadeInDown, FadeInUp,
  SlideInRight, SlideOutLeft,
  ZoomIn, ZoomOut,
  Layout
} from 'react-native-reanimated'

export const animations = {
  fadeIn: FadeIn.duration(200),
  fadeOut: FadeOut.duration(150),
  slideUp: FadeInDown.springify().damping(15),
  slideDown: FadeInUp.springify().damping(15),
  scaleIn: ZoomIn.springify(),
  scaleOut: ZoomOut.duration(150),
  layout: Layout.springify().damping(15),
}
```

---

### Phase 3: 기능 마이그레이션

#### 3.1 인증 시스템

**변경점:**
- 세션 저장: localStorage → AsyncStorage
- OAuth (미래): 웹 리다이렉트 → expo-auth-session

```typescript
// hooks/useAuth.ts (RN 버전)
export function useAuth() {
  const { user, loading, signIn, signOut, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return { user, loading, signIn, signOut }
}
```

#### 3.2 데이터 동기화 (TanStack Query)

**기존 코드 대부분 재사용 가능:**

```typescript
// hooks/useMandalarts.ts (변경 최소화)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useMandalarts() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['mandalarts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mandalarts')
        .select(`
          *,
          sub_goals (
            *,
            actions (*)
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}
```

#### 3.3 OCR 파이프라인

**아키텍처 (서버 호출 유지):**
```
[RN App] → expo-image-picker → 이미지 선택
    ↓
[RN App] → expo-image-manipulator → 리사이즈/압축
    ↓
[Supabase Storage] → 이미지 업로드
    ↓
[Edge Function: ocr-mandalart] → Google Cloud Vision API
    ↓
[RN App] → 결과 수신 및 UI 표시
```

**보안 고려사항:**
- ✅ GCP API Key는 Edge Function에서만 사용 (현재 구조 유지)
- ✅ 클라이언트는 이미지 업로드만 담당
- 추가: 이미지 크기 제한 (2MB 권장)

#### 3.4 AI 리포트 (Perplexity)

**기존 구조 그대로 유지:**
- Edge Function `generate-report`에서 Perplexity API 호출
- 클라이언트는 컨텍스트만 전송

```typescript
// services/reports.ts
export async function generateWeeklyReport(userId: string, weekStart?: string) {
  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: { user_id: userId, week_start: weekStart }
  })

  if (error) throw error
  return data.report
}
```

**마크다운 렌더링:**
```typescript
// components/MarkdownRenderer.tsx
import Markdown from 'react-native-markdown-display'

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <Markdown
      style={{
        body: { color: '#1f2937', fontSize: 14 },
        heading1: { fontSize: 20, fontWeight: 'bold' },
        heading2: { fontSize: 18, fontWeight: '600' },
        // ...
      }}
    >
      {content}
    </Markdown>
  )
}
```

#### 3.5 Gamification (XP/배지)

**재사용 가능한 로직:**
- `lib/xpMultipliers.ts` - 100% 재사용
- `lib/badgeEvaluator.ts` - 100% 재사용
- `lib/badgeCategories.ts` - 100% 재사용

**UI만 재작성:**
```typescript
// components/stats/XPBar.tsx (RN 버전)
import { View, Text } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { getLevelFromXP, calculateXPForLevel } from '@/lib/xpMultipliers'

export function XPBar({ totalXP }: { totalXP: number }) {
  const level = getLevelFromXP(totalXP)
  const currentLevelXP = calculateXPForLevel(level)
  const nextLevelXP = calculateXPForLevel(level + 1)
  const progress = (totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)

  const animatedWidth = useAnimatedStyle(() => ({
    width: withTiming(`${progress * 100}%`, { duration: 500 })
  }))

  return (
    <View className="w-full">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm font-medium">Level {level}</Text>
        <Text className="text-sm text-gray-500">{totalXP} / {nextLevelXP} XP</Text>
      </View>
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <Animated.View
          className="h-full bg-primary rounded-full"
          style={animatedWidth}
        />
      </View>
    </View>
  )
}
```

#### 3.6 푸시 알림 (PWA → Native)

**가장 큰 변경점:**

```typescript
// lib/notifications.ts (RN 버전)
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  // 권한 요청
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token')
    return null
  }

  // Expo Push Token 획득
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  })

  // Android 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  // 서버에 토큰 저장
  await savePushToken(token.data)

  return token.data
}

async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_push_tokens')
    .upsert({
      user_id: user.id,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString()
    })
}

// 로컬 알림 스케줄링 (리마인더용)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  })
}
```

**서버 사이드 푸시 (Edge Function):**
```typescript
// supabase/functions/send-push/index.ts
import { createClient } from '@supabase/supabase-js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

Deno.serve(async (req) => {
  const { user_id, title, body } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 사용자의 푸시 토큰 조회
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('token')
    .eq('user_id', user_id)

  if (!tokens?.length) {
    return new Response(JSON.stringify({ error: 'No tokens found' }), { status: 404 })
  }

  // Expo 푸시 서버로 전송
  const messages = tokens.map(t => ({
    to: t.token,
    sound: 'default',
    title,
    body,
  }))

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })

  return new Response(JSON.stringify({ success: true }))
})
```

#### 3.7 오프라인 지원

**TanStack Query + MMKV:**

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

export const persister = createSyncStoragePersister({
  storage: mmkvStorage,
})
```

---

### Phase 4: 품질, 성능, 테스트

#### 4.1 성능 최적화

**9x9 Grid 최적화:**
```typescript
// ✅ 셀 컴포넌트 메모이제이션
const GridCell = memo(({ sectionPos, cellPos, data, onPress }: CellProps) => {
  // ...
}, (prev, next) => {
  // 얕은 비교로 불필요한 리렌더링 방지
  return prev.data === next.data && prev.sectionPos === next.sectionPos
})

// ✅ FlatList 사용 (큰 리스트)
<FlatList
  data={actions}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
/>

// ✅ 이미지 최적화
import { Image } from 'expo-image'

<Image
  source={{ uri }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

**메모리 관리:**
```typescript
// 이미지 처리 시 메모리 해제
useEffect(() => {
  return () => {
    // 컴포넌트 언마운트 시 캐시 정리
    Image.clearMemoryCache()
  }
}, [])
```

#### 4.2 테스트 전략

**테스트 스택:**
- Unit: Jest + React Native Testing Library
- Integration: Detox
- E2E: Detox

```typescript
// __tests__/screens/TodayScreen.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { TodayScreen } from '@/screens/TodayScreen'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

describe('TodayScreen', () => {
  it('renders action items', async () => {
    const { getByText, getAllByTestId } = render(
      <TodayScreen />,
      { wrapper }
    )

    await waitFor(() => {
      expect(getAllByTestId('action-item')).toHaveLength(3)
    })
  })

  it('checks action and awards XP', async () => {
    const { getByTestId, getByText } = render(
      <TodayScreen />,
      { wrapper }
    )

    fireEvent.press(getByTestId('action-checkbox-1'))

    await waitFor(() => {
      expect(getByText('+10 XP')).toBeTruthy()
    })
  })
})
```

**Detox E2E:**
```typescript
// e2e/login.test.ts
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('test@example.com')
    await element(by.id('password-input')).typeText('password123')
    await element(by.id('login-button')).tap()

    await expect(element(by.id('home-screen'))).toBeVisible()
  })
})
```

#### 4.3 에러 모니터링

```typescript
// lib/sentry.ts (RN 버전)
import * as Sentry from '@sentry/react-native'

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
  })
}

// 컴포넌트 래핑
export const SentryErrorBoundary = Sentry.wrap
```

---

### Phase 5: 앱스토어 배포

#### 5.1 iOS (App Store) 체크리스트

**Apple Developer 설정:**
- [ ] Apple Developer Program 가입 ($99/년)
- [ ] App ID 생성 (Bundle ID: `com.mandaact.app`)
- [ ] Push Notification 활성화
- [ ] APNs Key 생성 및 Expo에 등록

**Info.plist 권한:**
```xml
<key>NSCameraUsageDescription</key>
<string>만다라트 이미지 촬영에 카메라가 필요합니다</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>만다라트 이미지 선택에 사진 접근이 필요합니다</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>만다라트 이미지 저장에 사진 접근이 필요합니다</string>
```

**App Store 제출 자료:**
- [ ] 앱 아이콘 (1024x1024)
- [ ] 스크린샷 (6.5", 5.5", 12.9" iPad)
- [ ] 앱 설명 (4000자 이내)
- [ ] 개인정보처리방침 URL
- [ ] 지원 URL
- [ ] 마케팅 URL (선택)

#### 5.2 Android (Google Play) 체크리스트

**Google Play Console 설정:**
- [ ] Google Play Developer 계정 ($25 일회성)
- [ ] 앱 생성 및 설정
- [ ] FCM 설정 (`google-services.json`)

**권한 (AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**Google Play 제출 자료:**
- [ ] 앱 아이콘 (512x512)
- [ ] Feature Graphic (1024x500)
- [ ] 스크린샷 (최소 2장, 권장 8장)
- [ ] 짧은 설명 (80자)
- [ ] 전체 설명 (4000자)
- [ ] 개인정보처리방침 URL
- [ ] 컨텐츠 등급 질문지 작성

#### 5.3 EAS Submit

```bash
# iOS TestFlight 배포
eas submit --platform ios

# Google Play Internal Testing 배포
eas submit --platform android
```

**app.json 설정:**
```json
{
  "expo": {
    "name": "MandaAct",
    "slug": "mandaact",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#667eea"
    },
    "ios": {
      "bundleIdentifier": "com.mandaact.app",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "...",
        "NSPhotoLibraryUsageDescription": "..."
      }
    },
    "android": {
      "package": "com.mandaact.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#667eea"
      },
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-notifications",
      "expo-image-picker",
      [
        "@sentry/react-native/expo",
        {
          "organization": "mandaact",
          "project": "mandaact-mobile"
        }
      ]
    ]
  }
}
```

---

## 5. 위험 요소 및 대응 전략

### 5.1 높은 위험

| 위험 | 영향 | 대응 전략 |
|------|------|-----------|
| shadcn/ui 전면 재작성 | 높음 | UI 라이브러리 (react-native-paper) 활용 또는 디자인 시스템 조기 구축 |
| 9x9 Grid 성능 | 높음 | Phase 1에서 PoC로 성능 검증, 필요시 네이티브 모듈 고려 |
| Framer Motion 대체 | 중간 | Reanimated 학습 투자, 애니메이션 프리셋 라이브러리 조기 구축 |

### 5.2 중간 위험

| 위험 | 영향 | 대응 전략 |
|------|------|-----------|
| 푸시 알림 FCM/APNs 설정 | 중간 | Expo Push로 시작, 프로덕션 전 FCM/APNs 전환 |
| 이미지 처리 메모리 | 중간 | 업로드 전 리사이즈 강제, 2MB 제한 |
| 오프라인 동기화 충돌 | 중간 | Last-write-wins 정책, 서버 우선 |

### 5.3 낮은 위험

| 위험 | 영향 | 대응 전략 |
|------|------|-----------|
| 네이티브 빌드 실패 | 낮음 | EAS Build로 자동화, 로컬 빌드 최소화 |
| 앱스토어 심사 거절 | 낮음 | 가이드라인 사전 검토, 베타 테스트 철저 |

---

## 6. 보안 아키텍처 (유지 사항)

### 6.1 현재 보안 구조 (우수 - 유지)

```
┌─────────────────────────────────────────────────────────────┐
│  RN App (Client)                                            │
│  - Supabase ANON_KEY만 보유                                  │
│  - 이미지 업로드만 담당                                        │
│  - XP/배지 표시용 데이터만 수신                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Functions                                     │
│  - GCP_PRIVATE_KEY (OCR)                                     │
│  - PERPLEXITY_API_KEY (AI 리포트)                            │
│  - XP 계산 및 배지 검증                                       │
│  - Anti-cheat 로직                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL + RLS                                   │
│  - user_id 기반 접근 제어                                     │
│  - 서버 검증된 데이터만 저장                                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 추가 보안 조치

```typescript
// 환경변수 검증 (앱 시작 시)
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
]

requiredEnvVars.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
})

// API Key가 클라이언트에 없는지 확인
const forbiddenEnvVars = [
  'GCP_PRIVATE_KEY',
  'PERPLEXITY_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

forbiddenEnvVars.forEach(key => {
  if (process.env[key] || process.env[`EXPO_PUBLIC_${key}`]) {
    throw new Error(`SECURITY: ${key} should never be in client code!`)
  }
})
```

---

## 7. 프로젝트 구조 (최종)

```
mandaact-native/
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
│
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── src/
│   ├── App.tsx                    # 앱 엔트리
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── MainTabs.tsx
│   │   └── types.ts
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── SignUpScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── TodayScreen.tsx
│   │   ├── MandalartListScreen.tsx
│   │   ├── CreateScreen.tsx
│   │   ├── DetailScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   ├── TutorialScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 대체
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ...
│   │   │
│   │   ├── MandalartGrid.tsx      # 핵심 컴포넌트
│   │   ├── ActionListItem.tsx
│   │   ├── ActionTypeSelector.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   │
│   │   └── stats/
│   │       ├── UserProfileCard.tsx
│   │       ├── XPBar.tsx
│   │       ├── StreakHero.tsx
│   │       ├── AchievementGallery.tsx
│   │       └── ...
│   │
│   ├── lib/                       # 대부분 웹에서 복사
│   │   ├── supabase.ts           # AsyncStorage 버전
│   │   ├── queryClient.ts
│   │   ├── notifications.ts      # Expo 버전
│   │   ├── sentry.ts             # RN 버전
│   │   ├── posthog.ts            # RN 버전
│   │   ├── animations.ts         # Reanimated 버전
│   │   │
│   │   │   # 아래는 웹에서 그대로 복사
│   │   ├── actionTypes.ts
│   │   ├── xpMultipliers.ts
│   │   ├── badgeEvaluator.ts
│   │   ├── badgeCategories.ts
│   │   ├── stats.ts
│   │   ├── timezone.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useMandalarts.ts
│   │   ├── useActions.ts
│   │   ├── useStats.ts
│   │   └── useNotifications.ts
│   │
│   ├── store/
│   │   └── authStore.ts          # AsyncStorage persist
│   │
│   ├── services/
│   │   ├── ocr.ts
│   │   ├── reports.ts
│   │   └── export.ts
│   │
│   └── types/
│       └── index.ts              # 웹에서 복사
│
├── e2e/                          # Detox 테스트
│   ├── login.test.ts
│   └── today.test.ts
│
└── __tests__/
    ├── screens/
    └── components/
```

---

## 8. 즉시 실행 항목 (권장 순서)

### Week 1: 환경 설정 및 PoC 시작

1. **Expo 프로젝트 생성**
   ```bash
   npx create-expo-app mandaact-native --template expo-template-blank-typescript
   ```

2. **필수 패키지 설치** (위 목록 참조)

3. **Supabase 연동 테스트**
   - AsyncStorage 세션 저장
   - 로그인/로그아웃 flow

4. **간단한 Today 화면 구현**
   - TanStack Query로 데이터 fetch
   - 체크 기능 동작 확인

### Week 2: OCR 및 핵심 기능 PoC

5. **이미지 업로드 → OCR 파이프라인**
   - expo-image-picker 연동
   - Edge Function 호출 테스트

6. **MandalartGrid 프로토타입**
   - 기본 렌더링 성능 확인
   - 터치 이벤트 처리

### Week 3: 푸시 알림 PoC

7. **Expo Notifications 설정**
   - 권한 요청
   - 로컬 알림 테스트

8. **EAS Build 테스트**
   - iOS Simulator 빌드
   - Android Emulator 빌드

---

## 9. 리소스 요구사항

### 9.1 팀 구성

| 역할 | 주요 책임 | 투입률 |
|------|-----------|--------|
| **리드 개발자** | 아키텍처, 핵심 기능, OCR 통합, 코드 리뷰 | 100% |
| **UI 개발자** | 컴포넌트 라이브러리, 화면 구현, 애니메이션 | 75% |
| **개발자 2** | 기능 구현, API 연동, 테스트, 버그 수정 | 50% |
| **DevOps/QA** | CI/CD, 테스트, 배포, 모니터링 | 25% |
| **디자이너** | 앱스토어 에셋, UI 개선, 아이콘 | 20% |

### 9.2 예상 비용

| 항목 | 비용 | 비고 |
|------|------|------|
| Apple Developer 계정 | $99/년 | iOS 필수 |
| Google Play Console | $25 (1회) | Android 필수 |
| EAS Build (Team) | $99/월 | 빠른 빌드 권장 |
| 테스트 디바이스 | ~$2,000 | iOS/Android 다양 |
| 외부 서비스 | ~$500/월 | Sentry, Analytics 등 |
| **초기 투자 합계** | **~$5,000** | 첫 3개월 |
| **월간 운영비** | **~$200** | 런칭 후 |

---

## 10. 마일스톤 체크리스트

### Phase 0 완료 (Week 1)
- [ ] Expo 프로젝트 초기화
- [ ] TypeScript, ESLint 설정
- [ ] EAS Build 동작 확인
- [ ] CI/CD 파이프라인 구축
- [ ] 팀 온보딩 완료

### Phase 1 완료 (Week 2-3)
- [ ] Supabase 인증 동작
- [ ] 기본 Navigation 구현
- [ ] OCR PoC 성공
- [ ] Today 화면 데이터 표시
- [ ] 상태 관리 (Zustand/Query) 동작

### Phase 2 완료 (Week 4-6)
- [ ] 9개 화면 모두 구현
- [ ] UI 컴포넌트 라이브러리 완성
- [ ] 애니메이션 부드럽게 동작
- [ ] 반응형 레이아웃 완성

### Phase 3 완료 (Week 7-10)
- [ ] 기능 100% 동등성 달성
- [ ] XP/배지 시스템 동작
- [ ] 푸시 알림 설정 완료
- [ ] 오프라인 모드 동작
- [ ] 성능 목표 달성 (<2초 로딩)

### Phase 4 완료 (Week 11-12)
- [ ] 테스트 커버리지 >70%
- [ ] E2E 테스트 통과
- [ ] 베타 빌드 배포 (TestFlight/Internal)
- [ ] 성능 벤치마크 충족
- [ ] 보안 검토 완료

### Phase 5 완료 (Week 13-14)
- [ ] App Store 제출
- [ ] Google Play 제출
- [ ] 스토어 승인
- [ ] 모니터링 대시보드 활성화
- [ ] 사용자 마이그레이션 시작

---

## 11. 참고 자료

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

---

## 12. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-11-26 | 초안 작성 |
| 1.1 | 2025-11-26 | 기존 문서 통합 (리소스/마일스톤 추가) |
