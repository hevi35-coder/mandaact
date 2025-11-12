# UTC 타임존 통일 마이그레이션 계획

**작성일**: 2025-11-12
**상태**: 계획 단계 (문서화 완료)
**우선순위**: 높음 (데이터 정합성 핵심)

---

## 📊 현황 분석

### 현재 타임존 처리 방식

**저장 (Database)**:
- ✅ Supabase PostgreSQL: `TIMESTAMPTZ` 타입
- ✅ 내부적으로 UTC 저장
- ✅ `checked_at` 필드는 UTC 기준

**쿼리 (API Layer)**:
- ❌ 로컬 타임존으로 날짜 생성 후 `.toISOString()` 변환
- ❌ 9시간 타임존 차이 발생 (한국 = UTC+9)

**표시 (UI Layer)**:
- ✅ `.toLocaleDateString()`, `.toLocaleTimeString()` 사용
- ✅ 자동 로컬 타임존 변환

---

## 🚨 문제점

### 문제 1: 날짜 범위 쿼리 오류

**위치**: `src/pages/TodayChecklistPage.tsx:122-132`

```typescript
// ❌ 현재 (잘못된 방식)
const dayStart = new Date(selectedDate)
dayStart.setHours(0, 0, 0, 0)  // 로컬 타임존 00:00 (한국 = UTC+9)

const { data } = await supabase
  .from('check_history')
  .gte('checked_at', dayStart.toISOString())  // UTC로 변환 → 9시간 차이!
```

**결과**:
- 한국 시간 2025-11-12 00:00:00
- → `.toISOString()` 변환
- → UTC 2025-11-11 15:00:00
- → **9시간 차이 발생!**

**영향**:
- 오늘 00:00~08:59 체크가 어제로 인식
- 스트릭 계산 오류 가능
- 일일 통계 부정확

---

### 문제 2: 체크 생성 시 타임존 불일치

**위치**: `src/pages/TodayChecklistPage.tsx:225-233`

```typescript
// 체크 생성
const checkDate = new Date(selectedDate)
checkDate.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds())

await supabase
  .from('check_history')
  .insert({
    checked_at: checkDate.toISOString()  // UTC로 저장
  })
```

**현재 동작**:
- 한국 시간 2025-11-12 02:17 체크
- → DB에 UTC 2025-11-11 17:17 저장
- → 읽을 때 다시 로컬로 변환 → 2025-11-12 02:17 ✅

**문제**:
- 왕복 변환이라 겉보기는 정상
- 하지만 **날짜 경계 로직에서 오류**
- Edge Functions와 클라이언트 간 불일치

---

### 문제 3: "오늘" 개념의 모호성

**시나리오**:
- 클라이언트 (한국): 2025-11-12 23:59
- 서버 (Edge Function): UTC 2025-11-12 14:59
- → 클라이언트 "오늘" ≠ 서버 "오늘"

---

## 🎯 해결 전략

### 핵심 원칙

1. **저장**: 모두 UTC
2. **쿼리**: UTC 기준으로 처리
3. **표시**: 표시할 때만 로컬 타임존 변환
4. **일관성**: 유저 타임존 정보 활용

---

## ✅ 구현 방안

### Phase 1: Critical (즉시 수정)

#### 1-1. 타임존 유틸리티 라이브러리 설치

```bash
npm install date-fns date-fns-tz
```

**선택 이유**:
- ✅ 번들 크기 작음 (Tree-shakeable)
- ✅ 타입스크립트 지원
- ✅ 타임존 처리 강력함

---

#### 1-2. 타임존 유틸리티 함수 생성

**파일**: `src/lib/timezone.ts`

