# 🚀 스토어 배포 준비 가이드 (Store Distribution Prep)

> **작성일**: 2025-12-07
> **목적**: MandaAct 모바일 앱의 App Store 및 Google Play Store 배포를 위한 사전 준비 사항 점검 및 가이드.

---

## 1. 📋 필수 계정 및 권한 점검

가장 먼저 스토어 개발자 계정이 활성화되어 있는지 확인해야 합니다.

- [ ] **Apple Developer Program** ($99/year)
  - 가입 및 결제 완료 여부 확인
  - [App Store Connect](https://appstoreconnect.apple.com/) 접속 가능 확인
  - **계약/세금/금융거래(Agreements, Tax, and Banking)** 정보 입력 완료 필수

- [ ] **Google Play Console** ($25 one-time)
  - 가입 및 결제 완료 여부 확인
  - [Play Console](https://play.google.com/console/) 접속 가능 확인
  - 본인 인증(Identity Verification) 완료 필수

---

## 2. ⚙️ 프로젝트 설정 점검 (Configuration)

### 2.1 앱 정보 (`app.json`)
현재 설정된 정보를 최종 확인합니다.

- **Bundle Identifier**: `com.mandaact.app` (iOS/Android 동일)
- **Version**: `1.0.0`
- **Display Name**: `MandaAct` (스토어에 표시될 이름)
- **Privacy Policy**: 앱 내 또는 웹사이트에 개인정보 처리방침 URL이 있어야 합니다. (심사 반려 사유 1순위)
  - *예: `https://mandaact.vercel.app/privacy` (웹 배포 필요)*

### 2.2 빌드 번호 관리
스토어에 업로드할 때마다 빌드 번호(Build Number/Version Code)가 증가해야 합니다.

- **iOS (`buildNumber`)**: 현재 `10` -> 배포 시 `11` 이상으로 증가 필요
- **Android (`versionCode`)**: 현재 `1` -> 배포 시 `2` 이상으로 증가 필요

*팁: `eas.json`에 `"autoIncrement": true` 설정이 되어 있어 EAS Build 시 자동으로 관리될 수 있습니다.*

---

## 3. 🔑 인증서 및 키 파일 준비

### 3.1 Google Play Service Account Key (Android 필수)
`eas.json` 설정에 따르면 `./google-services.json` 경로를 참조하고 있으나, 현재 해당 파일이 없습니다.

**조치 방법:**
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (또는 생성)
3. **IAM 및 관리자 > 서비스 계정** 이동
4. 서비스 계정 생성 (역할: 'Service Account User' 및 Play Console 권한 필요)
5. **키(Key)** 탭에서 '키 추가' > '새 키 만들기' > **JSON** 선택
6. 다운로드된 파일을 `apps/mobile/google-services.json`으로 저장 및 이름 변경
7. **주의**: 이 파일은 **절대로 Git에 커밋하면 안 됩니다.** (`.gitignore`에 추가)

### 3.2 Expo/EAS Secrets
보통 환경 변수는 EAS Secrets로 관리하는 것이 안전합니다. 현재 `eas.json`에 하드코딩 되어 있으나, 보안을 위해 다음 명령어로 업로드하는 것을 권장합니다.

```bash
# apps/mobile 경로에서 실행
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
# ... 기타 변수들
```

---

## 4. 📱 스토어 등록 정보 준비 (Metadata)

스토어 심사를 위해 다음 텍스트와 자산이 필요합니다. 미리 작성해두세요.

| 항목 | iOS (App Store) | Android (Play Store) |
|------|-----------------|----------------------|
| **앱 이름** | 30자 이내 | 30자 이내 |
| **부제(Subtitle)** | 30자 이내 | - |
| **간단한 설명** | - | 80자 이내 |
| **자세한 설명** | 4000자 이내 | 4000자 이내 |
| **키워드** | 100자 이내 (쉼표로 구분) | - |
| **지원 URL** | 웹사이트 주소 | 웹사이트 주소 |
| **마케팅 URL** | (선택) | (선택) |
| **개인정보 URL** | **필수** | **필수** |

---

## 5. 🚀 배포 실행 계획 (Action Plan)

### Step 1: 프로덕션 빌드 (Production Build)
실제 스토어 제출용 바이너리(`.ipa`, `.aab`)를 생성합니다.

```bash
cd apps/mobile
eas build --platform all --profile production
```
- 예상 소요 시간: 15~30분
- 완료 후 Expo Dashboard에서 빌드 파일 다운로드 가능

### Step 2: 스토어 제출 (Submit)
빌드된 파일을 스토어로 전송합니다.

```bash
eas submit --platform all
```
- **iOS**: App Store Connect의 TestFlight로 업로드됩니다.
- **Android**: Play Console의 내부 테스트(Internal Testing) 트랙으로 업로드됩니다. (Google Play Key 필요)

### Step 3: 내부 테스트 (TestFlight / Internal Testing)
- **iOS**: TestFlight 앱을 통해 개발팀 내부 테스트 진행
- **Android**: Play Store 내부 테스트 링크를 통해 다운로드 및 테스트

### Step 4: 심사 요청 (Review)
- 테스트가 완료되면 스토어 콘솔(Web)에서 '심사 제출(Submit for Review)' 버튼을 눌러 정식 심사를 요청합니다.

---

## 6. ✅ 당장 해야 할 일 (To-Do)

- [ ] **Google Play Service Account Key** 발급 및 `apps/mobile/google-services.json` 배치
- [ ] `.gitignore`에 `google-services.json` 추가 확인
- [ ] **Privacy Policy (개인정보 처리방침)** 웹 페이지 준비 (Notion 페이지 등으로 대체 가능)
- [ ] `app.json`의 버전 정보 확인 (`1.0.0`)
- [ ] (선택) `eas secret:push`로 환경 변수 보안 강화

준비가 되시면 **"빌드 시작해줘"** 라고 말씀해 주세요! 🚀
