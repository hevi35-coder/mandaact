# React Native 모바일 앱 테스트 가이드

**최종 업데이트**: 2025-11-26
**앱 버전**: 1.0.0
**Expo SDK**: 54

---

## 🚀 빠른 시작

```bash
# 1. 모바일 앱 디렉토리로 이동
cd apps/mobile

# 2. 환경 변수 설정 (최초 1회)
cp .env.example .env
# .env 파일에 Supabase 설정 입력

# 3. 의존성 설치 (프로젝트 루트에서)
cd ../..
npm install

# 4. Expo 개발 서버 시작
cd apps/mobile
npm start
```

---

## 📋 사전 준비

### 필수 설치 항목

| 항목 | 버전 | 설치 명령 |
|------|------|----------|
| Node.js | 18+ | https://nodejs.org |
| Expo CLI | 최신 | `npm install -g expo-cli` |
| Expo Go (기기) | 최신 | App Store / Google Play |

### 선택 설치 (시뮬레이터용)

| 플랫폼 | 도구 | 설치 방법 |
|--------|------|----------|
| iOS | Xcode | App Store (macOS 전용) |
| Android | Android Studio | https://developer.android.com/studio |

---

## ⚙️ 환경 변수 설정

`apps/mobile/.env` 파일 생성:

```bash
# Supabase Configuration (필수)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
EXPO_PUBLIC_APP_NAME=MandaAct
EXPO_PUBLIC_APP_ENV=development

# Sentry (선택)
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn

# PostHog (선택)
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_api_key
```

> **참고**: 웹 앱(`apps/web/.env.local`)과 동일한 Supabase 프로젝트 설정 사용

---

## 📱 테스트 방법

### 방법 1: 실제 기기 (권장)

**장점**: 네이티브 기능 완전 지원 (알림, 카메라, 햅틱 등)

1. `npm start` 실행
2. 터미널에 QR 코드 표시됨
3. **iOS**: 카메라 앱으로 스캔 → "Expo Go에서 열기"
4. **Android**: Expo Go 앱 → "Scan QR code"

**네트워크 요구사항**:
- 개발 PC와 기기가 **같은 Wi-Fi** 연결
- 방화벽에서 **8081 포트** 허용

### 방법 2: iOS 시뮬레이터 (macOS)

```bash
npm run ios
# 또는
npx expo start --ios
```

**요구사항**: Xcode 설치 + iOS Simulator

### 방법 3: Android 에뮬레이터

```bash
npm run android
# 또는
npx expo start --android
```

**요구사항**: Android Studio + AVD (Android Virtual Device) 설정

### 방법 4: 웹 브라우저 (제한적)

```bash
npm run web
# http://localhost:8081 접속
```

**제한사항**: 알림, 카메라, 햅틱 등 네이티브 기능 미지원

---

## ✅ 기능 테스트 체크리스트

### 1. 인증 (LoginScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 로그인 (정상) | HomeScreen으로 이동 | ☐ |
| 로그인 (잘못된 비밀번호) | 한글 에러 메시지 표시 | ☐ |
| 회원가입 (정상) | 계정 생성 + 로그인 | ☐ |
| 회원가입 (중복 이메일) | "이미 가입된 이메일입니다" | ☐ |
| 비밀번호 찾기 클릭 | 모달 표시 | ☐ |
| 비밀번호 재설정 요청 | 성공 알림 + 이메일 발송 | ☐ |

### 2. 홈 화면 (HomeScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| XP/레벨 표시 | 현재 레벨, 경험치 바 | ☐ |
| 스트릭 표시 | 연속 실천 일수 | ☐ |
| "실천하러 가기" 버튼 | TodayScreen으로 이동 | ☐ |
| 최근 활동 | 체크 히스토리 표시 | ☐ |

