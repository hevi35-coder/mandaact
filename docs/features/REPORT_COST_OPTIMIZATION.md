# B3. 리포트 비용(토큰) 최적화

## 목표
- **유저 경험 유지**: 리포트 품질/형식(JSON)을 유지하면서 비용을 줄인다.
- **안전한 캐싱**: “같은 입력이면 재사용”을 **해시 기반**으로 구현해 오탐(잘못된 캐시 히트) 위험을 최소화한다.
- **운영 편의성**: 저가 모델 ↔ 고가 모델 전환이 쉬워야 하고, 문제가 있으면 캐시를 즉시 끌 수 있어야 한다.

---

## 최종안: 생성/재사용 조건(weekly/diagnosis 공통)
**아래 항목 중 하나라도 변경되면 새로 생성**한다.
- `report_type` (`weekly` / `diagnosis`)
- `language` (`ko` / `en`)
- `prompt_version` (프롬프트/출력 스키마 변경 시 버전 올림)
- `input_hash` (정규화된 `input_summary`의 SHA-256)

**재사용(Cache hit) 조건**: 동일 `(cache_key + input_hash + prompt_version)`을 가진 기존 리포트가 존재할 때.

---

## Weekly(실천 리포트) 조건
### 기간(period) 정의: 최근 7일(당일 제외), 사용자 타임존 기준
- `period_end` = 사용자 기준 “어제 날짜”
- `period_start` = `period_end - 6 days`
- DB 조회 범위(타임존 midnight 기반):
  - `checked_at >= start_ts`
  - `checked_at < end_ts_exclusive` (어제+1일 00:00)

### Weekly input_signature (타이틀 변경 포함)
Weekly `input_summary`에 포함(변경 시 새로 생성되어야 하는 값):
- 기간: `period_start`, `period_end`, `user_timezone`
- 집계/패턴: `totalChecks`, `uniqueDays`, `weekdayPattern`, `timePattern`, `actionTypePattern`, `bestDay/worstDay/bestTime`
- 목표별: `bestSubGoal`, `worstSubGoal`에 **(sub_goal_id + title + count)** 포함(타이틀 변경 반영)
- 배지: 최근 배지 `title` 리스트(타이틀 변경 반영)

### Weekly cache_key
- `weekly:{language}:{user_timezone}:{period_start}:{period_end}`

---

## Diagnosis(만다라트 진단) 조건
### 진단 범위: “구조만”
- 실천/스트릭/최근 활동 등 “실천 기반 지표”는 **진단 입력에서 제외**
- 실천 기반 피드백은 Weekly에서만 제공

### Mandalart 구조 해시(mandalart_hash)
Diagnosis `input_summary`는 만다라트 구조/설정의 정규화된 스냅샷을 기반으로 해시 생성:
- `mandalart_id`, `center_goal`
- sub_goals: `id/title/position`
- actions: `id/title/position/type` + 측정가능성/구체성에 영향을 주는 설정값

### Diagnosis cache_key
- `diagnosis:{language}:{mandalart_id}:{mandalart_hash}`

---

## 현재 문제(비용 상승 요인)
- 리포트 생성 함수가 **과도한 데이터를 DB에서 가져오거나**(불필요한 join/`*` select) **메타데이터에 스냅샷으로 저장**해 비용/저장 용량이 불필요하게 커질 수 있음.
- 주간/진단 리포트가 반복 호출될 때 **중복 생성**이 발생할 수 있음(특히 스케줄러 + 유저 수동 생성).
- `max_tokens`가 크게 잡혀 있어(기존 2000) **출력 토큰 비용**이 불필요하게 증가할 수 있음.

---

## 적용한 개선(요약)

### 1) Summary-first 데이터 수집
- 리포트 생성에 필요한 “집계값/패턴”만 최소한으로 수집.
- 불필요한 `select *` / 깊은 join 제거.
- 저장하는 메타데이터는 `data_snapshot` 대신 **`input_summary`(요약)** 중심으로 저장.

### 2) 해시 기반 안전 캐싱
- `ai_reports`에 캐시 필드 추가:
  - `cache_key`: 기간/언어/타입/만다라트 등 “캐시 범위”
  - `input_hash`: `prompt_version + input_summary`의 SHA-256 (안전한 동일성 판정)
  - `prompt_version`: 프롬프트/스키마 변경 시 캐시 자동 무효화
  - `model`: 실제 생성/재사용된 모델 기록
  - `language`: 조회 최적화
- 동일 `(user_id, report_type, cache_key, input_hash)`의 기존 리포트가 있으면 **AI 호출 없이 재사용**.
- 스케줄 리포트는 “pending placeholder”를 업데이트할 때, 동일 입력의 기존 리포트가 있으면 **그 콘텐츠를 복사**해서 비용 절감.

### 3) 모델 라우팅(운영 전환) + 폴백
- 환경변수로 **report_type별 primary/fallback 모델**을 지정 가능.
- primary 결과가 JSON 검증에 실패하면 fallback으로 1회 재시도(있을 때만).

