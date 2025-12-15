# Subscription 구매 탭 무반응(샌드박스) 트러블슈팅

## 요약
- **현상**: 구독 플랜 리스트는 노출되지만, 플랜(월간/연간)을 탭해도 결제 시트가 뜨지 않거나 아무 반응이 없는 것처럼 보임.
- **영향**: 샌드박스/테스트플라이트에서 구매 테스트가 막혀 수익화 QA 진행 불가.
- **핵심 포인트**: 실제로는 RevenueCat 구매 호출이 **실패**하거나 **응답이 지연**되는데, 앱이 그 에러/상태를 UI에 보여주지 않아 “무반응”처럼 보일 수 있음.

## 1차 원인 후보(코드 관점)
### A) 구매/복원 실패를 삼켜서 UI가 조용함
- `useSubscription.purchase()` / `restore()`에서 예외가 발생해도 내부에서 `return false`로 끝나면,
  `SubscriptionScreen` 입장에서는 “성공만 토스트”라서 **실패 시 아무 피드백이 없음**.
- 샌드박스에서 발생 가능한 실패 예시:
  - App Store 로그인/샌드박스 계정 세션 문제
  - 결제 제한(Screen Time) / 결제 승인 흐름 중단
  - 네트워크/스토어 연결 문제
  - RevenueCat 설정/상품 상태 문제

### B) 구매 호출이 오래 걸려 버튼이 잠긴 채로 보임
- 구매 버튼은 `purchasingPackageId`로 UI를 잠그는 구조라,
  `Purchases.purchasePackage()`가 응답을 오래 잡고 있으면 **버튼이 계속 disabled** 상태로 남을 수 있음.

## 적용한 조치(2025-12-15)
### PR #37: 구매/복원 에러 가시화 + 탭 로그
- 변경 목적: “무반응”을 **실제 에러/상태로 전환**해서 원인을 좁힐 수 있게 함.
- 변경 내용:
  - `apps/mobile/src/hooks/useSubscription.ts`
    - `purchase()` / `restore()`에서 `userCancelled` 외 에러는 **throw** 하도록 변경
  - `apps/mobile/src/screens/SubscriptionScreen.tsx`
    - 패키지 탭 시 `console.log('[SubscriptionScreen] 🟣 Package pressed:', pkg.identifier)` 추가
    - `error` 배너 UI 추가(토스트 외에 화면에서도 확인 가능)

## 테스트 가이드(권장 순서)
1) TestFlight 최신 빌드 설치
2) `Subscription` 화면 진입 → 월간/연간 플랜 탭
3) 다음 중 어느 케이스인지 확인
   - 결제 시트가 뜸(정상)
   - 토스트/배너로 에러가 표시됨(원인 메시지/코드 확보)
   - 탭 로그(`Package pressed`)가 안 찍힘(Pressable 이벤트/overlay 문제)
   - 로딩만 지속(구매 호출 hang 가능성 → 타임아웃/재시도 UX 필요)

## 진행 로그
- 2025-12-15: “플랜 탭 무반응” 이슈 문서화 시작
- 2025-12-15: PR #37 머지(에러 가시화/탭 로그)
- 2025-12-15: TestFlight 빌드/제출 완료(build=601)

## TestFlight 빌드/제출 기록
- App Store Connect(TestFlight): https://appstoreconnect.apple.com/apps/6756198473/testflight/ios
- 빌드: `CFBundleVersion=601`
- 제출(Expo): https://expo.dev/accounts/hevi35/projects/mandaact/submissions/5187b3cb-6b89-472d-89e6-d4777127a114
- 처리: Apple processing 완료 후 TestFlight에서 확인
