# Mobile Build Analysis & Guide
> **Analyst**: Gemin (Antigravity)
> **Date**: 2025-12-05
> **Last Updated**: 2025-12-05 (빌드 성공 확인)
> **Status**: Resolved ✅

이 문서는 기존 `MOBILE_BUILD_TEST_PLAN.md`, `MOBILE_BUILD_TROUBLESHOOTING.md` 및 `MOBILE_BUILD_ANALYSIS_gemini.md`를 통합하여, 모바일 빌드 실패 원인 분석부터 해결 과정, 그리고 향후 가이드라인까지 포괄적으로 다룹니다.

---

## 1. 개요 (Overview)

### 1.1 배경
Expo SDK 52 및 React Native 0.76.x 기반의 iOS 빌드 과정에서 스플래시 화면 멈춤, 런타임 오류 등 다양한 문제가 발생했습니다. 초기 분석에서는 환경적 요인(Xcode 버전 등)이 의심되었으나, 심층 분석 결과 **의존성 버전 불일치**와 **Monorepo 환경의 패키지 링킹 문제**가 핵심 원인으로 밝혀졌습니다.

### 1.2 테스트 환경
- **Target OS**: iOS 18.x (iPhone 16 Pro 시뮬레이터)
- **Framework**: Expo SDK 52 (Managed Workflow + Development Client)
- **Package Manager**: pnpm (Monorepo)

---

## 2. 문제 분석 및 해결 과정 (Troubleshooting Log)

### 2.1 이슈 1: 의존성 버전 불일치 (Dependency Mismatch)

**증상:**
- 스플래시 화면에서 앱이 멈추거나, 네이티브 모듈 초기화 실패.
- `npx expo-doctor` 실행 시 다수의 버전 불일치 경고 발생.

**원인:**
- `package.json`에 명시된 `expo-splash-screen`, `expo-font` 등이 Expo SDK 52와 호환되지 않는 미래 버전(예: `^31.x`)으로 설정됨.
- `catalog` 프로토콜을 사용하지 않고 직접 버전을 지정하여 발생.

**해결 (Resolved):**
- 모든 의존성을 Expo SDK 52 권장 버전으로 강제 하향 조정.
    - `expo-splash-screen`: `~0.29.24`
    - `expo-font`: `~13.0.4`
    - `react-native`: `0.76.9`

### 2.2 이슈 2: Sentry 런타임 에러

**증상:**
- 앱 실행 직후 붉은 에러 화면 발생 ("Unable to resolve module @sentry/browser").

**원인:**
- `@sentry/react-native` 패키지가 Monorepo + pnpm 환경에서 내부 의존성을 올바르게 찾지 못함.

**해결 (Plan B Applied):**
- Sentry 기능을 임시 비활성화(Mocking) 처리.
- `apps/mobile/src/lib/sentry.ts`를 `console.log`만 출력하는 Mock 함수로 대체.
- 향후 안정적인 버전 및 설정 검증 후 재도입 예정.

### 2.3 이슈 3: Polyfill 누락 (FormData, GetRandomValues)

**증상:**
- `ReferenceError: Property 'FormData' doesn't exist`
- `Unable to resolve module react-native-get-random-values`

**원인:**
- React Native 환경에서 Supabase 등 외부 라이브러리가 표준 Web API(URL, FormData)를 필요로 하나, 기본적으로 제공되지 않음.
- Monorepo 루트에 설치된 패키지가 Metro 번들러에서 모바일 앱으로 링킹되지 않음.

**해결 (Resolved):**
- `react-native-url-polyfill`, `react-native-get-random-values` 설치.
- **중요**: `pnpm add ... --filter @mandaact/mobile` 명령어를 사용하여 모바일 워크스페이스에 명시적으로 추가.
- `apps/mobile/index.ts` 최상단에 Import 추가.

### 2.4 이슈 4: Lock 파일 중복 및 Metro Config 경고 (2025-12-05)

**증상:**
- `npx expo-doctor` 실행 시 2가지 경고 발생:
  - "Multiple lock files detected (pnpm-lock.yaml, package-lock.json)"
  - "watchFolders does not contain all entries from Expo's defaults"
  - "resolver.unstable_enableSymlinks mismatch"

