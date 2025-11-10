# 알림 시스템 개선 작업 - 진행 상황

**작업 시작**: 2025-11-10
**마지막 업데이트**: 2025-11-10
**진행률**: 33% (2/6 Phase 완료)

---

## 📊 전체 로드맵

### ✅ Phase 1: 알림 시스템 기반 작업 (완료)
**소요 시간**: 30분
**상태**: ✅ 커밋 완료 (e43412a)

#### 완료 사항
1. **Toast 설정 표준화** (`src/hooks/use-toast.ts`)
   - TOAST_LIMIT: 1 → 3 (최대 3개 스택, Material Design 가이드라인)
   - TOAST_REMOVE_DELAY: 1000000ms → 5000ms (5초 자동 해제, UX 베스트 프랙티스)

2. **중앙화된 메시지 관리** (`src/lib/notificationMessages.ts`)
   - 60+ 표준화된 메시지
   - 카테고리: validation, success, error, achievement, permission, download
   - 통일된 스타일:
     - 이모지: ✅ 성공, ❌ 에러, ⚠️ 경고, ℹ️ 정보, 🎉 축하
     - 어투: 존댓말 통일 (~습니다, ~해주세요)
     - 문장부호: 축하 메시지만 느낌표, 나머지 마침표
     - 지속시간: 일반 3초, 중요/축하 5초

3. **유틸리티 함수** (`src/lib/notificationUtils.ts`)
   - showSuccess(), showError(), showWarning(), showInfo(), showCelebration()
   - 일관된 사용 패턴 보장

---

### ✅ Phase 2: Alert → Toast 전환 (완료)
**소요 시간**: 1시간
**상태**: ✅ 커밋 완료 (e43412a)

#### 전환 완료 파일 (23개 alert)

| 파일 | Alert 개수 | 상태 |
|------|-----------|------|
| CoreGoalEditModal.tsx | 7 | ✅ 완료 |
| SubGoalEditModal.tsx | 8 | ✅ 완료 |
| SubGoalCreateModal.tsx | 2 | ✅ 완료 |
| ActionTypeSelector.tsx | 1 | ✅ 완료 |
| MandalartListPage.tsx | 1 | ✅ 완료 |
| MandalartDetailPage.tsx | 1 | ✅ 완료 |
| TodayChecklistPage.tsx | 2 | ✅ 완료 |
| MandalartListPage.tsx | 1 (주석) | - |

#### 영향
- ✅ 23개 blocking alert 제거 → 비차단 Toast로 전환
- ✅ 일관된 UX 및 더 나은 에러 컨텍스트
- ✅ 자동 해제로 사용자 부담 감소

---

## 🔄 남은 작업

### ⏸️ Phase 3: 일관성 개선 (다음 작업)
**예상 시간**: 1-1.5시간

#### 3.1 기존 Toast 메시지 표준화
**대상**: 18개 기존 Toast 사용처

**작업 내용**:
1. **NotificationSettingsPage** (7개 toast)
   - 이모지 접두사 유지 (✅❌⚠️)
   - 메시지 간결화
   - 지속시간 조정 (기본 3초)

2. **MandalartDetailPage** (8개 toast)
   - 이모지 추가 (현재 없음)
   - 기술 상세 정보 간결화
   - 일관된 어투 적용

3. **TodayChecklistPage** (1개 toast)
   - Perfect Day 메시지: 이미 표준화됨
   - 지속시간 5초 유지 (축하 메시지)

4. **UserProfileCard** (2개 toast)
   - Badge unlock 메시지: 이미 표준화됨
   - 지속시간 5초 유지 (축하 메시지)

**적용 규칙**:
```typescript
// Before (NotificationSettingsPage:88-91)
toast({
  title: "✅ 알림 권한 허용",
  description: "알림 권한이 허용되었습니다!",
})

// After
toast({
  title: "✅ 권한 허용",
  description: "알림을 받으실 수 있습니다.",
  duration: 3000
})
```

#### 3.2 누락된 피드백 추가
**대상**: 현재 무음 처리된 성공 작업들

1. **TodayChecklistPage** (타입 변경 성공 시)
   ```typescript
   showSuccess(SUCCESS_MESSAGES.typeUpdated())
   ```

2. **CoreGoalEditModal** (인라인 수정 성공 시)
   ```typescript
   showSuccess(SUCCESS_MESSAGES.updated())
   ```

3. **SubGoalEditModal** (제목/타입 수정 성공 시)
   ```typescript
   showSuccess(SUCCESS_MESSAGES.updated())
   ```

4. **UserProfileCard** (닉네임 변경 성공 시)
   ```typescript
   showSuccess(SUCCESS_MESSAGES.nicknameUpdated())
   ```

**완료 조건**:
- [ ] 모든 Toast 메시지 이모지 통일
- [ ] 지속시간 표준화 (일반 3초, 축하 5초)
- [ ] 4개 누락 피드백 추가
- [ ] Type check 통과

---

### ⏸️ Phase 4: Confirm/Prompt 개선 (대기)
**예상 시간**: 1시간

#### 4.1 Prompt → Dialog 전환
**파일**: `MandalartDetailPage.tsx:302`

**현재 문제**:
- `prompt()` 사용 (복잡한 다중 옵션)
- 텍스트 입력 기반 (오타 가능성)
- 시각적으로 명확하지 않음

