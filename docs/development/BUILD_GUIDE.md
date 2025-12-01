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

## 3. 개발 빌드 실행 가이드 (Development Build Workflow)

이 프로젝트는 **Expo Development Build**를 사용합니다. Expo Go가 아닌 네이티브 모듈이 포함된 커스텀 개발 빌드입니다.

### 3.1 핵심 개념: `expo start` vs `expo run:ios`

| 명령어 | 용도 | 전제 조건 | 빌드 시간 |
|--------|------|-----------|-----------|
| `expo start` | Metro 번들러만 실행 (JS 코드 제공) | **개발 빌드가 이미 설치되어 있어야 함** | 즉시 (~5초) |
| `expo run:ios` | 네이티브 빌드 + 설치 + Metro 실행 | Xcode 설치 필요 | 느림 (첫 빌드 3~5분) |

**중요**: `expo start --ios`는 이미 설치된 앱을 실행하려고 시도하므로, **처음 실행 시에는 반드시 `expo run:ios`를 먼저 실행**해야 합니다.

---

### 3.2 처음 실행 시 (First Time Setup)

시뮬레이터/디바이스에 개발 빌드가 없는 경우, 다음 순서로 진행합니다.

#### **방법 1: 로컬 빌드 (추천 - 가장 빠름)**

```bash
# 1. 시뮬레이터 부팅 (선택 사항)
open -a Simulator

# 2. 개발 빌드 생성 및 설치
pnpm --filter @mandaact/mobile ios

# 또는
cd apps/mobile
npm run ios
```

**소요 시간**: 첫 빌드 3~5분, 이후 증분 빌드 30초~1분

**장점**:
- 가장 빠른 개발 사이클
- 네이티브 코드 디버깅 가능
- 오프라인 작업 가능

**단점**:
- Xcode 설치 필요 (Mac만 가능)
- 디스크 공간 사용 (ios/ 폴더 생성)

#### **방법 2: EAS 클라우드 빌드**

로컬 환경 설정 없이 빌드하고 싶은 경우:

```bash
cd apps/mobile

# iOS 개발 빌드 (시뮬레이터용)
eas build --profile development --platform ios

# 빌드 완료 후 다운로드하여 시뮬레이터에 설치
# (EAS가 제공하는 URL에서 .tar.gz 다운로드)
```

**소요 시간**: 10~20분 (빌드 큐 대기 시간 포함)

**장점**:
- Xcode 불필요
- 클라우드에서 빌드

**단점**:
- 느림
- 인터넷 필요
- Free tier는 빌드 큐 대기 시간 김

---

### 3.3 일상적인 개발 워크플로우 (Daily Development)

개발 빌드가 **이미 설치된 이후**에는 다음과 같이 빠르게 작업할 수 있습니다.

#### **Step 1: Metro 번들러 실행**

```bash
# 루트에서
pnpm --filter @mandaact/mobile start

# 또는 apps/mobile에서
npm start
```

#### **Step 2: 앱 실행**

**자동 실행 (추천)**:
```bash
# Metro가 실행된 상태에서 터미널에서 'i' 입력
# → iOS 시뮬레이터가 자동으로 열리고 앱 실행
```

**수동 실행**:
- 시뮬레이터에서 "MandaAct" 앱 아이콘 클릭
- 또는 시뮬레이터에서 `Cmd + Shift + H` (홈) → 앱 선택

#### **Step 3: 개발 중 새로고침**

코드 수정 후:
- **자동 새로고침**: Fast Refresh가 자동으로 적용됨 (대부분의 경우)
- **수동 새로고침**: 
  - 시뮬레이터에서 `Cmd + R`
  - 또는 Metro 터미널에서 `r` 입력

---

### 3.4 네이티브 코드 변경 시 (Native Code Changes)

다음과 같은 경우 **재빌드 필요**:
- 새로운 네이티브 모듈 설치 (예: `expo install expo-camera`)
- `app.json` / `app.config.js` 수정
- iOS/Android 네이티브 코드 직접 수정

**재빌드 방법**:
```bash
# 빠른 재빌드 (증분 빌드)
pnpm --filter @mandaact/mobile ios

# 완전 클린 빌드 (문제 발생 시)
cd apps/mobile
rm -rf ios android
npx expo prebuild --clean
npm run ios
```

---

### 3.5 빠른 참조 (Quick Reference)

| 상황 | 명령어 |
|------|--------|
| **처음 실행** | `pnpm --filter @mandaact/mobile ios` |
| **일상 개발** | `pnpm --filter @mandaact/mobile start` → `i` |
| **앱 새로고침** | Metro에서 `r` 또는 시뮬레이터에서 `Cmd + R` |
| **캐시 문제** | `pnpm --filter @mandaact/mobile start --clear` |
| **네이티브 변경** | `pnpm --filter @mandaact/mobile ios` (재빌드) |
| **완전 클린** | `rm -rf ios android && npx expo prebuild --clean` |

---

### 3.6 트러블슈팅: "Could not connect to the server"

**증상**: 시뮬레이터에서 "Error loading app: Could not connect to the server" 에러

**원인**: Metro 번들러가 실행되지 않았거나, 앱이 잘못된 서버 주소를 참조

**해결 방법**:

1. **Metro 번들러 실행 확인**:
   ```bash
   # 새 터미널에서
   pnpm --filter @mandaact/mobile start
   ```

2. **앱 새로고침**:
   - Metro 터미널에서 `r` 입력
   - 또는 시뮬레이터에서 `Cmd + R`

3. **앱 재설치** (위 방법이 안 되면):
   ```bash
   pnpm --filter @mandaact/mobile ios
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