**원인:**
- pnpm 프로젝트인데 루트에 npm의 `package-lock.json`이 남아있음
- `metro.config.js`에서 `watchFolders`를 덮어쓰면서 Expo 기본값 손실
- `unstable_enableSymlinks` 설정이 Expo 52 권장 설정과 충돌

**해결 (Resolved):**
1. 루트의 `package-lock.json` 삭제
2. `metro.config.js` 수정:
   ```javascript
   // Before (문제)
   config.watchFolders = [workspaceRoot];
   config.resolver.unstable_enableSymlinks = true;

   // After (해결)
   config.watchFolders = [...(config.watchFolders || []), workspaceRoot];
   // unstable_enableSymlinks 라인 제거
   ```

**검증 결과:**
- `npx expo-doctor`: 17/17 checks passed ✅
- iOS 빌드: 성공 ✅
- Metro 번들링: 4021 modules, 1116ms ✅
- 앱 실행: 로그인 화면 정상 표시 ✅

### 2.5 이슈 5: NativeWind 스타일링 복구 (2025-12-05)

**증상:**
- 빌드는 성공하나 NativeWind 스타일이 적용되지 않음
- Tailwind 클래스(className)가 무시됨

**원인:**
- NativeWind가 `devDependencies`에서 완전히 제거된 상태
- `tailwind.config.js` 파일 누락
- `babel.config.js`에 NativeWind preset 설정 누락
- `metro.config.js`에서 NativeWind 통합 코드가 주석 처리됨

**해결 (Resolved):**
1. NativeWind 및 Tailwind CSS 설치 (정확한 버전 중요):
   ```bash
   pnpm add nativewind@4.1.23 tailwindcss@^3.4.0 --filter @mandaact/mobile -D
   ```
   > ⚠️ **중요**: NativeWind 4.2.x 버전은 `react-native-worklets/plugin` 에러가 발생함. 반드시 **4.1.23** 사용

2. `tailwind.config.js` 생성:
   ```javascript
   module.exports = {
     content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
     presets: [require('nativewind/preset')],
     theme: { extend: {} },
     plugins: [],
   };
   ```

3. `babel.config.js` 수정:
   ```javascript
   module.exports = function (api) {
     api.cache(true);
     return {
       presets: [
         ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
         'nativewind/babel',
       ],
     };
   };
   ```

4. `nativewind-env.d.ts` 생성 (TypeScript 지원):
   ```typescript
   /// <reference types="nativewind/types" />
   ```

5. `metro.config.js` 마지막 줄 수정:
   ```javascript
   const { withNativeWind } = require('nativewind/metro');
   module.exports = withNativeWind(config, { input: './global.css' });
   ```

**검증 결과:**
- Metro 번들링: 4200+ modules ✅
- NativeWind 스타일 적용: 정상 ✅
- 앱 UI: 모든 Tailwind 클래스 정상 작동 ✅

---

## 3. 통합 빌드 & 테스트 가이드 (Consolidated Guide)

### 3.1 빌드 준비
모든 명령어는 프로젝트 루트(`mandaact/`)가 아닌 `apps/mobile/` 디렉토리를 기준으로 할 때와 루트에서 필터를 사용할 때를 구분해야 합니다.

**권장: 루트에서 실행**
```bash
# 의존성 설치
pnpm install

# 모바일 앱 시작 (Metro Bundler)
pnpm --filter @mandaact/mobile start --clear
```

### 3.2 Clean Build 절차 (문제가 생겼을 때)
가장 확실한 방법은 네이티브 폴더(`ios`)를 재생성하는 것입니다.

```bash
cd apps/mobile

# 1. 기존 빌드 아티팩트 제거
rm -rf ios node_modules/.cache .expo

# 2. Prebuild (네이티브 프로젝트 생성)
npx expo prebuild --clean

# 3. iOS 시뮬레이터 빌드 및 실행
npx expo run:ios
```

### 3.3 검증 체크리스트
- [x] `pnpm install`이 에러 없이 완료되는가? (Peer dependency 경고는 허용)
- [x] `npx expo-doctor` 검사 시 "Version Mismatch" 경고가 없는가?
- [x] 시뮬레이터 실행 후 스플래시 화면을 넘어 메인 화면(로그인 등)이 뜨는가?
- [x] Metro 터미널에 붉은색 에러 로그가 없는가?

---