### 3. 오늘의 실천 (TodayScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 액션 목록 표시 | 만다라트별 그룹화 | ☐ |
| 체크박스 탭 | 완료 처리 + XP 획득 | ☐ |
| 타입 필터 (루틴) | 루틴 타입만 표시 | ☐ |
| 타입 필터 (미션) | 미션 타입만 표시 | ☐ |
| 빈 상태 | EmptyState 컴포넌트 표시 | ☐ |

### 4. 만다라트 관리 (MandalartListScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 목록 표시 | 모든 만다라트 카드 | ☐ |
| 활성화 토글 | 상태 변경 + API 반영 | ☐ |
| 만다라트 탭 | 상세 화면으로 이동 | ☐ |
| 새 만다라트 버튼 | 생성 화면으로 이동 | ☐ |

### 5. 만다라트 생성 (MandalartCreateScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 이미지 OCR 탭 | 카메라/갤러리 선택 | ☐ |
| 사진 촬영 | 권한 요청 → OCR 실행 | ☐ |
| 갤러리 선택 | 권한 요청 → OCR 실행 | ☐ |
| OCR 결과 | 인식된 텍스트 프리뷰 | ☐ |
| 텍스트 붙여넣기 | 파싱 → 프리뷰 | ☐ |
| 수동 입력 | 빈 템플릿 표시 | ☐ |
| 저장 | 만다라트 생성 완료 | ☐ |

### 6. 만다라트 상세 (MandalartDetailScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 9x9 그리드 표시 | 핵심목표 + 8개 세부목표 | ☐ |
| 액션 탭 (길게) | 편집 모달 표시 | ☐ |
| 타입 변경 | 루틴/미션/참고 선택 가능 | ☐ |
| 빈도 변경 | daily/weekly/monthly | ☐ |
| 저장 | 변경사항 반영 | ☐ |
| 이미지 내보내기 | 갤러리에 저장 | ☐ |
| 공유 | 공유 시트 표시 | ☐ |

### 7. 통계 (StatsScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 히트맵 표시 | 날짜별 실천 현황 | ☐ |
| XP/레벨 정보 | 게임화 통계 | ☐ |
| 진행률 차트 | 세부목표별 완료율 | ☐ |
| 만다라트 필터 | 선택된 만다라트만 표시 | ☐ |

### 8. AI 리포트 (ReportsScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 주간 리포트 목록 | 이전 리포트 표시 | ☐ |
| 리포트 생성 | 로딩 → AI 분석 결과 | ☐ |
| 목표 진단 | SMART 기준 분석 | ☐ |

### 9. 배지 (BadgeScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 배지 목록 | 21개 배지 그리드 | ☐ |
| 획득 배지 | 컬러 + 날짜 표시 | ☐ |
| 미획득 배지 | 회색 + 잠금 표시 | ☐ |
| 진행률 | 현재/목표 표시 | ☐ |

### 10. 설정 (SettingsScreen)

| 테스트 항목 | 예상 결과 | 확인 |
|------------|----------|------|
| 알림 토글 (ON) | 권한 요청 → 활성화 | ☐ |
| 알림 토글 (OFF) | 알림 비활성화 | ☐ |
| 시간 선택 | TimePicker 모달 | ☐ |
| 시간 저장 | 선택 시간 반영 | ☐ |
| 로그아웃 | LoginScreen으로 이동 | ☐ |

---

## 🐛 디버깅

### 로그 확인

```bash
# Expo 개발 서버 로그 (터미널)
npm start

# React Native Debugger
# 기기 흔들기 (또는 Cmd+D / Ctrl+M) → "Debug Remote JS"
```

### 캐시 초기화

```bash
# Metro bundler 캐시 초기화
npx expo start --clear

# node_modules 재설치
rm -rf node_modules
npm install
```

### 일반적인 문제 해결

| 문제 | 해결 방법 |
|------|----------|
| QR 코드 스캔 안됨 | 같은 Wi-Fi 연결 확인, 방화벽 8081 포트 허용 |
| 앱 로딩 멈춤 | `npx expo start --clear` 실행 |
| 환경 변수 미적용 | `.env` 파일 확인, 앱 재시작 |
| 네트워크 에러 | Supabase URL/Key 확인 |
| 권한 에러 | 기기 설정에서 앱 권한 허용 |

