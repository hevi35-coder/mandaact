# React Native Migration Plan v2.0

**Created**: 2025-11-24
**Status**: Planning
**Previous Attempt**: Failed due to React version mismatch
**Current Commit**: f6d85f5

---

## 문제점 분석 (Previous Attempt)

### 발생한 이슈
```
ERROR: Invalid hook call. Hooks can only be called inside of the body of a function component.
ERROR: Cannot read property 'useRef' of null
ERROR: Cannot read property 'useContext' of null
```

### 근본 원인
1. **React 버전 충돌**
   - Mobile app: React 19.1.0 (Expo SDK 54 기본값)
   - Web app: React 18.3.1
   - Shared package: React 18.3.1 (peerDependency)
   - React Navigation: React 18.3.1 dependency

2. **문제 발생 메커니즘**
   - Shared package가 React 18로 빌드됨
   - Mobile app이 React 19를 사용
   - 서로 다른 React 인스턴스가 로드됨
   - Hooks가 null context에서 실행됨

3. **시도한 해결책들**
   - ❌ React 다운그레이드 (너무 늦게 시도)
   - ❌ Proxy 패턴 사용
   - ❌ Dynamic import
   - ❌ 초기화 순서 조정
   - **결론**: React 버전이 통일되지 않으면 해결 불가

---

## 새로운 접근 방법

### 핵심 원칙
1. **React 18.3.1로 모든 패키지 통일**
2. **Monorepo 의존성 명확히 관리**
3. **단계적 검증 (각 단계마다 테스트)**

---

## 구현 계획

### Phase 1: Shared Packages 설정 (올바른 React 버전)

#### 1.1 packages/shared 생성
```bash
mkdir -p packages/shared/src/{lib,stores,types}
cd packages/shared
npm init -y
```

**package.json 설정**
```json
{
  "name": "@mandaact/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-native": "*"
  },
  "peerDependenciesMeta": {
    "react-native": {
      "optional": true
    }
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.8",
    "zustand": "^4.5.2",
    "date-fns": "^2.30.0",
    "date-fns-tz": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "@types/node": "^20.11.24"
  }
}
```

**✅ 검증 단계**:
- `npm install` 실행
- React가 peerDependency로만 설정되어 있는지 확인
- `npm ls react` - 결과에 React가 직접 설치되지 않았는지 확인

#### 1.2 Supabase 초기화 로직 작성

**src/lib/supabase.ts**
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Platform detection
export const isReactNative = typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'

// Global instance
let supabaseInstance: SupabaseClient | null = null

export const initializeSupabase = (
  url: string,
  key: string,
  storage?: any
): SupabaseClient => {
  if (supabaseInstance) {
    console.warn('Supabase already initialized')
    return supabaseInstance
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: !isReactNative,
      storage: storage,
    },
  })

  return supabaseInstance
}

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initializeSupabase() first.')
  }
  return supabaseInstance
}
```

**✅ 검증 단계**:
- TypeScript 컴파일 성공 확인
- `npm run build` 실행
- `dist/` 폴더에 `.js`, `.d.ts` 파일 생성 확인

#### 1.3 Auth Store 작성

**src/stores/authStore.ts**
```typescript
import { create } from 'zustand'
import { getSupabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

const getClient = () => {
  try {
    return getSupabase()
  } catch (error) {
    console.error('Supabase not initialized:', error)
    throw error
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await getClient().auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      set({ session: data.session, user: data.user })
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  signOut: async () => {
    try {
      await getClient().auth.signOut()
      set({ session: null, user: null })
    } catch (error) {
      console.error('Signout error:', error)
    }
  },

  initialize: async () => {
    if (get().initialized) return

    try {
      const { data: { session } } = await getClient().auth.getSession()
      set({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true
      })

      getClient().auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null, loading: false })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ loading: false, initialized: true })
    }
  },
}))
```

**✅ 검증 단계**:
- TypeScript 컴파일 성공
- 빌드 후 web app에서 임포트 테스트

---

### Phase 2: Mobile App 생성 (React 18.3.1)

#### 2.1 Expo 프로젝트 생성

```bash
cd apps
npx create-expo-app@latest mobile \
  --template expo-template-blank-typescript

cd mobile
```

#### 2.2 React 버전 명시적 설정

**⚠️ 중요**: 즉시 React 버전을 18.3.1로 고정

```bash
npm install react@18.3.1 react-native@0.76.5
```

**package.json 확인**
```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-native": "0.76.5",
    "expo": "~54.0.0"
  }
}
```

**✅ 검증 단계**:
```bash
npm ls react
# 출력에서 React 18.3.1만 있어야 함 (19.x 없어야 함)
```

#### 2.3 Shared Package 연결

**apps/mobile/package.json**
```json
{
  "dependencies": {
    "@mandaact/shared": "workspace:*",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "react": "18.3.1",
    "react-native": "0.76.5"
  }
}
```

**Root package.json workspaces 설정**
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

```bash
# Root에서 실행
npm install
```

**✅ 검증 단계**:
```bash
# Mobile app에서
npm ls react
npm ls @mandaact/shared

