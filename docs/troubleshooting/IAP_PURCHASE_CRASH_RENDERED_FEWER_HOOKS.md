# IAP 구매 후 크래시: `Rendered fewer hooks than expected`

## 요약
- **현상**: 유료 상품 구매(또는 복원) 직후 앱이 에러 화면으로 전환되며 `Rendered fewer hooks than expected`가 발생.
- **영향**: Premium 전환 직후 화면 렌더링이 깨지고 앱 사용이 불가(크래시/에러 바운더리 진입).
- **원인(유력)**: Premium 상태 변화로 인해 광고 컴포넌트가 조기 `return`을 타면서, 그 아래에 선언된 훅(`useCallback` 등)이 스킵되어 렌더 간 훅 호출 개수가 달라짐.

## 증상
- 구매 성공 모달 이후, “문제가 발생했습니다” 화면으로 전환.
- 에러 메시지: `Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`

## 재현 시나리오(추정)
1. 무료 상태에서 배너 광고가 표시되는 화면 진입 (Home/List/Reports 등)
2. `SubscriptionScreen`에서 구매 진행 → 성공 처리
3. `isPremium`이 `false → true`로 변경되며, 광고/보상 UI 토글이 즉시 발생
4. 특정 컴포넌트에서 훅 호출 순서/개수가 바뀌면서 런타임 에러

## 조사 포인트
### 1) 훅 규칙 위반 가능성
다음 패턴이 있으면 런타임에서 동일 에러가 발생할 수 있음:
- 조건부 훅 호출: `if (cond) useX()`
- 훅 호출 전 조기 `return`: `if (cond) return ...` 이후에 훅이 존재
- 루프 내 훅 호출: `map/for` 내부에서 `useX()`

### 2) Premium 즉시 UI 반영(요구사항)과의 관계
Premium 전환 시 다음 UI가 즉시 바뀌도록 작업 중이었고, 이 변화가 렌더 분기/조기 return을 유발할 수 있음:
- 배너/전면/보상형 광고 숨김
- 리포트 생성 버튼 노출/제한 해제
- 만다라트 생성 제한 팝업 미노출

## 1차 원인 후보 및 결론
### 후보 A (유력): `BannerAd` 내부 조기 return 아래에 훅 존재
- Premium 전환 시 `BannerAd`가 `return null`을 먼저 수행
- 그 아래에 `useCallback` 훅이 존재하면, 이전 렌더(무료) 대비 “훅 개수 감소”가 발생

## 적용한 수정(1차)
### Fix 1: `BannerAd`에서 모든 훅을 조기 return 이전으로 이동
- 파일: `apps/mobile/src/components/ads/BannerAd.tsx`
- 변경 내용:
  - `useCallback`로 선언된 핸들러들을 “광고 숨김 조건(return null)”보다 위로 이동
  - iOS 포그라운드 복귀 시 `ref.load()` 호출을 제거하고, `key`를 변경해 배너를 강제 remount 하도록 변경 (타입 `any` 제거 목적)
  - 결과적으로 Premium 전환 여부와 관계 없이 훅 호출 순서/개수가 고정됨

## 검증 체크리스트
- [ ] 구매 직후(무료 → Premium) 크래시가 재현되지 않는지 확인
- [ ] Premium 전환 직후 배너 광고가 즉시 숨김 처리되는지 확인
- [ ] (무료 사용자) 배너 광고 로딩/에러 처리/포그라운드 리로드 동작 확인

## 후속 플랜 (재발 방지)
1. **유사 패턴 탐지**: 광고/구독 관련 컴포넌트에서 “조기 return 아래 훅” 패턴 전수 점검
2. **규칙화**: `return null`은 “모든 훅 선언 이후”에만 두거나, 조건 분기는 컴포넌트 분리로 처리
3. **구매 직후 UX**: Premium 전환 직후 UI 토글을 “안전한 경계(Provider state update)”에서 일괄 반영

## 진행 로그
- 2025-12-13: 이슈 문서화 시작, `BannerAd` 훅 순서 문제(조기 return 아래 `useCallback`)를 1차 원인으로 특정하고 Fix 1 적용