---

## 운영 가이드

### 환경변수
- 캐시
  - `AI_REPORT_CACHE_ENABLED` (default: `true`)  
    - `false`로 설정 시 캐시 완전 비활성화
- 모델/토큰/온도(공통 + 타입별 오버라이드)
  - `AI_REPORT_MODEL_PRIMARY` (default: `sonar`)
  - `AI_REPORT_MODEL_FALLBACK` (optional)
  - `AI_REPORT_MAX_TOKENS` (default: `900`)
  - `AI_REPORT_TEMPERATURE` (default: `0.6`)
  - 타입별(우선 적용):  
    - `AI_REPORT_WEEKLY_MODEL_PRIMARY`, `AI_REPORT_WEEKLY_MODEL_FALLBACK`, `AI_REPORT_WEEKLY_MAX_TOKENS`, `AI_REPORT_WEEKLY_TEMPERATURE`  
    - `AI_REPORT_DIAGNOSIS_MODEL_PRIMARY`, `AI_REPORT_DIAGNOSIS_MODEL_FALLBACK`, `AI_REPORT_DIAGNOSIS_MAX_TOKENS`, `AI_REPORT_DIAGNOSIS_TEMPERATURE`

### 강제 재생성(캐시 우회)
- `supabase/functions/generate-report` 요청 body에 `force_regenerate: true`를 넣으면 캐시를 무시하고 다시 생성한다.

---

## 데이터/스키마 변경
- 마이그레이션: `supabase/migrations/20251214000001_add_ai_reports_cache_fields.sql`
- 마이그레이션: `supabase/migrations/20251214000002_add_rolling_report_period_bounds.sql` (weekly rolling 기간 계산 RPC)
- 영향:
  - 기존 RLS 정책 변경 없음(컬럼 추가).
  - 함수 배포 전/후 순서: **DB 마이그레이션 적용 → Edge Function 배포** 권장.

---

## 모바일 연동 주의사항(UX 일관성)
- **Diagnosis 생성 요청에는 반드시 `mandalart_id`를 포함**해야 한다(만다라트/언어 변경 시 “왜 안 바뀌지?” 방지).
- 조회(fetch) 시에도 `language`를 조건에 포함해 **언어별 최신 리포트**를 가져온다.
- Weekly도 `metadata.input_summary.periodStart/periodEnd`를 기준으로 표시해야(UTC `generated_at`로 인한 날짜 혼동 방지) 실제 “최근 7일(당일 제외)” 기간과 UI가 일치한다.

---

## 추가 LLM API Key 필요 여부
- **아니오(기본)**: 현재 구조는 Perplexity 단일 provider 내부에서 모델만 바꾸는 방식이므로 `PERPLEXITY_API_KEY`만으로 충분하다.
- **예(선택)**: “저가 모델(Provider A) → 고가 모델(Provider B)”처럼 **서로 다른 LLM provider를 혼합**하려면, 해당 provider API key 추가 + 라우팅/에러 처리 로직이 필요하다.

---

## 적용 로그
- 2025-12-14
  - `ai_reports` 캐시/모델 메타 컬럼 추가 + 인덱스 추가
  - `generate-report`/`scheduled-report`에 안전 캐싱 + 모델 폴백 + 요약 입력 적용
  - weekly rolling 기간(최근 7일, 당일 제외) 타임존 계산을 위한 RPC 추가
  - 모바일: diagnosis 생성 요청에 `mandalart_id` 포함 + weekly/diagnosis 조회를 language/metadata 기준으로 정합성 강화
  - 운영 secret 기본값 적용: `AI_REPORT_CACHE_ENABLED=true`, `AI_REPORT_MAX_TOKENS=900`, `AI_REPORT_TEMPERATURE=0.6`

---

## 안전장치(오탐 캐시 방지)
- 캐시 히트 조건은 “기간/언어/타입/만다라트”의 `cache_key` + `input_summary` 해시(`input_hash`) **동시 일치**.
- 프롬프트/출력 형식 변경 시 `prompt_version`을 올려서 캐시가 자동 미스나도록 설계.
- 긴급 대응:
  - `AI_REPORT_CACHE_ENABLED=false`로 즉시 캐시 우회 가능
  - 특정 케이스만 재생성: `force_regenerate: true`

---

## 추후 개선(제안)
- **품질/비용 A/B 운영**: primary를 저가 모델로 두고, 실패/품질저하(형식 오류, 섹션 누락 등) 시 fallback 고가 모델로만 재시도.
- **주간 범위 표준화**: “사용자 타임존 기준 지난 주(월~일)”로 범위를 고정하면 캐시 효율이 더 좋아짐.
- **품질 체크 강화**: JSON 구조 검증 외에 필드 길이/빈 값 비율 등 휴리스틱 추가.
- **관측/대시보드**: 캐시 히트율, 재시도율, 모델별 비용/성공률을 PostHog/로그로 추적(앱 배포 후 진행 권장).