```typescript
import { parseISO, startOfDay, endOfDay, format } from 'date-fns'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'

/**
 * 기본 타임존 (한국)
 */
export const DEFAULT_TIMEZONE = 'Asia/Seoul'

/**
 * 유저 타임존 기준으로 날짜의 시작/끝 UTC 타임스탬프 반환
 *
 * @param dateString - YYYY-MM-DD 형식
 * @param timezone - 타임존 (기본: Asia/Seoul)
 * @returns UTC ISO 문자열 { start, end }
 *
 * @example
 * getDayBoundsUTC('2025-11-12', 'Asia/Seoul')
 * // {
 * //   start: '2025-11-11T15:00:00.000Z',  // 한국 11/12 00:00 = UTC 11/11 15:00
 * //   end: '2025-11-12T14:59:59.999Z'     // 한국 11/12 23:59 = UTC 11/12 14:59
 * // }
 */
export function getDayBoundsUTC(
  dateString: string,
  timezone: string = DEFAULT_TIMEZONE
): { start: string; end: string } {
  // YYYY-MM-DD 문자열을 해당 타임존의 자정으로 파싱
  const localDate = parseISO(dateString + 'T00:00:00')

  // 해당 타임존의 00:00으로 해석
  const zonedDate = toZonedTime(localDate, timezone)

  // 해당 타임존의 하루 시작/끝
  const dayStart = startOfDay(zonedDate)
  const dayEnd = endOfDay(zonedDate)

  // UTC로 변환
  const utcStart = fromZonedTime(dayStart, timezone)
  const utcEnd = fromZonedTime(dayEnd, timezone)

  return {
    start: utcStart.toISOString(),
    end: utcEnd.toISOString()
  }
}

/**
 * UTC 타임스탬프를 유저 타임존의 날짜 문자열로 변환
 *
 * @param utcTimestamp - UTC ISO 문자열
 * @param timezone - 타임존 (기본: Asia/Seoul)
 * @returns YYYY-MM-DD 형식
 *
 * @example
 * utcToUserDate('2025-11-11T17:00:00.000Z', 'Asia/Seoul')
 * // '2025-11-12'  (한국 시간으로 11/12 02:00)
 */
export function utcToUserDate(
  utcTimestamp: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatInTimeZone(utcTimestamp, timezone, 'yyyy-MM-dd')
}

/**
 * 현재 유저 타임존의 오늘 날짜
 *
 * @param timezone - 타임존 (기본: Asia/Seoul)
 * @returns YYYY-MM-DD 형식
 *
 * @example
 * getUserToday('Asia/Seoul')  // '2025-11-12'
 */
export function getUserToday(timezone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
}

/**
 * 현재 시간을 유저 타임존으로 포맷
 *
 * @param utcTimestamp - UTC ISO 문자열
 * @param timezone - 타임존 (기본: Asia/Seoul)
 * @returns 포맷된 날짜/시간
 */
export function formatUserDateTime(
  utcTimestamp: string,
  timezone: string = DEFAULT_TIMEZONE
): {
  date: string  // '2025.11.12'
  time: string  // '오전 02:17'
} {
  const date = formatInTimeZone(utcTimestamp, timezone, 'yyyy.MM.dd')
  const time = formatInTimeZone(utcTimestamp, timezone, 'aaa hh:mm', {
    locale: require('date-fns/locale/ko')
  })

  return { date, time }
}

/**
 * 날짜 차이 계산 (일 단위)
 *
 * @param date1 - UTC ISO 문자열
 * @param date2 - UTC ISO 문자열
 * @param timezone - 타임존 (기본: Asia/Seoul)
 * @returns 날짜 차이 (일)
 */
export function getDaysDifference(
  date1: string,
  date2: string,
  timezone: string = DEFAULT_TIMEZONE
): number {
  const d1 = utcToUserDate(date1, timezone)
  const d2 = utcToUserDate(date2, timezone)

  const diffTime = Math.abs(
    parseISO(d1).getTime() - parseISO(d2).getTime()
  )
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
```

---

#### 1-3. TodayChecklistPage 수정

**파일**: `src/pages/TodayChecklistPage.tsx`

**변경 1: 날짜 범위 쿼리**

```typescript
// ❌ 기존 (잘못됨)
const dayStart = new Date(selectedDate)
dayStart.setHours(0, 0, 0, 0)
const dayEnd = new Date(dayStart)
dayEnd.setDate(dayEnd.getDate() + 1)

const { data: checksData } = await supabase
  .from('check_history')
  .select('*')
  .eq('user_id', user.id)
  .gte('checked_at', dayStart.toISOString())
  .lt('checked_at', dayEnd.toISOString())

// ✅ 수정 (올바름)
import { getDayBoundsUTC } from '@/lib/timezone'

const { start, end } = getDayBoundsUTC(selectedDate)

const { data: checksData } = await supabase
  .from('check_history')
  .select('*')
  .eq('user_id', user.id)
  .gte('checked_at', start)
  .lt('checked_at', end)
```

**변경 2: 체크 생성**

