# 알림 시스템 가이드라인

MandaAct 프로젝트의 알림 시스템 사용 가이드입니다.

## 📋 목차

1. [알림 유형](#알림-유형)
2. [메시지 작성 규칙](#메시지-작성-규칙)
3. [사용 예시](#사용-예시)
4. [지속시간 기준](#지속시간-기준)
5. [코드 예시](#코드-예시)

---

## 알림 유형

### 1. Toast 알림 (앱 내)

#### Success (성공)
- **용도**: 작업 완료, 데이터 저장 성공
- **아이콘**: `CheckCircle2` (녹색, h-5 w-5)
- **Lucide 컴포넌트**: `<NotificationIcon type="success" />`
- **지속시간**: 3초
- **예시**: "저장 완료", "업데이트 완료"

#### Error (오류)
- **용도**: 작업 실패, 오류 발생
- **아이콘**: `XCircle` (빨강, h-5 w-5)
- **Lucide 컴포넌트**: `<NotificationIcon type="error" />`
- **variant**: `destructive` (배경색은 흰색 유지, 아이콘 색상으로만 구분)
- **지속시간**: 3-5초
- **예시**: "저장 실패", "네트워크 오류"

#### Warning (경고)
- **용도**: 주의 필요, 확인 요청
- **아이콘**: `AlertTriangle` (노랑, h-5 w-5)
- **Lucide 컴포넌트**: `<NotificationIcon type="warning" />`
- **variant**: `destructive` (배경색은 흰색 유지, 아이콘 색상으로만 구분)
- **지속시간**: 3초
- **예시**: "권한 필요", "입력값 확인"

#### Info (정보)
- **용도**: 진행 상황, 정보 안내
- **아이콘**: `Info` (파랑, h-5 w-5)
- **Lucide 컴포넌트**: `<NotificationIcon type="info" />`
- **지속시간**: 2-3초
- **예시**: "이미지 생성 중", "로딩 중"

#### Celebration (축하)
- **용도**: 특별한 성과, 마일스톤
- **아이콘**: `Sparkles` (보라, h-5 w-5)
- **Lucide 컴포넌트**: `<NotificationIcon type="celebration" />`
- **지속시간**: 5초
- **예시**: "완벽한 하루!", "새로운 배지 획득!"

### 2. PWA Push 알림 (시스템)

#### Test Notification (테스트)
- **제목**: "MandaAct 알림 테스트"
- **내용**: "알림 테스트에 성공했습니다."
- **아이콘**: `/pwa-192x192.png`

#### Daily Reminder (일일 리마인더)
- **패턴 1**: 목표 중심 메시지
- **패턴 2**: 실천 격려 메시지
- **패턴 3**: 항목 안내 메시지
- **아이콘**: `/pwa-192x192.png`

### 3. 확인 다이얼로그

#### Confirm Dialog (단순 확인)
- **용도**: 삭제 등 되돌릴 수 없는 작업
- **버튼**: "확인", "취소"
- **메시지 형식**: "{액션}하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다."

#### Alert Dialog (복잡한 선택)
- **용도**: 다중 옵션 선택, 상세 설명 필요
- **예시**: 만다라트 삭제 (비활성화 vs 영구 삭제)
- **구성**: 제목, 상세 설명, 영향 범위, 선택 버튼

---

## 메시지 작성 규칙

### 기본 원칙

1. **일관성**: 모든 알림이 동일한 패턴 따름
2. **명확성**: 액션과 결과를 명시
3. **간결성**: 2줄 이내, 핵심 정보만
4. **친절함**: 존댓말, 긍정적 표현
5. **시각성**: Lucide 아이콘으로 즉각 인지
6. **접근성**: 아이콘에 aria-label 포함 (스크린 리더 지원)
7. **통일성**: 모든 알림은 흰색 배경 사용, 아이콘 색상으로만 유형 구분

### 어투 규칙

✅ **권장**
- 존댓말 사용: "~습니다", "~해주세요"
- 마침표 사용 (축하 메시지 제외)
- 간결하고 명확한 표현

❌ **지양**
- 느낌표 남용 (축하 메시지만 허용)
- 반말 또는 비격식 표현
- 애매한 표현 ("아마도", "~인 것 같습니다")
- 지나친 기술 용어

### 제목 작성

- **길이**: 1-5단어
- **명확성**: 액션 또는 상태 명시
- **아이콘**: 자동으로 추가됨 (`showSuccess()` 등 유틸리티 함수 사용)
- **이모지 제거**: 제목에서 이모지는 사용하지 않음 (Lucide 아이콘으로 대체)

**좋은 예시**:
- "저장 완료" (아이콘: CheckCircle2)
- "권한 필요" (아이콘: AlertTriangle)
- "이미지 생성 중" (아이콘: Info)

**나쁜 예시**:
- "✅ 저장 완료" (이모지 불필요 - 아이콘 자동 추가됨)
- "성공!" (무엇이 성공?)
- "오류가 발생했어요!" (어떤 오류?)
- "알림" (너무 모호함)

### 설명 작성

- **길이**: 1-2줄, 최대 100자
- **내용**: 구체적인 정보 또는 다음 액션
- **톤**: 친절하고 도움이 되는

**좋은 예시**:
- "알림을 받으실 수 있습니다."
- "설정이 저장되었습니다."
- "실천항목 타입이 업데이트되었습니다."

**나쁜 예시**:
- "작업이 성공적으로 완료되었습니다!" (너무 길고 일반적)
- "오류" (설명 부족)
- "뭔가 잘못되었습니다" (불명확)

---

## 사용 예시

### Toast 알림

#### 성공 메시지
```typescript
import { showSuccess } from '@/lib/notificationUtils'
import { SUCCESS_MESSAGES } from '@/lib/notificationMessages'

// 저장 완료
showSuccess(SUCCESS_MESSAGES.saved())

// 타입 업데이트
showSuccess(SUCCESS_MESSAGES.typeUpdated())

// 닉네임 변경
showSuccess(SUCCESS_MESSAGES.nicknameUpdated())
```

#### 오류 메시지
```typescript
import { showError } from '@/lib/notificationUtils'
import { ERROR_MESSAGES } from '@/lib/notificationMessages'

// 저장 실패
showError(ERROR_MESSAGES.saveFailed())

// 네트워크 오류
showError(ERROR_MESSAGES.networkError())
```

#### 경고 메시지
```typescript
import { showWarning } from '@/lib/notificationUtils'
import { VALIDATION_MESSAGES } from '@/lib/notificationMessages'

// 빈 필드
showWarning(VALIDATION_MESSAGES.emptyTitle())

// 최대 개수 초과
showWarning(VALIDATION_MESSAGES.maxActionsReached())
```

#### 축하 메시지
```typescript
import { showCelebration } from '@/lib/notificationUtils'

// Perfect Day 달성
showCelebration({
  title: '🎉 Perfect Day!',
  description: '오늘의 모든 실천을 완료했습니다!',
})
```

### PWA 알림

#### 테스트 알림
```typescript
import { sendTestNotification } from '@/lib/notifications'

await sendTestNotification()
// 제목: "MandaAct 알림 테스트"
// 내용: "알림 테스트에 성공했습니다."
```

#### 일일 리마인더
```typescript
import { scheduleDailyReminder, generateNotificationMessage } from '@/lib/notifications'

const message = generateNotificationMessage({
  centerGoal: '건강한 삶',
  yesterdayCheckCount: 5,
  totalActions: 8
})

await scheduleDailyReminder(message.title, message.body, '09:00')
```

### 확인 다이얼로그

#### 단순 확인
```typescript
if (!confirm('실천항목을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
  return
}
// 삭제 진행
```

#### AlertDialog (복잡한 선택)
```tsx
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>만다라트 삭제</AlertDialogTitle>
      <AlertDialogDescription>
        {/* 상세 설명 및 영향 범위 */}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <Button variant="outline" onClick={handleDeactivate}>
        비활성화 (권장)
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        영구 삭제
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 디자인 시스템

### 배경색 정책

**모든 Toast 알림은 동일한 흰색 배경을 사용합니다.**

- **Success**: 흰색 배경 + 초록색 CheckCircle2 아이콘
- **Error**: 흰색 배경 + 빨간색 XCircle 아이콘 (~~빨간 배경 사용하지 않음~~)
- **Warning**: 흰색 배경 + 노란색 AlertTriangle 아이콘 (~~빨간 배경 사용하지 않음~~)
- **Info**: 흰색 배경 + 파란색 Info 아이콘
- **Celebration**: 흰색 배경 + 보라색 Sparkles 아이콘

**이유**:
1. 현대적이고 깔끔한 디자인
2. 일관성 있는 UX (모든 알림이 동일한 시각적 무게감)
3. 아이콘 색상만으로 충분히 구분 가능
4. 다른 현대적 앱들의 표준 (GitHub, Vercel 등)

**구현 위치**: `src/components/ui/toast.tsx`
```tsx
const toastVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "border bg-background text-foreground", // 배경색 동일
      },
    },
  }
)
```

---

## 지속시간 기준

### Toast 알림

| 유형 | 지속시간 | 이유 |
|------|----------|------|
| Success | 3초 | 빠른 확인 후 사라짐 |
| Error | 3-5초 | 사용자가 읽을 충분한 시간 (중요도 높음) |
| Warning | 3초 | 주의 필요하지만 간결 |
| Info | 2-3초 | 진행 상황 빠른 표시 |
| Celebration | 5초 | 특별한 순간 강조 |

### 스택 제한

- **최대 동시 표시**: 3개
- **이유**: 화면 공간 확보, 사용자 혼란 방지
- **설정**: `TOAST_LIMIT = 3` in `use-toast.ts`

### 자동 제거

- **기본**: `TOAST_REMOVE_DELAY = 5000ms` (5초)
- **목적**: 메모리 관리, UI 정리

---

## 코드 예시

### 컴포넌트에서 사용

```typescript
import { useToast } from '@/hooks/use-toast'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/notificationMessages'
import { showSuccess, showError } from '@/lib/notificationUtils'

function MyComponent() {
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      // 저장 로직
      await saveData()

      // 성공 알림
      showSuccess(SUCCESS_MESSAGES.saved())
    } catch (error) {
      // 오류 알림
      showError(ERROR_MESSAGES.saveFailed())
    }
  }

  return <button onClick={handleSave}>저장</button>
}
```

### 새 메시지 추가

1. `src/lib/notificationMessages.ts`에 메시지 정의:
```typescript
export const SUCCESS_MESSAGES = {
  // 기존 메시지들...

  myNewAction: (): NotificationMessage => ({
    title: '✅ 액션 완료',
    description: '새로운 액션이 완료되었습니다.',
    variant: 'default',
    duration: 3000,
  }),
}
```

2. 컴포넌트에서 사용:
```typescript
import { SUCCESS_MESSAGES } from '@/lib/notificationMessages'
import { showSuccess } from '@/lib/notificationUtils'

