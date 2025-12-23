# App Store IAP 플랜 미노출 문제 해결 가이드

**작성일**: 2025-12-23
**앱**: MandaAct (com.mandaact.app)
**문제 발생 빌드**: 110 (버전 1.0.2)
**상태**: 앱스토어 승인 완료, TestFlight 정상 작동

---

## 문제 개요

### 증상
- **TestFlight**: 빌드 110에서 구독 플랜이 정상적으로 노출됨
- **App Store**: 동일한 빌드 110에서 구독 플랜이 노출되지 않음
- **에러 메시지**: "Something went wrong. Please try again."
- **UI 상태**: "현재 이용 가능한 플랜이 없습니다" 메시지 표시

### 환경 차이
- TestFlight: Sandbox 환경 (테스트용 Apple ID 계정 사용)
- App Store: Production 환경 (실제 Apple ID 계정 사용)

---

## 원인 분석

### 1. 코드 레벨 분석

**파일**: `apps/mobile/src/hooks/useSubscription.ts`

구독 플랜 로드 흐름:
```typescript
loadPlansWithRetry() → Purchases.getOfferings() → fallback: Purchases.getProducts()
```

- 재시도 메커니즘: 0ms, 1200ms, 3000ms 간격으로 3회 시도
- Fallback 로직: Offerings 실패 시 직접 Product 조회
- 에러 처리: 플랜이 없으면 "noPlansAvailable" 메시지 표시

**제품 ID 확인**:
```typescript
PRODUCT_IDS = {
  MONTHLY: 'com.mandaact.sub.premium.monthly',
  YEARLY: 'com.mandaact.sub.premium.yearly',
}
```

### 2. 환경 차이 분석

TestFlight와 App Store의 동작 차이는 다음 요인들로 인해 발생할 수 있습니다:

| 요소 | TestFlight | App Store |
|------|-----------|-----------|
| 환경 | Sandbox (Production 계정 + Sandbox 결제) | Production |
| IAP 상품 | Sandbox 테스트 상품 사용 가능 | Production 승인 필요 |
| 활성화 시점 | 즉시 사용 가능 | 앱 출시 후 최대 48시간 소요 |
| RevenueCat | 자동 환경 감지 | Production 환경 사용 |

### 3. 웹 서치 결과 종합

유사 케이스 조사 결과, 다음과 같은 공통 원인들이 확인되었습니다:

#### 가장 흔한 원인 (우선순위 높음)

1. **IAP 상품 활성화 지연** ⏱️
   - 앱 승인 후 IAP 활성화까지 20분~48시간 소요
   - Apple의 서버 측 활성화 프로세스 필요

2. **Localization 누락** 🌐
   - Subscription Group의 Localization 정보 미입력
   - 이 경우 "Missing Metadata" 상태로 표시됨

3. **Paid Apps Agreement 미서명** 📝
   - App Store Connect → Agreements, Tax, and Banking
   - 계약 미체결 시 IAP 작동 불가

4. **Review Information 누락** 📸
   - 구독 상품에 스크린샷 미첨부
   - Review Notes 누락

5. **RevenueCat Offering 설정** 🔧
   - RevenueCat 대시보드에서 Offering 미설정
   - Entitlement 매핑 누락

---

## 해결 방안

### 우선순위 1: 즉시 확인 (5분 이내)

