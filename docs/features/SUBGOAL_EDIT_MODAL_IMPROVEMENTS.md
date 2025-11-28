# 세부목표 수정 모달 UI 개선

## 개요

세부목표 수정 모달(SubGoalEditModal) 내 타입 설정 UI를 개선하여 사용성을 향상시켰습니다.
기존 드롭다운 기반 UI를 버튼 선택형으로 변경하고, 별도 모달 대신 뷰 전환 방식을 적용했습니다.

## 변경 사항 요약

### 1. 타입 선택기 뷰 전환 방식

**Before:** ActionTypeSelector를 별도 Modal로 표시
**After:** SubGoalEditModal 내에서 viewMode 전환으로 인라인 표시

```
viewMode: 'list' | 'typeSelector'
- list: 세부목표 제목 + 실천항목 목록
- typeSelector: 타입 설정 폼 (같은 모달 내 뷰 전환)
```

**헤더 변경:**
- list 뷰: "세부목표 수정" + X 닫기 버튼
- typeSelector 뷰: ← 뒤로가기 + "타입 설정" + ✓ 저장 버튼

---

### 2. 루틴 반복주기 - 버튼 선택형

**Before:** 드롭다운 선택
**After:** 3개 버튼 (균등 너비)

```
[  매일  ] [  매주  ] [  매월  ]
```

**동작:**
- 주기 변경 시 관련 값 자동 리셋:
  - routineCountPerPeriod → 1
  - routineWeekdays → []
  - showCustomMonthlyInput → false

---

### 3. 주간 목표 횟수 - 정사각형 버튼

**Before:** 드롭다운 선택
**After:** 7개 정사각형 버튼 (요일 선택과 동일 스타일)

```
[1] [2] [3] [4] [5] [6] [7]
```

**스타일:** `w-9 h-9` (36x36px), 숫자만 표시

---

### 4. 월간 목표 횟수 - 정사각형 버튼 + 직접입력

**Before:** 드롭다운 선택 (10개 옵션)
**After:** 7개 정사각형 버튼 + 직접입력

```
[1] [2] [3] [5] [10] [20] [30] [+]
```

**직접입력 (+) 버튼:**
- 탭 시 같은 위치에 입력 필드로 변환
- 입력 필드: 다크 배경(bg-gray-900), 흰색 텍스트
- 최대값 31 제한 (한 달 일수)
- maxLength=2

**옵션 변경:**
- 제거: 4, 8, 15
- 유지: 1, 2, 3, 5, 10, 20, 30

---

### 5. 미션 반복주기 - 버튼 선택형

**Before:** 드롭다운 선택
**After:** 5개 버튼 (가로 배치)

```
[매일] [매주] [매월] [분기별] [매년]
```

---

## 코드 구조 (Mobile)

### 파일 위치
`apps/mobile/src/components/SubGoalEditModal.tsx`

### 주요 상태
```typescript
// 뷰 모드
const [viewMode, setViewMode] = useState<'list' | 'typeSelector'>('list')
const [selectedAction, setSelectedAction] = useState<Action | null>(null)

// 타입 설정 폼
const [selectedType, setSelectedType] = useState<ActionType>('routine')
const [routineFrequency, setRoutineFrequency] = useState<RoutineFrequency>('daily')
const [routineWeekdays, setRoutineWeekdays] = useState<number[]>([])
const [routineCountPerPeriod, setRoutineCountPerPeriod] = useState<number>(1)
const [missionCompletionType, setMissionCompletionType] = useState<MissionCompletionType>('once')
const [missionPeriodCycle, setMissionPeriodCycle] = useState<MissionPeriodCycle>('monthly')

// 직접입력
const [showCustomMonthlyInput, setShowCustomMonthlyInput] = useState(false)
const [customMonthlyValue, setCustomMonthlyValue] = useState('')
```

### 상수
```typescript
const FREQUENCY_OPTIONS = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
]

const WEEKLY_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const MONTHLY_COUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 30]

const PERIOD_CYCLE_OPTIONS = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'quarterly', label: '분기별' },
  { value: 'yearly', label: '매년' },
]
```

---

## 웹앱 적용 가이드

### 대상 파일

| 파일 | 설명 |
|------|------|
| `apps/web/src/components/ActionTypeSelector.tsx` | 타입 설정 Dialog (주요 수정 대상) |
| `apps/web/src/components/SubGoalModal.tsx` | 세부목표 편집 모달 (ActionTypeSelector 호출) |

### 현재 웹앱 구조

```
SubGoalModal (세부목표 편집)
  └─ ActionTypeSelector (별도 Dialog로 호출)
       ├─ 타입 선택: RadioGroup
       ├─ 루틴 반복주기: Select (드롭다운)
       ├─ 주간 목표 횟수: Select (드롭다운)
       ├─ 월간 목표 횟수: Select (드롭다운) + 직접입력
       └─ 미션 반복주기: Select (드롭다운)
```

### 적용할 변경 사항

**ActionTypeSelector.tsx:**

1. **드롭다운 → 버튼 선택형 변경**
   - 루틴 반복주기: `<Select>` → ButtonGroup (3개: 매일/매주/매월)
   - 주간 목표 횟수: `<Select>` → ButtonGroup (정사각형 7개)
   - 월간 목표 횟수: `<Select>` → ButtonGroup (정사각형 7개 + 직접입력)
   - 미션 반복주기: `<Select>` → ButtonGroup (5개)

2. **월간 횟수 옵션 변경**
   - Before: `[1, 2, 3, 4, 5, 8, 10, 15, 20, 30]`
   - After: `[1, 2, 3, 5, 10, 20, 30]` + 직접입력(+)

3. **직접입력 인라인 배치**
   - + 버튼 탭 시 같은 줄에 입력 필드 표시
   - 최대값 31 제한

4. **주기 변경 시 리셋 로직**
   ```typescript
   // 반복주기 변경 시
   setRoutineFrequency(value)
   setRoutineCountPerPeriod(1)
   setRoutineWeekdays([])
   setIsCustomMonthlyCount(false)
   ```

### 스타일 가이드 (Tailwind)

**정사각형 버튼:**
```jsx
className={`w-9 h-9 rounded-lg items-center justify-center border ${
  selected ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-700'
}`}
```

**균등 너비 버튼:**
```jsx
className={`flex-1 py-2.5 rounded-lg border items-center ${
  selected ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-700'
}`}
```

**직접입력 버튼 (점선):**
```jsx
className="w-9 h-9 rounded-lg items-center justify-center border border-dashed border-gray-400"
```

**직접입력 필드 (활성):**
```jsx
className="w-9 h-9 border border-gray-900 bg-gray-900 rounded-lg text-sm text-center text-white"
```

---

## 관련 변경 파일

### Mobile
- `apps/mobile/src/components/SubGoalEditModal.tsx` - 주요 변경
- `apps/mobile/src/components/ActionTypeSelector.tsx` - 별도 모달 (다른 곳에서 사용 가능)

### Web (적용 예정)
- `apps/web/src/components/ActionTypeSelector.tsx`
- 또는 MandalartDetailPage 내 타입 설정 관련 컴포넌트

---

## 날짜
- 작성일: 2025-11-28
- 모바일 적용 완료
- 웹 적용 예정