# 모든 패키지가 React 18.3.1 사용하는지 확인
```

#### 2.4 Supabase 초기화 (Mobile)

**apps/mobile/src/lib/supabase-init.ts**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeSupabase } from '@mandaact/shared'

// Constants from app.json
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// Initialize immediately when this module is imported
initializeSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, AsyncStorage)

console.log('Supabase initialized for React Native')
```

**✅ 검증 단계**:
- 기본 App.tsx에서 import만 테스트
- 에러 없이 로드되는지 확인

#### 2.5 기본 App.tsx 테스트

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'

// Initialize Supabase
import './src/lib/supabase-init'

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MandaAct Mobile</Text>
      <Text style={styles.subtitle}>React Native v0.76.5</Text>
      <Text style={styles.info}>React 18.3.1</Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  info: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
})
```

**✅ 검증 단계**:
```bash
npx expo start
# Expo Go에서 테스트
# 화면 정상 표시 확인
# Metro 에러 없는지 확인
```

---

### Phase 3: Navigation 추가

#### 3.1 React Navigation 설치

```bash
cd apps/mobile
npm install \
  @react-navigation/native@^7.1.0 \
  @react-navigation/native-stack@^7.7.0 \
  react-native-screens@^4.16.0 \
  react-native-safe-area-context@^5.6.2
```

**✅ 검증 단계**:
```bash
npm ls react
# React Navigation이 React 18.3.1 사용하는지 확인
```

#### 3.2 Navigation 설정

**src/navigation/RootNavigator.tsx**
```typescript
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '@mandaact/shared'

import LoginScreen from '../screens/LoginScreen'
import HomeScreen from '../screens/HomeScreen'

const Stack = createNativeStackNavigator()

function AuthNavigator() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Home" component={HomeScreen} />
      )}
    </Stack.Navigator>
  )
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <AuthNavigator />
    </NavigationContainer>
  )
}
```

**✅ 검증 단계**:
- Navigation 화면 전환 테스트
- useAuthStore hooks 에러 없는지 확인

---

### Phase 4: 로그인/홈 화면 구현

**src/screens/LoginScreen.tsx**
```typescript
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { useAuthStore } from '@mandaact/shared'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signIn = useAuthStore((state) => state.signIn)

  const handleLogin = async () => {
    const { error } = await signIn(email, password)
    if (error) {
      Alert.alert('로그인 실패', error.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MandaAct</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>로그인</Text>
      </TouchableOpacity>
    </View>
  )
}
```

**✅ 검증 단계**:
- 로그인 폼 UI 표시
- 실제 로그인 기능 테스트
- 로그인 후 HomeScreen 전환 확인

---

## 검증 체크리스트

### ✅ Phase 1 완료 조건
- [ ] Shared package 빌드 성공
- [ ] React가 peerDependency로만 설정됨
- [ ] TypeScript 컴파일 에러 없음

### ✅ Phase 2 완료 조건
- [ ] Mobile app React 18.3.1 확인
- [ ] Expo 기본 앱 실행 성공
- [ ] Metro bundler 에러 없음
- [ ] Shared package import 성공

### ✅ Phase 3 완료 조건
- [ ] Navigation 화면 전환 정상
- [ ] useAuthStore hooks 에러 없음
- [ ] React version conflict 없음

### ✅ Phase 4 완료 조건
- [ ] 로그인 기능 작동
- [ ] 화면 전환 정상
- [ ] Supabase 연동 확인

---

## 주의사항

### ❌ 하지 말아야 할 것
1. React 19.x 사용 금지
2. 여러 React 버전 혼용 금지
3. Shared package에 React 직접 설치 금지
4. 검증 없이 다음 단계 진행 금지

### ✅ 반드시 해야 할 것
1. 각 Phase 완료 시 검증
2. `npm ls react` 정기적 확인
3. Metro bundler 에러 즉시 대응
4. Git commit 단계별 진행

---

## Git Workflow

### Commit Strategy
```bash
# Phase 1 완료 후
git add packages/shared
git commit -m "feat: Add shared packages with React 18.3.1"

# Phase 2 완료 후
git add apps/mobile
git commit -m "feat: Create React Native app with React 18.3.1"

# Phase 3 완료 후
git add apps/mobile/src/navigation
git commit -m "feat: Add navigation with proper React version"

# Phase 4 완료 후
git add apps/mobile/src/screens
git commit -m "feat: Implement login and home screens"
```

---

## Troubleshooting

### React Version Mismatch 발생 시
```bash
# 1. 모든 React 설치 확인
npm ls react

# 2. 잘못된 버전 제거
cd <해당-패키지>
npm uninstall react

# 3. 올바른 버전 재설치
npm install react@18.3.1

# 4. 캐시 클리어
rm -rf node_modules package-lock.json
npm install

# 5. Metro 캐시 클리어
cd apps/mobile
npx expo start --clear
```

### Hooks Error 발생 시
1. React 버전 재확인
2. node_modules 삭제 후 재설치
3. Metro bundler 재시작
4. Expo Go 앱 완전 종료 후 재시작

---

## 참고 자료

- [React 18 Migration Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
- [Expo SDK 54 Documentation](https://docs.expo.dev/)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
