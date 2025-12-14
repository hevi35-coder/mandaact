# Monetization Analytics Taxonomy (PostHog / AdMob / RevenueCat)

목표: 출시 직후 운영에서 “전환/수익/오류”를 빠르게 파악하기 위해 **이벤트 이름/프로퍼티/네이밍**을 표준화한다.

## 1) 원천(Source of Truth)

- **구독/매출**: RevenueCat 대시보드가 권위(실제 결제 상태/환불/복원/활성 구독).
- **광고 수익**: AdMob 대시보드가 권위(eCPM/Impression/Match rate/Revenue).
- **행동/퍼널/UX**: PostHog(사용 흐름, 전환 퍼널, 광고/결제 시도 대비 성공률, 에러율).

> PostHog의 수익/구독/광고 이벤트는 “관측(telemetry)” 용도이며, 최종 수익 숫자는 AdMob/RevenueCat과 대조한다.

## 2) 이벤트 네이밍 규칙

- 이벤트는 `snake_case`
- 프로퍼티 키도 `snake_case`
- “화면/배치/상품”은 **고정된 canonical 값**을 사용(번역/표기 흔들림 방지)

## 3) PostHog 이벤트 목록

### 3.1 Paywall / Purchase / Restore

- `paywall_viewed`
  - `source_screen`: 예) `subscription_screen`
- `purchase_started`
  - `product_id` (RevenueCat/ASC와 동일)
  - `package_id` (RevenueCat package identifier)
  - `price`, `currency` (가능한 경우)
- `purchase_success`
  - `product_id`, `plan` (`monthly|yearly|null`), `price`, `currency`
- `purchase_failed`
  - `product_id`, `plan?`, `price?`, `currency?`, `error_code`
- `purchase_restore_started`
  - `trigger`: `manual|auto`
- `purchase_restore_success`
  - `trigger`, `restored` (boolean)
- `purchase_restore_failed`
  - `trigger`, `restored?`, `error_code`
- `premium_state_changed`
  - `from`: `free|premium|loading`
  - `to`: `free|premium`
  - `reason`:
    - `rc_entitlement`
    - `rc_active_subscription_fallback`
    - `supabase_fallback`
    - `restore_manual`
    - `restore_auto`
  - `plan`: `monthly|yearly|null`

### 3.2 Ads

- `ad_impression`
  - `ad_format`: `banner|interstitial|rewarded`
  - `placement` (아래 참고)
  - `ad_unit_id` (optional)
- `ad_clicked`
  - `ad_format`, `placement`, `ad_unit_id?`
- `ad_revenue`
  - `ad_format`, `placement`, `ad_unit_id?`
  - `revenue_micros`, `currency`, `precision` (가능한 경우)
- `ad_failed`
  - `ad_format`, `placement`, `ad_unit_id?`
  - `error_code`
- `reward_earned`
  - `ad_format=rewarded`, `placement`, `ad_unit_id?`
  - `reward_type`, `reward_amount`

## 4) Canonical IDs

### 4.1 Product IDs (App Store Connect / RevenueCat 공통)

- Monthly: `com.mandaact.sub.premium.monthly`
- Yearly: `com.mandaact.sub.premium.yearly`

### 4.2 Ad Placement IDs (PostHog canonical)

Banner:
- `banner_home`
- `banner_list`
- `banner_reports`
- `banner_today` (현재 정책상 Today는 Clean Zone이지만 값은 예약)

Interstitial:
- `interstitial_after_create`
- `interstitial_after_report`
- `interstitial_level_up` (현재 UX 정책상 비활성화 가능)

Rewarded:
- `rewarded_report_generate`
- `rewarded_xp_boost`
- `rewarded_streak_freeze`
- `rewarded_yesterday_check`

## 5) 운영 체크(권장)

- PostHog 퍼널: `paywall_viewed` → `purchase_started` → `purchase_success`
- 복원 품질: `purchase_restore_success`(trigger별) + `premium_state_changed`
- 광고 품질: `ad_failed` 비율(placement별), `ad_revenue` / `ad_impression` 추이

