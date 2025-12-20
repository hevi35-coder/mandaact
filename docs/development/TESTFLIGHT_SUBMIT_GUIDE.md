# TestFlight 제출 (EAS Submit) 가이드

## 기본 원칙: 로컬 빌드 우선(Local-first)
이 프로젝트는 기본적으로 **로컬 EAS 빌드 → 즉시 제출** 흐름을 우선합니다.

**사유**
- **EAS 클라우드 iOS 빌드 한도/대기열**: Free 플랜 월간 한도에 걸리거나(또는 대기 시간이 길어) 빌드 시작 자체가 실패하는 경우가 자주 발생함.
- **중복 `buildNumber`로 제출 실패 방지**: Apple은 동일한 `CFBundleVersion` 재업로드를 거부함. 로컬 빌드에서 `autoIncrement`로 buildNumber가 확실히 증가하도록 운영하면 재시도 비용이 줄어듦.
- **작업 흐름 단순화**: “클라우드 시도 → 실패 확인 → 로컬로 전환” 루프를 없애기 위함.

단, **클라우드 빌드가 필요한 경우(예: CI, 로컬 Xcode 환경 부재, 팀 공유 빌드, 장시간 빌드/캐시 활용)** 에만 별도로 사용합니다.

## 제출 전 필수: 릴리즈 블로커 회귀 테스트
TestFlight 제출 전에 아래 체크리스트를 1회 수행합니다(릴리즈마다 반복).

- `docs/mobile/RELEASE_BLOCKER_CHECKLIST.md`

## 결론
Codex/CLI에서 **Apple ID 2FA(문자/Authenticator) 인증을 대신 처리**하는 건 불가능합니다.  
대신 **비대화형 제출(non-interactive)** 이 가능한 2가지 방식이 있습니다:

1) **App Store Connect API Key (권장)**  
2) **Apple App-Specific Password**

둘 중 하나를 설정하면 `eas submit --non-interactive`로 TestFlight 제출이 가능합니다.

---

## 1) App Store Connect API Key (권장)

### 준비물
- App Store Connect `Issuer ID`
- App Store Connect `Key ID`
- `.p8` private key 파일

### App Store Connect에서 키 생성
- App Store Connect → **Users and Access** → **Keys** → **App Store Connect API**
- 새 Key 생성 후 `Issuer ID`, `Key ID` 확인
- `.p8` 다운로드 (한 번만 다운로드 가능)

### 로컬 파일 배치
- `.p8` 파일을 예: `apps/mobile/credentials/AuthKey_<KEY_ID>.p8`에 저장
- `apps/mobile/.gitignore`에 `*.p8`가 포함되어 있어 커밋되지 않습니다.

### `apps/mobile/eas.json`에 설정 추가
`submit.production.ios`에 아래 3개 필드를 추가합니다:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6756198473",
        "ascApiKeyPath": "./credentials/AuthKey_<KEY_ID>.p8",
        "ascApiKeyIssuerId": "<ISSUER_ID>",
        "ascApiKeyId": "<KEY_ID>"
      }
    }
  }
}
```

### 제출
> 주의: `pnpm --filter @mandaact/mobile eas ...` 형태는 동작하지 않습니다(패키지 스크립트에 `eas`가 없음).  
> 아래 커맨드는 `apps/mobile` 디렉터리에서 실행합니다.

#### A) 로컬 빌드 후 자동 제출(권장, Local-first)
로컬에서 빌드가 끝나면 **별도 명령 기다리지 않고** 바로 제출까지 이어서 실행합니다.

```sh
cd apps/mobile
eas build -p ios --profile production --local --non-interactive
IPA_PATH="$(ls -t build-*.ipa | head -n 1)"
eas submit -p ios --profile production --path "$IPA_PATH" --non-interactive --wait
```

#### B) 클라우드 빌드가 필요한 경우(선택)
클라우드 빌드만 필요하면 아래처럼 실행합니다.  
**제출까지 자동으로 이어지게 하려면 `--auto-submit`(또는 `--auto-submit-with-profile`)을 사용**하세요.

```sh
cd apps/mobile
eas build -p ios --profile production --auto-submit-with-profile production --non-interactive
```

이 방식은 빌드가 끝났을 때 EAS가 **자동으로 제출까지 수행**하므로,
“제출 명령을 따로 기다리다 멈추는” 문제를 줄일 수 있습니다.

#### C) (참고) 이미 존재하는 `.ipa`만 제출
```sh
cd apps/mobile
eas submit -p ios --profile production --path build-*.ipa --non-interactive --wait
```

---

## 2) Apple App-Specific Password (대안)

### 준비물
- Apple ID 이메일
- App-Specific Password

### 설정
- `apps/mobile/eas.json`의 `submit.production.ios`에 `appleId` 추가
- 환경변수 `EXPO_APPLE_APP_SPECIFIC_PASSWORD` 설정

예시:
```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6756198473",
        "appleId": "you@example.com"
      }
    }
  }
}
```

```sh
export EXPO_APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
cd apps/mobile
eas submit -p ios --profile production --latest --non-interactive
```

---

## 빌드 진행상황 확인(클라우드 빌드)
클라우드 빌드를 사용할 때는 아래로 상태를 주기적으로 확인합니다.

```sh
cd apps/mobile
eas build:list -p ios --limit 5
```

특정 빌드 ID가 있으면:
```sh
cd apps/mobile
eas build:view <BUILD_ID>
```

`--auto-submit-with-profile production`로 시작했다면, 빌드가 `finished`가 되는 시점에 **제출도 자동으로 이어집니다**.

## 참고
- `eas submit` 도움말: `eas submit --help`
- `eas build` 도움말: `eas build --help` (중요: `--auto-submit-with-profile`, `--wait`, `--local`)

## 이번 제출 메모 (MandaAct)
- ASC Issuer ID: `fe7aa5b1-e067-49a6-9fcc-bc311a179460`
- ASC Key ID: `5N4R3PDKK6` (`apps/mobile/credentials/appstoreconnect/AuthKey_5N4R3PDKK6.p8`)
- 제출된 ipa: `apps/mobile/build-1765589637059.ipa`
- EAS submission: `https://expo.dev/accounts/hevi35/projects/mandaact/submissions/357f31a0-ec53-4819-ac0a-97bb20101eb0`
