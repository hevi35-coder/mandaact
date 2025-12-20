# PostHog Dashboard Setup (10.3.2B)

목표: 출시 직후 운영에서 **리텐션/전환**을 “감(느낌)”이 아니라 **데이터**로 본다.  
이 문서는 PostHog에서 만들 대시보드/인사이트/퍼널을 “정확히 무엇을 어떻게 설정할지” 기준으로 남긴다.

관련 문서:
- 리텐션 이벤트 정의: `docs/operations/RETENTION_ANALYTICS.md`
- 결제/전환 이벤트 정의: `docs/features/MONETIZATION_ANALYTICS_TAXONOMY.md`

## 0) 공통 전제(필수)

- PostHog에서 `identify`가 되어야 “유저 단위(계정 단위)” 분석이 의미가 커진다.
- 기본 필터 권장:
  - `platform = mobile` (웹은 현재 랜딩 페이지 모드)
  - 결제 관련은 `is_sandbox != true` (프로덕션 데이터 보기용)
- `is_first`는 모바일에서 `AsyncStorage` 기반으로 “유저별 1회” 플래그:
  - 로그아웃/재설치/기기 변경 시 재발생 가능(해석 시 주의)

## 1) 대시보드 1: Retention / Activation

**Dashboard name**: `MandaAct — Retention & Activation (10.3.2B)`

### 1.1 DAU/WAU

- Insight: **Trends**
  - Event: `app_opened`
  - Aggregation: `Unique users`
  - Interval: `Day`(DAU), `Week`(WAU)
  - Filter: `platform=mobile`

### 1.2 Signup → First Success(핵심 퍼널)

- Insight: **Funnels**
  - Steps:
    1) `user_signed_up`
    2) `tutorial_completed`
    3) `mandalart_created` with filter `is_first = true`
    4) `action_checked` with filter `is_first = true`
  - Conversion window: `7 days`
  - Breakdown(선택): `input_method` (3단계 기준), `skipped`(2단계 기준)
  - Filter: `platform=mobile`

### 1.3 Time to First Check(첫 체크까지 걸린 시간)

- Insight: **Funnels**
  - Steps:
    1) `user_signed_up`
    2) `action_checked` with filter `is_first = true`
  - Show: `Time to convert`(가능한 경우) / 또는 단계별 전환 시간 분포
  - Conversion window: `7 days`
  - Filter: `platform=mobile`

### 1.4 First Report Adoption(리포트 진입)

- Insight: **Funnels**
  - Steps:
    1) `action_checked`
    2) `weekly_report_generated` with filter `is_first = true`
  - Conversion window: `14 days`
  - Filter: `platform=mobile`

### 1.5 7-Day Retention(재방문)

- Insight: **Retention**
  - Start event: `user_signed_up` (first time)
  - Returning event: `app_opened` (any time)
  - Interval: `Day`
  - Period: `7 days`
  - Filter: `platform=mobile`

## 2) 대시보드 2: Monetization / Paywall

**Dashboard name**: `MandaAct — Monetization (10.3.2B)`

### 2.1 Paywall Conversion Funnel

- Insight: **Funnels**
  - Steps:
    1) `paywall_viewed`
    2) `purchase_started`
    3) `purchase_success`
  - Conversion window: `24 hours`
  - Breakdown(권장): `plan` (2~3 단계 기준), `source_screen` (1단계 기준)
  - Filter: `platform=mobile`, `is_sandbox != true`

### 2.2 Purchase Failures(원인 분해)

- Insight: **Trends**
  - Event: `purchase_failed`
  - Aggregation: `Total events`
  - Breakdown(권장): `error_category`, `error_stage`, `purchases_error_code`
  - Filter: `platform=mobile`, `is_sandbox != true`

### 2.3 Restore Reliability

- Insight: **Trends**
  - Event: `purchase_restore_failed` / `purchase_restore_success`
  - Breakdown(권장): `trigger`
  - Filter: `platform=mobile`, `is_sandbox != true`

## 3) 운영 루틴(주 1회 15분)

- Retention 대시보드에서:
  - `user_signed_up → action_checked(is_first=true)` 전환율/시간이 떨어졌는지 확인
  - 7-day retention 추세가 꺾였는지 확인
- Monetization 대시보드에서:
  - `purchase_failed`가 특정 `error_category/stage`에 몰리는지 확인
  - `paywall_viewed → purchase_success` 전환이 떨어지면 “트리거/카피/배치” 가설 수립