## 4. 향후 과제 및 개선 계획 (Roadmap)

### 4.1 Sentry 복구 (Priority: High)
- 현재 Mock 처리된 Sentry를 프로덕션 배포 전 복구해야 합니다.
- `sentry-expo` 대신 `@sentry/react-native` 최신 버전을 사용하되, `metro.config.js`에서 `resolver` 설정을 조정하여 Monorepo 호환성을 확보해야 합니다.

### 4.2 UI 스타일링 복구 (Priority: High) ✅ RESOLVED
- ~~현재 NativeWind가 비활성화되어 있어 기본 스타일만 적용됨~~
- **해결됨**: NativeWind 4.1.23 버전으로 복구 완료
- RN 0.76과 호환성 검증 완료

### 4.3 Require Cycle 리팩토링 (Priority: Medium)
- 현재 순환 참조 경고 발생:
  - `RootNavigator.tsx` ↔ `HomeScreen.tsx`
  - `RootNavigator.tsx` ↔ `TodayScreen.tsx`
  - `RootNavigator.tsx` ↔ `MandalartListScreen.tsx`
  - `RootNavigator.tsx` ↔ `ReportsScreen.tsx`
- Navigation type을 별도 파일로 분리하여 해결 권장

### 4.4 CI/CD 파이프라인 (Priority: Medium)
- 로컬 환경 의존성을 없애기 위해 EAS Build(Cloud) 설정을 고도화합니다.
- `eas.json`에 `development`, `preview`, `production` 프로파일을 명확히 정의합니다.

### 4.5 스토어 배포 준비 (Priority: High)
- App Store / Google Play 스토어 등록
- 앱 아이콘, 스크린샷, 설명 준비
- Privacy Policy, Terms of Service 페이지 구성

### 4.6 문서 관리
- 더 이상 개별적인 `MOBILE_BUILD_*.md` 문서를 생성하지 않고, 이 문서(`MOBILE_BUILD_GUIDE.md`) 하나로 통합 관리합니다.
- 새로운 이슈 발생 시 **2. 문제 분석 및 해결 과정** 섹션에 추가합니다.

---

## 5. 알려진 경고 (Known Warnings)

### 5.1 Require Cycles (Non-blocking)
```
WARN Require cycle: src/navigation/RootNavigator.tsx -> src/screens/*Screen.tsx -> src/navigation/RootNavigator.tsx
```
- **영향**: 앱 실행에 문제 없음, 일부 초기화 순서 문제 가능성
- **해결 방안**: Navigation types를 별도 파일로 분리

### 5.2 NativeWind 버전 제한 (Resolved)
- ~~`metro.config.js`에서 NativeWind가 주석 처리됨~~
- **해결됨**: NativeWind 4.1.23 버전 사용 (4.2.x는 worklets/plugin 에러 발생)
- `global.css` 파일이 프로젝트 루트에 있어야 함

### 5.3 Console Warnings (Safe to Ignore)
다음 경고들은 앱 기능에 영향을 주지 않으며 무시해도 됩니다:

```
LOG [ENV] Loaded from: /path/to/mandaact/.env.local
```
- **설명**: 환경 변수 로드 확인 메시지 (정상)

```
WARN Require cycle: src/navigation/RootNavigator.tsx -> src/screens/*Screen.tsx -> src/navigation/RootNavigator.tsx
```
- **설명**: Navigation 타입 참조로 인한 순환 참조 (기능 영향 없음)
- **해결 방안**: Navigation types를 별도 파일로 분리 (낮은 우선순위)

```
LOG [Sentry Mock] initialized
```
- **설명**: Sentry가 현재 Mock 처리되어 있음 (의도된 동작)
- **프로덕션 전**: 실제 Sentry로 교체 필요

```
LOG PostHog React Native started v...
```
- **설명**: Analytics 초기화 완료 (정상)

```
WARN [react-native-reanimated] Tried to modify Shadow props on a shadow node that doesn't exist...
```
- **설명**: Reanimated 내부 경고 (iOS에서 가끔 발생, 기능 영향 없음)

```
WARN Expo Push Notifications: Must use physical device for push notifications
```
- **설명**: 시뮬레이터에서는 푸시 알림 테스트 불가 (정상)
- **해결**: 실제 기기에서 테스트 필요

---

---

