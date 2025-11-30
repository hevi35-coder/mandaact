# 빌드 및 배포 가이드 (Build & Deployment Guide)

> **작성일**: 2025-12-01
> **목적**: 개발 빌드 과정의 어려움을 해소하고, 원활한 빌드 및 배포를 위한 절차와 트러블슈팅 가이드를 제공함.

---

## 1. 사전 준비 (Prerequisites)

### 1.1 필수 도구 설치
- **Node.js**: v20.x (LTS)
- **pnpm**: v9.x
- **EAS CLI**: `npm install -g eas-cli` (Expo Application Services)
- **Expo CLI**: `npm install -g expo-cli` (선택 사항, 로컬 실행용)

### 1.2 계정 및 인증
1.  **Expo 계정 로그인**:
    ```bash
    eas login
    ```
2.  **프로젝트 연결**:
    `apps/mobile/app.json`의 `extra.eas.projectId`가 올바른지 확인.

---

## 2. 환경 변수 설정 (Environment Variables)

빌드 실패의 가장 큰 원인은 **환경 변수 누락**입니다.

### 2.1 로컬 개발용 (.env)
`apps/mobile/.env` 파일을 생성하고 다음 키를 포함해야 합니다.
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# 필요한 경우 추가
# EXPO_PUBLIC_SENTRY_DSN=...
```

### 2.2 EAS Build용 (Secrets)
EAS Build 서버는 로컬 `.env` 파일을 읽지 않습니다. **반드시 EAS Secrets에 등록해야 합니다.**

```bash
# 시크릿 등록 명령어
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "값"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "값"
```

**확인 방법**:
```bash
eas secret:list
```

---

## 마무리 (Wrap-up)

빌드가 성공적으로 완료되면:
- **Preview Build**: Expo Go나 시뮬레이터에서 테스트
- **Production Build**: 스토어 제출 또는 내부 배포

자세한 배포 절차는 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**를 참고하세요.

---

## 관련 문서 (Related Documents)

- **[VERSION_POLICY.md](./VERSION_POLICY.md)**: Expo SDK 및 React Native 버전 정책
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: 개발 환경 초기 설정
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**: 프로덕션 배포 가이드
- **[TESTING_GUIDE.md](../mobile/TESTING_GUIDE.md)**: 모바일 앱 테스트 시나리오

---

## 3. 개발 빌드 (Development Build)

Expo Go가 아닌, 네이티브 코드가 포함된 **Development Build**를 사용하는 경우입니다.

### 3.1 클라우드 빌드 (추천)
로컬 환경(Xcode/Android Studio) 설정 없이 빌드할 수 있어 가장 간편합니다.

```bash
cd apps/mobile

# iOS 개발 빌드 (시뮬레이터용)
eas build --profile development --platform ios --local

# Android 개발 빌드 (에뮬레이터/디바이스용)
eas build --profile development --platform android
```

### 3.2 로컬 빌드 (Prebuild)
직접 Xcode/Android Studio로 빌드해야 할 때 사용합니다. (디버깅 용이)

```bash
cd apps/mobile

# 1. Prebuild (네이티브 폴더 생성: ios/, android/)
npx expo prebuild

# 2. iOS 실행
npm run ios

# 3. Android 실행
npm run android
```

---

## 4. 프로덕션 빌드 (Production Build)

스토어 배포용 빌드입니다.

```bash
cd apps/mobile

# iOS 프로덕션 빌드
eas build --profile production --platform ios

# Android 프로덕션 빌드
eas build --profile production --platform android
```

---

## 5. 트러블슈팅 (Troubleshooting)

개발 빌드 과정에서 자주 발생하는 문제와 해결 방법입니다.

### 5.1 "Env variable not found" 또는 런타임 에러
*   **증상**: 앱 실행 후 Supabase 연결 실패 또는 `undefined` 에러.
*   **원인**: EAS Secrets에 환경 변수가 등록되지 않았거나, `EXPO_PUBLIC_` 접두사가 누락됨.
*   **해결**:
    1.  `eas secret:list`로 변수 확인.
    2.  변수명 앞에 `EXPO_PUBLIC_`이 붙어 있는지 확인 (Expo SDK 49+ 필수).
    3.  빌드 캐시 문제일 수 있으므로 `--clear-cache` 옵션으로 다시 빌드.

### 5.2 네이티브 모듈 링크 에러 / CocoaPods 에러
*   **증상**: `pod install` 실패 또는 네이티브 모듈을 찾을 수 없음.
*   **원인**: `node_modules`와 네이티브 폴더 간의 동기화 문제.
*   **해결**:
    ```bash
    # 1. 클린업
    cd apps/mobile
    rm -rf node_modules ios android
    
    # 2. 재설치
    pnpm install
    
    # 3. Prebuild 재생성
    npx expo prebuild --clean
    ```

### 5.3 EAS Build 대기 시간 과다
*   **증상**: Free Tier 사용 시 빌드 큐 대기 시간이 김.
*   **해결**:
    - 로컬에서 EAS 빌드 실행: `eas build --local` (본인 컴퓨터 자원 사용).
    - 단, Mac이 있어야 iOS 빌드 가능.

### 5.4 버전 호환성 경고 (Expo Doctor)
*   **증상**: 빌드 시작 시 경고 메시지 출력.
*   **해결**:
    ```bash
    npx expo-doctor
    ```
    위 명령어를 실행하여 제안하는 수정 사항을 반영. `pnpm-workspace.yaml`의 Catalog 버전이 Expo SDK 요구사항과 일치하는지 확인.

### 5.5 Metro Bundler 캐시 문제
*   **증상**: 코드 수정 사항이 반영되지 않거나 이상한 자바스크립트 에러 발생.
*   **해결**:
    ```bash
    npx expo start --clear
    ```
    `--clear` 플래그를 사용하여 번들러 캐시를 초기화.

---

## 6. 체크리스트 (Before Build)

빌드 명령어를 실행하기 전 다음을 확인하세요.

- [ ] `pnpm install`로 의존성이 최신 상태인가?
- [ ] `npx expo-doctor`를 통과했는가?
- [ ] 필요한 환경 변수가 `.env` (로컬) 또는 EAS Secrets (클라우드)에 있는가?
- [ ] `app.json`의 버전(`version`, `buildNumber`, `versionCode`)을 업데이트했는가?