```typescript
// ❌ 기존
const checkDate = new Date(selectedDate)
checkDate.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds())

await supabase
  .from('check_history')
  .insert({
    action_id: action.id,
    user_id: user.id,
    checked_at: checkDate.toISOString()
  })

// ✅ 수정
await supabase
  .from('check_history')
  .insert({
    action_id: action.id,
    user_id: user.id,
    checked_at: new Date().toISOString()  // 현재 UTC 시각 그대로
  })
```

---

#### 1-4. 스트릭 계산 로직 검증

**파일**: `src/lib/stats.ts:getStreakStats()`

**검증 필요 부분**:
```typescript
// 현재 코드 검증
const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
```

**문제**: `new Date(check.checked_at)`는 자동으로 로컬 타임존 변환
- 한국 사용자는 정상 작동
- 하지만 타임존 정보 손실

**개선**:
```typescript
import { utcToUserDate } from '@/lib/timezone'

// 모든 날짜 변환을 유틸리티 함수로
const dateStr = utcToUserDate(check.checked_at)
```

---

### Phase 2: Important (단기 개선)

#### 2-1. 모든 날짜 쿼리를 유틸리티로 교체

**대상 파일**:
- `src/components/stats/UserProfileCard.tsx`
- `src/lib/stats.ts` (모든 날짜 처리)
- `src/pages/MandalartDetailPage.tsx`

**패턴**:
```typescript
// ❌ 기존 패턴
const date = new Date(timestamp)
const dateStr = `${date.getFullYear()}-...`

// ✅ 신규 패턴
import { utcToUserDate } from '@/lib/timezone'
const dateStr = utcToUserDate(timestamp)
```

---

#### 2-2. Edge Functions 타임존 지원

**파일**: `supabase/functions/*/index.ts`

**요청 헤더에 타임존 추가**:
```typescript
// 클라이언트
const response = await fetch('/functions/v1/some-function', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
  }
})

// Edge Function
const userTimezone = req.headers.get('X-User-Timezone') || 'Asia/Seoul'
```

---

#### 2-3. 경계 케이스 테스트

**테스트 시나리오**:
1. **자정 체크** (00:00~00:59)
2. **자정 직전 체크** (23:00~23:59)
3. **타임존 경계** (UTC 15:00 = 한국 00:00)
4. **스트릭 끊김 경계**
5. **날짜 변경 시점**

**테스트 파일**: `src/lib/__tests__/timezone.test.ts`

```typescript
import { getDayBoundsUTC, utcToUserDate } from '@/lib/timezone'

describe('Timezone Utilities', () => {
  test('getDayBoundsUTC - 한국 자정', () => {
    const { start, end } = getDayBoundsUTC('2025-11-12', 'Asia/Seoul')

    expect(start).toBe('2025-11-11T15:00:00.000Z')  // 한국 00:00
    expect(end).toBe('2025-11-12T14:59:59.999Z')    // 한국 23:59
  })

  test('utcToUserDate - 타임존 경계', () => {
    // UTC 11/11 16:00 = 한국 11/12 01:00
    const date = utcToUserDate('2025-11-11T16:00:00.000Z', 'Asia/Seoul')
    expect(date).toBe('2025-11-12')
  })

  test('utcToUserDate - 자정 직전', () => {
    // UTC 11/11 14:59 = 한국 11/11 23:59
    const date = utcToUserDate('2025-11-11T14:59:00.000Z', 'Asia/Seoul')
    expect(date).toBe('2025-11-11')
  })
})
```

---

### Phase 3: Enhancement (장기)

#### 3-1. 유저 타임존 DB 저장

**테이블 스키마 추가**:
```sql
-- migrations/YYYYMMDD_add_user_timezone.sql
ALTER TABLE user_levels
ADD COLUMN timezone TEXT DEFAULT 'Asia/Seoul',
ADD COLUMN timezone_offset INTEGER DEFAULT 9;

-- 인덱스
CREATE INDEX idx_user_levels_timezone ON user_levels(timezone);
```

**유저 프로필에서 자동 감지 및 저장**:
```typescript
// 최초 로그인 시
const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

await supabase
  .from('user_levels')
  .update({
    timezone: detectedTimezone,
    timezone_offset: new Date().getTimezoneOffset() / -60
  })
  .eq('user_id', userId)
```

---

#### 3-2. 타임존별 통계 대시보드

**Admin 대시보드**:
- 타임존별 활성 사용자
- 타임존별 피크 시간
- 타임존 경계 이슈 모니터링

---

#### 3-3. 기존 데이터 검증 및 마이그레이션

