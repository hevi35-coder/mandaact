# Retention Analytics (PostHog)

목표: “온보딩 → 첫 성공 경험 → 재방문 → 유료 전환”의 이탈 구간을 **계측 기반**으로 파악하고, 실험/개선을 반복한다.

> 이 문서는 “대시보드/퍼널을 만들기 위한 기준 이벤트”를 정의한다.  
> 수익/구독의 권위는 RevenueCat, 행동 퍼널은 PostHog를 기준으로 본다.

## 1) 핵심 질문(운영 관점)

- 유저가 어디에서 가장 많이 이탈하는가? (튜토리얼/첫 만다라트/첫 체크/리포트/재방문)
- “첫 성공 경험”에 도달하는 데 평균 몇 분/몇 세션이 걸리는가?
- 유료 전환은 어떤 트리거(리포트/광고 제거/기타)에서 발생하는가?
- 결제 실패/복원 실패는 어떤 원인(네트워크/스토어/상품/계정/제한)에서 집중되는가?

## 2) 리텐션 루프 이벤트(표준)

아래 이벤트는 `packages/shared/src/lib/analyticsEvents.ts`를 기준으로 Mobile/Web 공통으로 사용한다.

### 2.1 온보딩/행동 퍼널

- `app_opened`
- `user_signed_up` / `user_logged_in`
- `tutorial_completed`
- `mandalart_created`
  - `input_method`, `sub_goals_count`, `actions_count`
  - `is_first` (optional): 계정 기준 “첫 만다라트 생성”인 경우 `true`
- `action_checked`
  - `action_type`, `hour`, `day_of_week`
  - `is_first` (optional): 계정 기준 “첫 체크”인 경우 `true`
- `weekly_report_generated`
  - `generated`, `completion_rate`, `total_checks`
  - `is_first` (optional): 계정 기준 “첫 리포트 생성”인 경우 `true`

### 2.2 전환/구독 퍼널(참고)

구독 이벤트 정의/속성은 `docs/features/MONETIZATION_ANALYTICS_TAXONOMY.md`를 우선 참조한다.

- `paywall_viewed` → `purchase_started` → `purchase_success`
- `purchase_failed`, `purchase_restore_failed`는 `error_category`, `error_stage`, `purchases_error_code` 기반으로 원인 분류 가능

## 3) `is_first` 정의/주의사항

- 목적: “첫 성공 경험” 도달률/소요시간을 빠르게 보기 위함.
- Mobile 구현은 `AsyncStorage`에 “유저별 1회” 플래그를 저장한다.
  - 로그아웃/앱 재설치/기기 변경 시 `is_first`가 재발생할 수 있다(운영 지표 해석 시 주의).
  - PostHog에서 사용자 식별(`identify`)이 되어야 계정 단위로 의미가 커진다.

## 4) 추천 PostHog 대시보드/퍼널(초안)

- **Onboarding Funnel**
  - `user_signed_up` → `tutorial_completed` → `mandalart_created`(is_first=true) → `action_checked`(is_first=true)
- **First Success Time**
  - `user_signed_up` → `action_checked`(is_first=true) 전환까지 시간 분포
- **Report Adoption**
  - `action_checked` → `weekly_report_generated`(is_first=true) 전환율
- **Paywall Conversion**
  - `paywall_viewed` → `purchase_started` → `purchase_success`
- **Payment Reliability**
  - `purchase_failed` / `purchase_restore_failed`를 `error_category`, `error_stage`, `purchases_error_code`로 breakdown

## 5) 구현 위치(코드)

- Shared 타입/프로퍼티 빌더: `packages/shared/src/lib/analyticsEvents.ts`
- Mobile 트래킹/`is_first` 처리: `apps/mobile/src/lib/posthog.ts`