## 6. AdMob 통합 테스트 빌드 (2025-12-06)

### 6.1 배경
AdMob SDK (`react-native-google-mobile-ads` v16.0.0) 통합 후 첫 네이티브 빌드 테스트.
- Phase 1: 배너 광고 (Home, Today, List 화면)
- Phase 2: 보상형 광고 훅 및 XP 부스트 버튼

### 6.2 추가된 네이티브 모듈
- `react-native-google-mobile-ads` v16.0.0
- iOS AdMob App ID: `ca-app-pub-3170834290529005~1573851405`
- SKAdNetwork identifiers 10개 추가
- NSUserTrackingUsageDescription (ATT 권한)

### 6.3 빌드 진행 로그

**시작 시간**: 2025-12-06 02:XX KST

**Step 1: 기존 빌드 아티팩트 제거**
```bash
cd apps/mobile
rm -rf ios node_modules/.cache .expo
```
- [x] 완료 ✅

**Step 2: Prebuild (네이티브 프로젝트 생성)**
```bash
npx expo prebuild --clean
```
- [x] 완료 ✅
- 출력: "Created native directories", "Finished prebuild", "Installed CocoaPods"
- 경고: "No 'androidAppId' was provided" - iOS만 구현 중이므로 정상

**Step 3: iOS 시뮬레이터 빌드 및 실행**
```bash
npx expo run:ios
```
- [x] 완료 ✅
- 빌드 시간: 약 7분
- 대상 시뮬레이터: iPhone 16 Pro (iOS 18.0)
- Google Mobile Ads SDK 리소스 정상 빌드됨
- GoogleUserMessagingPlatform (UMP) 정상 포함됨

### 6.4 검증 체크리스트
- [x] 앱이 스플래시 화면을 넘어 정상 실행되는가? ✅
- [x] AdMob SDK 초기화 성공? ✅ (`GADMobileAds state = Ready`)
- [ ] Home 화면 하단에 배너 광고가 표시되는가? ⚠️ 시뮬레이터 제한
- [ ] Today 화면 하단에 배너 광고가 표시되는가? ⚠️ 시뮬레이터 제한
- [ ] MandalartList 화면 하단에 배너 광고가 표시되는가? ⚠️ 시뮬레이터 제한
- [x] Metro 터미널에 AdMob 관련 에러가 없는가? ✅

### 6.5 결과

**빌드 성공** ✅

iOS 네이티브 빌드가 성공적으로 완료되었습니다:
- AdMob SDK (`react-native-google-mobile-ads` v16.0.0) 정상 통합
- Google Mobile Ads SDK 초기화 성공
- 테스트 광고 Unit ID 설정 완료 (`ca-app-pub-3940256099942544/2934735716`)

**시뮬레이터 제한사항** ⚠️

시뮬레이터에서 배너 광고가 표시되지 않습니다:
- SDK 초기화는 성공 (`GADMobileAds state = Ready`)
- `onAdLoaded` / `onAdFailedToLoad` 콜백이 호출되지 않음
- iOS 시뮬레이터에서 Google AdMob 테스트 광고 로드 제한 가능성

**필요한 추가 조치**:
1. **실제 기기 테스트** 필요 (TestFlight 또는 개발자 빌드)
2. EAS Build로 `.ipa` 생성 후 실기기 설치
3. 실기기에서 테스트 광고 로드 검증

### 6.6 코드 변경 사항

**App.tsx**: AdMob SDK 초기화 추가
```typescript
import mobileAds from 'react-native-google-mobile-ads'

mobileAds()
  .initialize()
  .then((adapterStatuses) => {
    console.log('[AdMob] SDK initialized successfully', adapterStatuses)
  })
```

**BannerAd.tsx**: 개발 환경에서 TestIds 사용
```typescript
import { TestIds } from 'react-native-google-mobile-ads'

const adUnitId = __DEV__ ? TestIds.BANNER : LOCATION_TO_AD_UNIT[location]
```

---

**참고 문서**:
- [Expo SDK 52 Upgrade Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [React Native Polyfills](https://docs.expo.dev/guides/using-libraries/#using-third-party-libraries)
- [NativeWind v4 Migration](https://www.nativewind.dev/v4/overview)
- [react-native-google-mobile-ads Docs](https://docs.page/invertase/react-native-google-mobile-ads)