#### ✅ 1.1 Paid Apps Agreement 확인
1. [App Store Connect](https://appstoreconnect.apple.com) 접속
2. **Agreements, Tax, and Banking** 메뉴 이동
3. **Paid Applications** 계약 상태 확인
   - ❌ 서명 안됨: "Request" 또는 "Pending" 상태
   - ✅ 서명 완료: "Active" 상태
4. 미서명 시 즉시 서명 완료

**예상 효과**: 계약 미체결 시 이것만으로 문제 해결 가능

#### ✅ 1.2 앱 출시 시각 확인
1. App Store Connect → 앱 선택 → **Version History**
2. 빌드 110 (버전 1.0.2) 승인/출시 시각 확인
3. 현재 시각과 비교하여 경과 시간 계산

**판단 기준**:
- 출시 후 1시간 미만: 시스템 활성화 대기 (정상)
- 출시 후 1~24시간: 일반적인 활성화 지연 (흔함)
- 출시 후 24~48시간: 드물지만 가능
- 출시 후 48시간 초과: 다른 문제 의심

---

### 우선순위 2: App Store Connect IAP 설정 확인 (10분 이내)

#### ✅ 2.1 구독 상품 상태 확인
1. App Store Connect → **In-App Purchases** → **Subscriptions**
2. Subscription Group 선택
3. 각 상품(Monthly, Yearly) 상태 확인

**체크리스트**:
```
[ ] Monthly (com.mandaact.sub.premium.monthly) 상태: "Ready to Submit" 또는 "Approved"
[ ] Yearly (com.mandaact.sub.premium.yearly) 상태: "Ready to Submit" 또는 "Approved"
[ ] 두 상품 모두 "Cleared for Sale" 체크됨
```

#### ✅ 2.2 Localization 확인
각 구독 상품별로:

1. 상품 선택 → **Subscription Localization**
2. **한국어(ko)** 및 **영어(en)** Localization 존재 확인
3. 각 Localization에 다음 항목 입력 확인:
   ```
   [ ] Subscription Name (필수)
   [ ] Description (필수)
   ```

**Subscription Group Localization**:
1. Subscription Group 선택 → **Group Localizations**
2. 한국어 및 영어 Localization 존재 확인
3. **Subscription Group Name** 입력 확인

**⚠️ 중요**: Localization 누락 시 "Missing Metadata" 상태가 되며, Production에서 플랜이 노출되지 않습니다.

#### ✅ 2.3 Review Information 확인
각 구독 상품별로:

1. 상품 선택 → **App Store Information** 섹션
2. 다음 항목 확인:
   ```
   [ ] Screenshot (필수): 구독 기능을 보여주는 스크린샷 1장 이상
   [ ] Review Notes (선택): 리뷰어를 위한 테스트 계정 정보
   ```

**⚠️ 중요**: Screenshot가 없으면 승인되지 않거나 Production 활성화가 지연될 수 있습니다.

#### ✅ 2.4 앱 버전과 IAP 연결 확인
1. App Store Connect → 앱 선택 → 버전 1.0.2 선택
2. **In-App Purchases** 섹션 확인
3. Monthly 및 Yearly 구독이 포함되어 있는지 확인

**문제 발생 시 조치**:
- IAP가 포함되지 않은 경우: 새 버전 제출 시 IAP 포함 필요
- 이미 출시된 버전에 IAP를 소급 추가할 수 없음

---

### 우선순위 3: RevenueCat 설정 확인 (10분 이내)

#### ✅ 3.1 RevenueCat 프로젝트 설정
1. [RevenueCat Dashboard](https://app.revenuecat.com) 접속
2. MandaAct 프로젝트 선택
3. **App Settings** → **Apple App Store** 확인
   ```
   [ ] Bundle ID: com.mandaact.app
   [ ] Shared Secret 설정됨
   [ ] App Store Connect API Key 연결됨 (선택사항)
   ```

#### ✅ 3.2 Products 설정 확인
1. **Products** 메뉴 이동
2. 다음 제품 ID 존재 확인:
   ```
   [ ] com.mandaact.sub.premium.monthly
   [ ] com.mandaact.sub.premium.yearly
   ```
3. 각 제품의 **Status** 확인:
   - ✅ "Active" 또는 "Synced"
   - ❌ "Not Found" 또는 "Error"

**문제 발생 시 조치**:
- "Not Found" 상태: App Store Connect와 동기화 필요
- RevenueCat에서 **Sync** 버튼 클릭

#### ✅ 3.3 Entitlements 설정 확인
1. **Entitlements** 메뉴 이동
2. `premium` Entitlement 존재 확인
3. Entitlement 선택 → **Products** 탭
4. 다음 제품이 연결되어 있는지 확인:
   ```
   [ ] com.mandaact.sub.premium.monthly → premium
   [ ] com.mandaact.sub.premium.yearly → premium
   ```

**⚠️ 중요**: Entitlement 매핑이 없으면 구매 후 Premium 상태가 활성화되지 않습니다.

#### ✅ 3.4 Offerings 설정 확인
1. **Offerings** 메뉴 이동
2. **Current Offering** 설정 확인
3. Current Offering 선택 → **Packages** 탭
4. Monthly 및 Yearly 패키지 존재 확인

**⚠️ 중요**: Offering이 없으면 `Purchases.getOfferings()`가 빈 결과를 반환합니다.

**Offering 설정 예시**:
```
Offering: default
  ├─ Package: monthly (com.mandaact.sub.premium.monthly)
  └─ Package: yearly (com.mandaact.sub.premium.yearly)
```

---

### 우선순위 4: 추가 진단 및 디버깅 (30분 이내)

#### ✅ 4.1 RevenueCat API Tester 사용
1. RevenueCat Dashboard → **API Tester**
2. **Customer Info** 탭에서 테스트
3. Production 환경에서 제품 목록 조회 가능 여부 확인

#### ✅ 4.2 앱 로그 수집
Production 앱에서 로그를 수집하여 정확한 에러 확인:

1. 앱 삭제 후 App Store에서 재설치
2. 앱 실행 → Settings → Premium 화면 진입
3. Xcode → **Devices and Simulators** → 디바이스 선택 → **Console** 탭
4. 다음 키워드로 필터링:
   ```
   [RevenueCat]
   [useSubscription]
   SKProductsRequest
   ```

**확인 사항**:
- `getOfferings()` 결과: 비어있는지 확인
- `getProducts()` 결과: invalidProductIdentifiers 확인
- 에러 메시지: PURCHASES_ERROR_CODE 확인

#### ✅ 4.3 실제 사용자 테스트
1. TestFlight가 아닌 **App Store에서 직접 다운로드**받은 앱 사용
2. 실제 Apple ID 계정으로 로그인 (Sandbox 계정 아님)
3. Premium 화면에서 플랜 노출 여부 확인
4. 플랜이 보이지 않으면 "다시 시도" 버튼 클릭 (30초 대기)

---

### 우선순위 5: Apple 지원 요청 (1일 이상)

위 모든 단계를 완료했음에도 문제가 해결되지 않는 경우:

#### ✅ 5.1 Feedback Assistant 티켓 제출
1. [Feedback Assistant](https://feedbackassistant.apple.com) 접속
2. **New Feedback** 생성
3. 카테고리: **App Store → In-App Purchase**
4. 다음 정보 포함:
   ```
   - App Name: MandaAct
   - Bundle ID: com.mandaact.app
   - Version: 1.0.2 (110)
   - Product IDs:
     - com.mandaact.sub.premium.monthly
     - com.mandaact.sub.premium.yearly
   - Issue: Products work in TestFlight but not in App Store Production
   - Screenshots: 스크린샷 첨부
   - Logs: Xcode Console 로그 첨부
   ```

#### ✅ 5.2 App Store Connect 지원팀 문의
1. App Store Connect → **Contact Us**
2. **In-App Purchases** 카테고리 선택
3. 문제 상세 설명 및 스크린샷 첨부

**예상 응답 시간**: 1~3 영업일

---

## 즉시 실행 체크리스트

### 🔥 긴급 확인 (5분)
```
[ ] 1. App Store Connect → Agreements 확인 (Paid Apps Agreement 서명 여부)
[ ] 2. 앱 출시 시각 확인 (승인 후 경과 시간)
[ ] 3. IAP 상품 "Cleared for Sale" 상태 확인
```

### 📋 필수 확인 (10분)
```
[ ] 4. 각 구독 상품 Localization 존재 여부 (한국어, 영어)
[ ] 5. Subscription Group Localization 존재 여부
[ ] 6. 각 구독 상품 Screenshot 첨부 여부
[ ] 7. RevenueCat Offerings 설정 확인
[ ] 8. RevenueCat Entitlements 매핑 확인
```

### 🔍 심화 진단 (30분)
```
[ ] 9. RevenueCat API Tester로 Production 제품 조회 테스트
[ ] 10. App Store 앱에서 로그 수집 및 분석
[ ] 11. 실제 사용자 환경에서 재현 테스ト
```

### 📞 지원 요청 (필요시)
```
[ ] 12. Feedback Assistant 티켓 제출
[ ] 13. App Store Connect 지원팀 문의
```

---

## 예상 해결 시나리오

### 시나리오 1: 활성화 지연 (가장 가능성 높음)
**증상**: 모든 설정이 정상이지만 플랜이 노출되지 않음
**원인**: 앱 승인 후 IAP 활성화 지연 (최대 48시간)
**조치**: 24~48시간 대기 후 자동 해결
**확률**: 60%

### 시나리오 2: Localization 누락
**증상**: App Store Connect에서 "Missing Metadata" 상태
**원인**: Subscription Group 또는 개별 상품의 Localization 미입력
**조치**: Localization 추가 후 저장 (즉시 반영)
**확률**: 20%

### 시나리오 3: Paid Apps Agreement 미서명
**증상**: 계약 상태가 "Pending" 또는 "Request"
**원인**: 계약 미체결
**조치**: 즉시 서명 완료 (1시간 내 반영)
**확률**: 10%

### 시나리오 4: RevenueCat Offering 미설정
**증상**: RevenueCat Dashboard에서 Offering 없음
**원인**: Current Offering 미설정 또는 Package 미추가
**조치**: Offering 생성 및 Package 추가 (즉시 반영)
**확률**: 5%

### 시나리오 5: Apple 시스템 문제
**증상**: 모든 설정 정상이지만 48시간 후에도 미해결
**원인**: Apple 서버 측 문제
**조치**: Feedback Assistant 티켓 제출
**확률**: 5%

---

## 참고 자료

### 웹 서치 결과
- [Testing subscriptions in TestFlight - Apple Developer](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/)
- [RevenueCat Community: Subscription works in testflight, not production](https://community.revenuecat.com/sdks-51/subscription-works-in-testflight-not-production-iap-approved-for-over-48-hours-377)
- [RevenueCat Community: New approved IAP not available in production](https://community.revenuecat.com/tips-discussion-56/new-approved-iap-is-not-available-in-production-app-immediately-1135)
- [Apple Developer Forums: SKProductsRequest returns empty products](https://developer.apple.com/forums/thread/713556)
- [Medium: Apple IAP Subscriptions Error - Products Not Found, Missing Metadata](https://medium.com/@michaelsimon.business/solution-apple-iap-subscriptions-expo-error-products-not-found-missing-metadata-a6f776b81557)

### 코드 파일 위치
- IAP 로직: `apps/mobile/src/hooks/useSubscription.ts`
- 구독 화면: `apps/mobile/src/screens/SubscriptionScreen.tsx`
- 제품 ID: `apps/mobile/src/hooks/useSubscription.ts:43-46`
- RevenueCat API Key: `apps/mobile/app.json:153`

---

## 진행 상황 기록

### 2025-12-23
- ✅ 문제 확인: App Store에서 플랜 미노출
- ✅ TestFlight 정상 작동 확인
- ✅ 웹 서치 완료 (유사 케이스 조사)
- ✅ 코드 분석 완료
- ✅ 해결 가이드 작성 완료
- ⏳ **다음 단계**: 위 체크리스트 순서대로 확인 시작

### 해결 후 업데이트 예정
```
[ ] 해결 방법:
[ ] 원인:
[ ] 소요 시간:
[ ] 추가 조치사항:
```

---

## 연락처
- **지원 이메일**: support@unwrittenbd.com
- **Apple Developer Support**: https://developer.apple.com/contact/
- **RevenueCat Support**: https://www.revenuecat.com/support

---

**마지막 업데이트**: 2025-12-23
**작성자**: Claude Code