**개선 방안**:
```typescript
// AlertDialog 컴포넌트 사용
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>만다라트 삭제</AlertDialogTitle>
      <AlertDialogDescription>
        {/* 현재 prompt 메시지 내용 */}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <Button variant="outline" onClick={handleDeactivate}>
        비활성화
      </Button>
      <AlertDialogAction variant="destructive" onClick={handleDelete}>
        영구 삭제
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### 4.2 Confirm 메시지 개선
**대상**: 5개 confirm 사용처

**통일 규칙**:
- 제목: 액션 명확히 (예: "실천항목 삭제")
- 본문: 결과 설명 + 데이터 영향
- 버튼: "삭제" (destructive), "취소" (outline)

**완료 조건**:
- [ ] MandalartDetailPage Prompt → AlertDialog 전환
- [ ] 5개 Confirm 메시지 표준화
- [ ] Type check 통과

---

### ⏸️ Phase 5: PWA 알림 개선 (대기)
**예상 시간**: 1시간

#### 5.1 메시지 개선
**파일**: `src/lib/notifications.ts`

**변경 사항**:
1. **테스트 알림** (Line 55-60)
   ```typescript
   // Before
   body: '알림이 정상적으로 작동합니다! 🎉'

   // After
   body: '알림 테스트에 성공했습니다.'
   ```

2. **아이콘 업데이트**
   ```typescript
   // Before
   icon: 'vite.svg'

   // After
   icon: '/pwa-192x192.png'  // manifest 아이콘 사용
   ```

3. **일일 리마인더** (3개 패턴 유지, 메시지 다듬기)
   - 현재 메시지 검토 후 간결화
   - 어투 통일

#### 5.2 스케줄링 안내 개선
**현재 한계**: `setTimeout` 기반 → 앱 종료 시 작동 안 함

**단기 개선**:
- NotificationSettingsPage에 명확한 안내 추가
- "알림을 받으려면 앱을 백그라운드에서 유지해주세요"

**장기 개선 (Phase 6 이후)**:
- Supabase Edge Functions + Cron 기반 백엔드 스케줄링
- 별도 프로젝트로 계획

**완료 조건**:
- [ ] 테스트 알림 메시지 간결화
- [ ] 아이콘 manifest 아이콘으로 변경
- [ ] 일일 리마인더 3개 패턴 개선
- [ ] 스케줄링 한계 안내 추가

---

### ⏸️ Phase 6: 문서화 및 테스트 (대기)
**예상 시간**: 0.5시간

#### 6.1 알림 가이드 작성
**파일**: `docs/NOTIFICATION_GUIDELINES.md` (신규)

**내용**:
- 알림 유형별 사용 시점
- 메시지 작성 규칙
- 지속시간 기준
- 코드 예시

#### 6.2 품질 검증
```bash
npm run type-check  # TypeScript 타입 체크
npm run build       # 프로덕션 빌드
```

**완료 조건**:
- [ ] NOTIFICATION_GUIDELINES.md 작성
- [ ] Type check 통과
- [ ] Production build 성공

---

## 🎯 다음 세션 시작 방법

### 1. 진행 상황 확인
```bash
cd /Users/jhsy/mandaact
git log --oneline -5  # 최근 커밋 확인
git status            # 작업 상태 확인
```

### 2. Phase 3 시작
```bash
# 개발 서버 실행
npm run dev

# Phase 3 작업 파일 확인
cat NOTIFICATION_SYSTEM_PROGRESS.md
```

### 3. Phase 3 작업 순서
1. **NotificationSettingsPage.tsx** 표준화 (7개 toast)
2. **MandalartDetailPage.tsx** 표준화 (8개 toast)
3. 누락 피드백 4개 추가
4. Type check 및 커밋

---

## 📈 진행 통계

### 완료된 작업
- ✅ Alert 제거: 23개 → 0개 (100%)
- ✅ 중앙 메시지 관리: 60+ 메시지
- ✅ Toast 설정 최적화: 3개 스택, 5초 자동 해제

### 남은 작업
- ⏸️ Toast 표준화: 18개 대기
- ⏸️ 누락 피드백: 4개 추가 필요
- ⏸️ Confirm/Prompt 개선: 6개 대기
- ⏸️ PWA 알림: 4개 메시지 개선

### 예상 완료 시간
- **완료**: 1.5시간
- **남은 시간**: 4-5시간
- **전체**: 6-7시간 (예상대로 진행 중)

---

## 🔗 관련 커밋

- **e43412a**: feat: Notification system overhaul - Phase 1 & 2
  - Toast 설정 표준화
  - 중앙 메시지 관리 시스템
  - 23개 Alert → Toast 전환

---

## 📝 참고 자료

### 웹 리서치 결과 (베스트 프랙티스)
- **지속시간**: 3-5초 기본, 중요 메시지만 영구
- **메시지 길이**: 최대 2줄, 액션 지향적 표현
- **빈도**: 하루 1개, 주 5개 이하 권장
- **스택 제한**: 최대 3개 동시 표시
- **Material Design**: 컨텐츠 우선, 액션 최대 3개

### 설계 원칙
1. **일관성**: 모든 알림 동일한 패턴
2. **명확성**: 액션과 결과 명시
3. **간결성**: 2줄 이내, 핵심 정보만
4. **친절함**: 존댓말, 긍정적 표현
5. **시각성**: 이모지로 즉각 인지

---

**문서 파일명**: `NOTIFICATION_SYSTEM_PROGRESS.md`
**위치**: 프로젝트 루트