showSuccess(SUCCESS_MESSAGES.myNewAction())
```

---

## 체크리스트

알림을 추가하기 전에 확인하세요:

- [ ] **이모지 제거**: 제목에서 이모지 사용하지 않음 (Lucide 아이콘 자동 추가)
- [ ] **적절한 함수 사용**: `showSuccess()`, `showError()`, `showWarning()`, `showInfo()`, `showCelebration()`
- [ ] **존댓말 사용**: ~습니다, ~해주세요
- [ ] **마침표 사용**: 축하 메시지 제외
- [ ] **느낌표 제거**: 축하 메시지만 허용
- [ ] **간결성**: 2줄 이내, 100자 이내
- [ ] **명확성**: 액션과 결과 명시
- [ ] **지속시간 설정**: 일반 3초, 축하 5초
- [ ] **variant 설정**: 오류/경고는 'destructive'

---

## 참고 자료

### 웹 베스트 프랙티스
- **지속시간**: 3-5초 기본, 중요 메시지만 5초
- **메시지 길이**: 최대 2줄, 액션 지향적 표현
- **빈도**: 하루 1개, 주 5개 이하 권장
- **스택 제한**: 최대 3개 동시 표시

### Material Design 가이드라인
- 컨텐츠 우선 설계
- 액션 버튼 최대 3개
- 명확한 계층 구조
- 적절한 색상 사용

### 관련 파일
- `src/hooks/use-toast.ts`: Toast 설정 및 타입 정의
- `src/lib/notificationMessages.ts`: 중앙 메시지 관리
- `src/lib/notificationUtils.tsx`: 유틸리티 함수 (아이콘 자동 추가)
- `src/lib/notificationIcons.tsx`: **[NEW]** Lucide 아이콘 컴포넌트
- `src/lib/notifications.ts`: PWA 알림 관리
- `src/components/ui/toaster.tsx`: Toast UI (아이콘 렌더링 레이아웃)

---

## 변경 이력

### v2.1 (2025-11-11)
- **배경색 정책 통일**: 모든 Toast 알림이 흰색 배경 사용
- **아이콘 색상으로만 구분**: destructive variant도 배경색 동일
- **구현 위치**: `src/components/ui/toast.tsx` 수정
- **이유**: 현대적 디자인, 일관성, 시각적 통일성

### v2.0 (2025-11-11)
- **이모지 → Lucide 아이콘 전환**: 모든 알림에 적용
- **중앙 메시지 관리**: `notificationMessages.ts` 도입
- **유틸리티 함수**: `notificationUtils.tsx` 추가

### v1.0 (초기 버전)
- Toast 알림 기본 구조
- PWA 알림 시스템
- 메시지 작성 규칙

---

**문서 버전**: 2.1
**마지막 업데이트**: 2025-11-11
**작성자**: Notification System Enhancement Project
