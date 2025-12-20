# Screenshot Capture Guide (iPhone/iPad)

목표: “세련됨 + 가독성”을 동시에 만족하려면 **원본(raw) 스크린샷 해상도**가 충분해야 합니다.  
현재 `docs/marketing/assets/raw/**` 중 일부는 저해상도여서(확대 시 글자 깨짐) 개선의 상한선이 낮습니다.

이 문서는 App Store용 스크린샷을 **공식 해상도(Apple 기준)** 로 캡처하고, 리포지토리 구조에 맞게 저장하는 절차를 정의합니다.

## 1) 권장 캡처 해상도(Apple)

- iPhone (6.9" Display) Portrait: **1320 × 2868**
- iPad (13" / 최신 iPad Air/Pro 계열) Portrait: **2064 × 2752**

참고: Apple App Store Connect Screenshot specifications  
https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/

## 2) 캡처 전 준비(중요)

- **광고 제거**: 설정에서 Ad-Free(또는 테스트 빌드)로 광고가 보이지 않게.
- **데이터 정리**: 리스트가 너무 길면 오히려 글자가 작아 보임 → 핵심 요소만 보이도록 데이터/상태를 단순화.
- **언어**: `en` / `ko` 각각 캡처(가능하면 iOS 시스템 언어/앱 언어 모두 일치).
- **시간/배터리**: 상태바가 지저분하면 시선이 분산됨 → 가능하면 깔끔한 상태로 캡처.

## 3) iOS Simulator로 캡처(추천)

### iPhone 6.9" (예: iPhone 16 Pro Max)

1. Simulator에서 기기를 **iPhone 16 Pro Max(또는 6.9")** 로 선택
2. 앱 실행 후 원하는 화면으로 이동
3. 메뉴 `File → Save Screen Shot` (또는 `⌘S`)
4. 저장된 PNG를 아래 경로로 이동

### iPad 13" (예: iPad Air/Pro 최신)

1. Simulator에서 기기를 **iPad 13"** 로 선택
2. 앱 실행 후 원하는 화면으로 이동
3. 동일하게 스크린샷 저장

## 4) 파일 배치 규칙(리포 구조)

### Raw (입력)

- iPhone:
  - `docs/marketing/assets/raw/en/screen_1_vision.png`
  - `docs/marketing/assets/raw/en/screen_2_action.png`
  - …
  - `docs/marketing/assets/raw/ko/screen_1_vision.png`
  - …
- iPad:
  - `docs/marketing/assets/raw/ipad_en/screen_1_vision.png`
  - …
  - `docs/marketing/assets/raw/ipad_ko/screen_1_vision.png`
  - …

### Final (출력)

Generator가 자동 생성:
- `docs/marketing/assets/final/en/01_vision.png` …
- `docs/marketing/assets/final/ko/01_vision.png` …
- `docs/marketing/assets/final/ipad_en/01_vision.png` …
- `docs/marketing/assets/final/ipad_ko/01_vision.png` …

## 5) 생성(Generator 실행)

전체 생성:
- `python3 docs/marketing/generate_screenshots.py`

빠른 프리뷰(한 장만):
- `python3 docs/marketing/generate_screenshots.py --lang ko --device iphone --id 2_action`
- (신규 규격 프리뷰) `python3 docs/marketing/generate_screenshots.py --lang en --device iphone_6_9 --id 1_vision`
- (신규 규격 프리뷰) `python3 docs/marketing/generate_screenshots.py --lang ko --device ipad_13 --id 1_vision`

## 6) 체크리스트(가독성)

- [ ] 첫 1~3장만 봐도 앱의 가치가 이해되는가?
- [ ] 스크린샷 내부의 핵심 텍스트가 “한눈에” 읽히는가?
- [ ] 화면이 너무 복잡하지 않은가(아이템 수/정보 밀도)?
- [ ] 광고/불필요한 상태바 정보가 없는가?