**검증 쿼리**:
```sql
-- 의심스러운 타임스탬프 찾기
SELECT
  id,
  user_id,
  checked_at,
  checked_at AT TIME ZONE 'Asia/Seoul' as korean_time,
  EXTRACT(HOUR FROM checked_at AT TIME ZONE 'Asia/Seoul') as korean_hour
FROM check_history
WHERE EXTRACT(HOUR FROM checked_at AT TIME ZONE 'Asia/Seoul') BETWEEN 0 AND 8
ORDER BY checked_at DESC
LIMIT 100;
```

**마이그레이션 (신중히!)**:
```sql
-- 백업 먼저!
CREATE TABLE check_history_backup AS SELECT * FROM check_history;

-- 필요시 타임존 보정 (예시)
-- UPDATE check_history
-- SET checked_at = checked_at + INTERVAL '9 hours'
-- WHERE created_at < '2025-11-12'  -- UTC 통일 이전 데이터만
-- AND user_timezone = 'Asia/Seoul';
```

---

## ⚠️ 한계점 및 대응

### 한계점 1: 날짜 경계 문제

**문제**:
- 한국 01:00 체크 → UTC 어제 16:00 저장
- 통계에서 "어제"로 카운트될 수 있음

**대응**:
- ✅ 유저 타임존 기준으로 모든 통계 계산
- ✅ `getDayBoundsUTC()` 사용으로 올바른 범위 쿼리

---

### 한계점 2: 서버-클라이언트 불일치

**문제**:
- Edge Function은 UTC 기준
- 클라이언트는 로컬 타임존 기준

**대응**:
- ✅ Edge Function에 `X-User-Timezone` 헤더 전달
- ✅ 서버도 유저 타임존 기준으로 날짜 처리

---

### 한계점 3: 성능 오버헤드

**문제**:
- 타임존 변환 연산 추가

**대응**:
- ✅ `date-fns`는 경량 라이브러리
- ✅ 변환 결과 캐싱 가능
- ✅ 큰 성능 영향 없음 (ms 단위)

---

### 한계점 4: 국제화(i18n) 대비

**문제**:
- 현재는 한국 사용자만 고려
- 향후 글로벌 확장 시?

**대응**:
- ✅ 이미 타임존 파라미터화되어 있음
- ✅ 추가 타임존 지원 용이
- ✅ 유저 설정에서 타임존 선택 가능

---

## 📋 체크리스트

### Phase 1: Critical
- [ ] `date-fns`, `date-fns-tz` 설치
- [ ] `src/lib/timezone.ts` 유틸리티 생성
- [ ] `TodayChecklistPage.tsx` 날짜 범위 쿼리 수정
- [ ] `TodayChecklistPage.tsx` 체크 생성 수정
- [ ] `src/lib/stats.ts` 스트릭 계산 검증
- [ ] 수동 테스트 (00:00, 23:59 체크)

### Phase 2: Important
- [ ] `UserProfileCard.tsx` 날짜 처리 수정
- [ ] `stats.ts` 모든 날짜 변환 유틸리티로 교체
- [ ] Edge Functions 타임존 헤더 지원
- [ ] 테스트 파일 작성 (`timezone.test.ts`)
- [ ] 경계 케이스 자동 테스트

### Phase 3: Enhancement
- [ ] 유저 타임존 DB 스키마 추가
- [ ] 타임존 자동 감지 및 저장
- [ ] 타임존별 통계 대시보드
- [ ] 기존 데이터 검증
- [ ] 필요시 마이그레이션 스크립트

---

## 📊 성공 지표

### 정량적 지표
- **타임존 버그 리포트**: 0건 목표
- **스트릭 오류율**: <0.1%
- **날짜 경계 오류**: 0건
- **통계 정확도**: 100%

### 정성적 지표
- 유저 피드백 (날짜/시간 관련)
- QA 테스트 통과율
- 개발자 경험 (코드 가독성)

---

## 참고 자료

### 라이브러리
- [date-fns](https://date-fns.org/)
- [date-fns-tz](https://github.com/marnusw/date-fns-tz)

### 문서
- [PostgreSQL TIMESTAMPTZ](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [Supabase Timezones](https://supabase.com/docs/guides/database/timezones)
- [JavaScript Date and Time](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

### 관련 파일
- `src/pages/TodayChecklistPage.tsx`: 체크 생성/조회
- `src/lib/stats.ts`: 스트릭 및 통계 계산
- `src/components/stats/UserProfileCard.tsx`: 활동일수 계산
- `supabase/migrations/*`: 데이터베이스 스키마
