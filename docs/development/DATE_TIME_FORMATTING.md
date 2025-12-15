<!--
목적: 앱 전체에서 날짜/시간 표기를 locale + (유저 설정) timezone 기준으로 통일.
-->

# Date/Time Formatting (Locale + User Timezone)

## 원칙

1) **표시용 날짜/시간은 항상 유저 설정 timezone을 우선 적용**합니다.  
   - 기준: `user_profiles.timezone` (Settings에서 저장)
   - 접근: `apps/mobile/src/hooks/useUserProfile.ts`의 `useUserProfile(user?.id).timezone`

2) **표시용 포맷은 공통 유틸로만 처리**합니다(화면별 `toLocaleDateString`/수기 포맷 금지).  
   - 유틸: `apps/mobile/src/lib/dateFormat.ts`

3) **키/캐싱/기간 계산용(YYYY-MM-DD 등)과 표시용 포맷을 분리**합니다.  
   - 표시용: `formatNumericDate`, `formatMonthDay`, `formatDateRange`, `formatTime` 등
   - 키용: `formatZonedISODate`, `formatDayKeyForTimezone` 등

## 사용 방법

```ts
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useUserProfile } from '../hooks/useUserProfile'
import { formatNumericDate } from '../lib'

const { i18n } = useTranslation()
const { user } = useAuthStore()
const { timezone } = useUserProfile(user?.id)

const label = formatNumericDate(new Date(), { language: i18n.language, timeZone: timezone })
```

## QA 체크리스트

- Settings에서 timezone을 변경(예: `Asia/Seoul` ↔ `America/Los_Angeles`) 후 아래 화면 날짜가 TZ 기준으로 바뀌는지 확인
  - Premium/Subscription 만료일(권장: `MM/dd/yyyy`(en) / `yyyy.MM.dd`(ko))
  - Reports: Goal Diagnosis 날짜(월/일 표기), Practice Report 기간(weekStart~weekEnd), “다음 리포트” 날짜
  - Today: 상단 날짜 라벨
  - Home: StreakCard 날짜/시간
- 언어 변경(en/ko) 후 날짜 형식이 언어권 스타일로 보이는지 확인
- (주의) 키/캐시용 날짜는 표시 포맷을 사용하지 말고 `formatZonedISODate`/`formatDayKeyForTimezone`를 사용

