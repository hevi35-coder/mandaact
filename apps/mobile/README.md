# MandaAct Mobile

React Native 모바일 앱 - Expo SDK 54 기반

## 기술 스택

- **프레임워크**: React Native 0.81 + Expo SDK 54
- **언어**: TypeScript 5.9
- **스타일링**: NativeWind (Tailwind CSS for RN)
- **네비게이션**: React Navigation v7
- **상태 관리**: Zustand + TanStack Query
- **백엔드**: Supabase (Auth, Database, Storage)

## 시작하기

### 사전 요구사항

- Node.js 18+
- pnpm 9+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- iOS: Xcode 15+ (macOS only)
- Android: Android Studio + SDK

### 설치

```bash
# 프로젝트 루트에서
pnpm install

# 또는 mobile 앱만
cd apps/mobile
pnpm install
```

### 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필수 환경 변수 설정
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 개발 서버 실행

```bash
# 프로젝트 루트에서
pnpm dev:mobile

# 또는 apps/mobile에서
pnpm start
```

### 플랫폼별 실행

```bash
# iOS 시뮬레이터
pnpm ios

# Android 에뮬레이터
pnpm android

# Expo Go (물리 디바이스)
pnpm start --go
```

## 빌드

### EAS Build 설정

```bash
# EAS 로그인
eas login

# 프로젝트 설정
eas build:configure
```

### 빌드 프로파일

| 프로파일 | 용도 | 명령어 |
|---------|------|--------|
| development | 개발용 (dev client) | `eas build --profile development` |
| preview | 테스트 배포 (APK/Ad Hoc) | `eas build --profile preview` |
| production | 스토어 배포 | `eas build --profile production` |

### iOS 빌드

```bash
# 개발용 (시뮬레이터)
eas build --platform ios --profile development

# 프리뷰 (Ad Hoc)
eas build --platform ios --profile preview

# 프로덕션 (App Store)
eas build --platform ios --profile production
```

### Android 빌드

```bash
# 개발용
eas build --platform android --profile development

# 프리뷰 (APK)
eas build --platform android --profile preview

# 프로덕션 (AAB)
eas build --platform android --profile production
```

## 프로젝트 구조

```
apps/mobile/
├── App.tsx                 # 앱 진입점
├── app.json                # Expo 설정
├── eas.json                # EAS Build 설정
├── package.json
├── tsconfig.json
├── tailwind.config.js      # NativeWind 설정
├── assets/                 # 이미지, 아이콘
└── src/
    ├── components/         # 재사용 컴포넌트
    │   └── ActivityHeatmap.tsx
    ├── hooks/              # 커스텀 훅
    │   ├── useActions.ts
    │   ├── useMandalarts.ts
    │   └── useStats.ts
    ├── lib/                # 유틸리티
    │   ├── supabase.ts
    │   └── queryPersister.ts
    ├── navigation/         # 네비게이션
    │   └── RootNavigator.tsx
    ├── screens/            # 화면 컴포넌트
    │   ├── HomeScreen.tsx
    │   ├── TodayScreen.tsx
    │   ├── MandalartListScreen.tsx
    │   ├── MandalartCreateScreen.tsx
    │   ├── MandalartDetailScreen.tsx
    │   ├── StatsScreen.tsx
    │   └── SettingsScreen.tsx
    ├── services/           # API 서비스
    │   ├── ocrService.ts
    │   ├── exportService.ts
    │   └── notificationService.ts
    └── store/              # 상태 관리
        └── authStore.ts
```

## 주요 기능

### 구현 완료
- [x] 인증 (로그인/회원가입)
- [x] 오늘의 실천 체크리스트
- [x] 만다라트 목록/생성/상세
- [x] OCR 이미지 인식
- [x] 텍스트 파싱
- [x] 9x9 그리드 시각화
- [x] 통계 (일간/주간/히트맵)
- [x] XP/레벨 시스템
- [x] 스트릭 표시
- [x] 오프라인 캐싱
- [x] 푸시 알림 설정

### 추후 구현
- [ ] AI 리포트 (주간/목표 진단)
- [ ] 튜토리얼
- [ ] 뱃지 시스템
- [ ] 소셜 공유

## 공유 패키지

웹앱과 공유하는 코드는 `packages/shared`에 있습니다:

```typescript
import {
  shouldShowToday,
  suggestActionType,
  getDayBoundsUTC,
  APP_NAME
} from '@mandaact/shared'
```

## 스토어 제출

### iOS (App Store)

```bash
# 빌드
eas build --platform ios --profile production

# 제출
eas submit --platform ios --profile production
```

### Android (Play Store)

```bash
# 빌드
eas build --platform android --profile production

# 제출
eas submit --platform android --profile production
```

## 문제 해결

### Metro 캐시 초기화

```bash
npx expo start --clear
```

### 의존성 재설치

```bash
rm -rf node_modules
pnpm install
```

### iOS Pod 재설치

```bash
cd ios && pod install --repo-update
```

## 관련 문서

- [Expo 공식 문서](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