### 터미널 단축키

| 키 | 동작 |
|----|------|
| `r` | 앱 새로고침 (Reload) |
| `m` | 개발 메뉴 열기 |
| `j` | Chrome DevTools 열기 |
| `?` | 도움말 표시 |

---

## 📊 테스트 결과 기록

### 테스트 환경

| 항목 | 값 |
|------|---|
| 테스트 날짜 | YYYY-MM-DD |
| 테스터 | |
| 기기 | (예: iPhone 14 Pro, Pixel 7) |
| OS 버전 | (예: iOS 17.0, Android 14) |
| Expo Go 버전 | |
| 앱 버전 | 1.0.0 |

### 테스트 결과 요약

| 기능 영역 | 테스트 수 | 통과 | 실패 | 비고 |
|----------|----------|------|------|------|
| 인증 | 6 | | | |
| 홈 화면 | 4 | | | |
| 오늘의 실천 | 5 | | | |
| 만다라트 관리 | 4 | | | |
| 만다라트 생성 | 7 | | | |
| 만다라트 상세 | 7 | | | |
| 통계 | 4 | | | |
| AI 리포트 | 3 | | | |
| 배지 | 4 | | | |
| 설정 | 5 | | | |
| **합계** | **49** | | | |

### 발견된 이슈

| # | 심각도 | 화면 | 설명 | 상태 |
|---|--------|------|------|------|
| 1 | | | | |
| 2 | | | | |

**심각도**: 🔴 Critical | 🟡 Major | 🟢 Minor

---

## 🔗 관련 문서

- [ROADMAP.md](../project/ROADMAP.md) - 전체 프로젝트 로드맵
- [CLAUDE.md](../../CLAUDE.md) - 개발 가이드라인
- [apps/mobile/README.md](../../apps/mobile/README.md) - 모바일 앱 개요

---

---

## 🚢 프로덕션 배포 (EAS Build)

### EAS Build 환경 변수 설정

앱스토어 배포 전 EAS Build에서 Sentry DSN을 설정해야 합니다.

#### 방법 1: eas.json에 직접 설정

```json
// apps/mobile/eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "https://xxx@o123.ingest.sentry.io/456"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "https://xxx@o123.ingest.sentry.io/456"
      }
    }
  }
}
```

#### 방법 2: EAS Secrets 사용 (권장 - 보안)

```bash
# EAS CLI 설치
npm install -g eas-cli

# 로그인
eas login

# Secret 생성 (프로젝트 스코프)
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://xxx@o123.ingest.sentry.io/456"

# Secret 확인
eas secret:list
```

#### 빌드 명령어

```bash
# 프로덕션 빌드 (iOS)
eas build --platform ios --profile production

# 프로덕션 빌드 (Android)
eas build --platform android --profile production

# 양쪽 플랫폼
eas build --platform all --profile production
```

### Sentry 소스맵 업로드 (선택)

더 나은 에러 추적을 위해 소스맵을 업로드할 수 있습니다:

```bash
# @sentry/react-native의 sentry.properties 설정
# apps/mobile/sentry.properties
defaults.url=https://sentry.io/
defaults.org=your-org
defaults.project=mandaact-mobile
auth.token=your-sentry-auth-token
```

### 체크리스트

| 단계 | 설명 | 완료 |
|------|------|------|
| 1 | Sentry 프로젝트 생성 | ☐ |
| 2 | DSN을 `.env`에 추가 (개발용) | ☐ |
| 3 | App.tsx에 `initSentry()` 추가 | ☐ |
| 4 | EAS Secrets 설정 (프로덕션용) | ☐ |
| 5 | 프로덕션 빌드 생성 | ☐ |
| 6 | 앱스토어 제출 | ☐ |

---

**문서 버전**: 1.1
**최종 수정**: 2025-11-27
