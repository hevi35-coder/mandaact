# Mobile Build Failure Analysis & Plan B
> **Analyst**: Gemin (Antigravity)
> **Date**: 2025-12-05
> **Status**: Resolved ✅ (with Plan B applied)

## 1. 분석 결과 (Root Cause Analysis)

### 1.1 핵심 원인: 의존성 버전 불일치 (Dependency Mismatch)
제공된 `package.json`과 `docs/development/MOBILE_BUILD_TEST_PLAN.md`의 `npx expo-doctor` 경고(버전 불일치)를 교차 분석한 결과, **Expo SDK 52와 호환되지 않는 상위 버전 라이브러리**가 설치되어 있음을 확인했습니다.

| 라이브러리 | 현재 설치된 버전 | Expo SDK 52 권장 버전 | 상태 |
|------------|------------------|----------------------|------|
| **expo-splash-screen** | `^31.0.11` | `~0.29.x` (추정/일반) | ❌ **치명적 (Critical)** |
| **expo-font** | `^14.0.0` | `~13.x.x` | ⚠️ 위험 |
| **expo-localization** | `^17.0.7` | `~16.x.x` | ⚠️ 위험 |
| expo | `~52.0.47` | `~52.0.0` | ✅ 정상 |
| react-native | `0.76.x` | `0.76.x` | ✅ 정상 |

**분석**:
- `expo-splash-screen` 버전 `31.x`는 Expo SDK 52(2024년 말 기준)와 호환되는 통상적인 버전(`0.29` 내외)보다 월등히 높거나, 존재하지 않는 버전(혹은 미래의 버전/타이핑 오류)일 가능성이 높습니다.
- Expo는 "Monolithic SDK" 구조를 가지며, `expo` 패키지 버전과 `expo-*` 모듈들의 버전이 엄격하게 매칭되어야 합니다.
- **증상 연결**: 스플래시 화면에서 멈추는 현상은 `expo-splash-screen`의 네이티브 모듈이 JS 브릿지와 통신하지 못하거나, 초기화 단계에서 Deadlock이 발생했기 때문일 가능성이 매우 높습니다.

### 1.2 "숨겨진" 원인: `package.json` vs `Catalog` 불일치
- `pnpm-workspace.yaml`의 `catalog`에는 `expo-splash-screen` 등이 정의되지 않았거나 SDK 52를 따르도록 유도하고 있으나, `apps/mobile/package.json`에서 이를 오버라이드하거나 `catalog:` 프로토콜을 사용하지 않고 직접 버전을 명시(`^31.0.11`)하면서 문제가 발생했습니다.
- 사용자가 `pnpm update` 또는 `npm install <pkg>@latest`를 실행하여 Expo의 버전 관리 규칙을 우회했을 가능성이 큽니다.

### 1.3 런타임 이슈 해결 기록
1. **Sentry**: `@sentry/browser` 등 내부 의존성을 찾지 못하는 문제 → Sentry Mocking으로 해결.
2. **Polyfills**: `ReferenceError: Property 'FormData' doesn't exist` 및 `Unable to resolve module react-native-get-random-values` 발생.
   - **원인**: Monorepo 환경에서 `npm install`이나 로컬 디렉토리 내 설치가 `pnpm`의 워크스페이스 구조와 충돌하여 패키지가 `node_modules`에 올바르게 링킹되지 않음.
   - **해결**: `pnpm add react-native-get-random-values react-native-url-polyfill --filter @mandaact/mobile` 명령어로 워크스페이스 루트에서 모바일 앱으로 의존성을 올바르게 주입.

---

## 2. 해결 방안 (Action Plan)

### Plan A: 의존성 버전 동기화 (강력 권장) - ✅ 완료 (Success)
Expo가 관리하는 추천 버전으로 모든 의존성을 강제 조정했습니다.

**실행 내용**:
1. `apps/mobile/package.json` 내 문제가 되는 의존성 버전 강제 하향 조정
   - `expo-splash-screen`: `^31.0.11` -> `~0.29.24`
   - `expo-font`: `^14.0.0` -> `~13.0.4`
   - `expo-localization`: `^17.0.7` -> `~16.0.1`
   - `react-native`: `0.76.9` (patch 버전 일치)
   - 기타 관련 패키지 버전 조정

2. **클린 빌드 수행**:
   - `ios` 폴더 삭제 및 재생성 (`prebuild`)
   - `pod install` 완료
   - `Xcode build` 성공 (0 errors)

### Plan B: 라이브러리 대체 및 최소화 (Plan B Applied)
앱 실행 단계에서 발생하는 런타임 오류들을 수정했습니다.

**실행 내용**:
1. **Sentry 비활성화**: `apps/mobile/src/lib/sentry.ts`를 Mock 구현체로 대체하고 패키지 제거.
2. **Polyfill 추가**: `react-native-url-polyfill`, `react-native-get-random-values` 설치 및 `index.ts`에 Import. (Mono-repo 환경에 맞는 pnpm 설치 명령어 사용)

---

## 3. Plan C: 대안적 접근 (Fallback)
(Plan A 및 Plan B 성공으로 인해 생략)

---

## 4. 요약 및 권장사항

1. **버전 고정**: 향후 `pnpm update` 등을 실행할 때 `package.json`의 버전이 Expo SDK 52 범위를 벗어나지 않도록 주의해야 합니다. 가능하다면 `catalog:` 프로토콜을 적극 활용하십시오.
2. **Sentry 재연동**: 추후 운영 배포 시에는 Sentry 버전을 최신(`^7.x` or `^6.x` working version)으로 맞추고, `pnpm` 호환성을 검증한 뒤 재설치해야 합니다. 현재는 기능 테스트를 위해 비활성화 해두었습니다.
3. **패키지 관리**: 반드시 `pnpm` 명령어를 사용하여 패키지를 설치해야 합니다. (`npm install` 금지)
