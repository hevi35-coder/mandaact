# AdMob App Verification (app-ads.txt / Developer Website)

AdMob에서 앱을 “Verify app” 단계로 두고 광고가 서빙되지 않거나, 아래와 같은 메시지가 보일 때의 대응 가이드입니다.

- `We couldn't verify ...`
- `We didn't find a developer website in your app listing on App Store.`

## TL;DR (가장 흔한 원인)

AdMob은 **App Store listing의 “Developer Website”**(= App Store Connect의 `Marketing URL`)를 기준으로 `https://<domain>/app-ads.txt`를 찾아 검증합니다.  
즉, `app-ads.txt`가 배포되어 있어도 **App Store Connect에 Marketing URL이 비어 있으면** 검증이 실패할 수 있습니다.

## 현상

- 출시/업데이트 후 24시간 이상 지났는데 광고가 거의/전혀 안 뜸
- AdMob 콘솔에서 앱 검증 실패
- `app-ads.txt`는 직접 열면 정상(200)인데도 검증이 계속 실패

## 체크리스트 (우선순위 순)

### 1) `app-ads.txt` 배포 확인

브라우저 또는 아래 커맨드로 확인:

```bash
curl -i https://mandaact.vercel.app/app-ads.txt
```

기대:
- `HTTP/2 200`
- 파일 내용에 `google.com, pub-...` 라인이 존재

### 2) App Store Connect “Marketing URL” 설정 확인 (가장 중요)

App Store Connect에서 아래 값을 채워야 합니다.

- App Store Connect → **App Information** → **Marketing URL**
  - 권장: `https://mandaact.vercel.app` (끝에 `/`는 있어도 무방, 경로는 넣지 않는 것을 권장)
  - 주의: `https://www.mandaact.vercel.app` 처럼 **인증서/도메인 불일치**가 있으면 검증에 실패할 수 있음

AdMob 메시지의 “Developer Website”는 보통 이 `Marketing URL`이 스토어 페이지에 노출되는 항목을 의미합니다.

### 3) App Store listing 반영 확인 (전파 지연 있음)

Apple iTunes Lookup API로 `sellerUrl`이 채워졌는지 확인:

```bash
curl -s "https://itunes.apple.com/lookup?id=6756198473" | jq -r '.results[0].sellerUrl'
```

기대:
- `null`이 아닌 URL(예: `https://mandaact.vercel.app`)이 출력

주의:
- App Store Connect에 저장 후 **반영까지 수 시간~1-2일** 정도 지연될 수 있습니다.

### 4) AdMob 재검증 트리거

AdMob 콘솔에서 앱 상세 → Verify app 화면에서:
- **Check for updates** 클릭

## “광고가 안 뜬다”가 반드시 AdMob 문제는 아닐 수 있음 (앱 내부 정책 체크)

앱은 UX 보호를 위해 신규 사용자에게 광고를 제한합니다.

- 가입 후 **3일간 광고 없음**
- 가입 후 **7일간 배너만**
- Premium/Ad-free 상태에서는 배너가 숨겨질 수 있음
- Today 화면은 “Clean Zone” 정책으로 배너가 제거되어 있을 수 있음

따라서 “광고 검증 완료” 이후에도 아래 상황이면 화면에서 광고가 안 보일 수 있습니다.
- 테스트 계정이 가입 후 7일 미만
- Ad-free 시간이 활성화
- 배너를 원래 표시하지 않는 화면에서 테스트

## 권장 운영 메모

- App Store Connect에 URL 수정 후에는:
  - `sellerUrl` 반영 확인 → AdMob의 “Check for updates” → 24~48h 관찰 순서로 진행
- 운영 도메인은 **`www` 없이 단일 도메인으로 통일**(스토어/웹/app-ads.txt 모두 동일)

