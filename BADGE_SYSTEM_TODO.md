# Badge System - Remaining Tasks

## 🔴 Critical (필수)

### 1. 뱃지 자동 평가 시스템 구축
**현재 상황**: 
- 진행률 계산 로직 ✅ 완료
- 진행률 UI 표시 ✅ 완료
- 100% 달성해도 자동으로 뱃지가 획득되지 않음 ❌

**해결 방안**:

#### Option A: 클라이언트 자동 평가 (빠른 구현)
- UserProfileCard 로드 시 조건 체크
- 달성한 뱃지 자동 획득 + XP 지급
- 장점: 빠른 구현 (10분), 서버 부하 없음
- 단점: 사용자 접속 필요

#### Option B: Edge Function (정식 구현)
- `supabase/functions/evaluate-badges/`
- 매일 자동 실행 (cron)
- 모든 사용자 뱃지 조건 평가
- 장점: 정식 구현, 자동 실행
- 단점: 구현 시간 소요 (30분~1시간)

**권장**: A → B 순차 구현

#### 구현 방법 (RPC 함수 - 안전)

```sql
-- Migration: 20251110000002_add_unlock_achievement_function.sql
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id UUID,
  p_achievement_id UUID,
  p_xp_reward INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_already_exists BOOLEAN;
BEGIN
  -- 중복 체크
  SELECT EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO v_already_exists;
  
  IF v_already_exists THEN
    RETURN FALSE;
  END IF;
  
  -- 획득 + XP 지급 (트랜잭션)
  INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
  VALUES (p_user_id, p_achievement_id, NOW());
  
  UPDATE user_levels 
  SET total_xp = total_xp + p_xp_reward
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// 클라이언트 코드 (UserProfileCard.tsx)
const evaluateAndUnlockBadges = async () => {
  for (const badge of lockedBadges) {
    const isAchieved = await evaluateBadgeCondition(userId, badge)
    if (isAchieved) {
      const { data: unlocked } = await supabase.rpc('unlock_achievement', {
        p_user_id: userId,
        p_achievement_id: badge.id,
        p_xp_reward: badge.xp_reward
      })
      if (unlocked) {
        toast.success(`🎉 "${badge.title}" 뱃지 획득! +${badge.xp_reward} XP`)
      }
    }
  }
}
```

**XP 중복 방지**: 
- ✅ UNIQUE 제약 (user_id, achievement_id)
- ✅ RPC 함수 내 트랜잭션
- ✅ 이미 획득 시 false 반환 (XP 지급 안 함)

---

### 2. 월간 뱃지 리셋 로직
**필요 작업**:
- 매월 1일 월간 뱃지 재평가
- `achievement_unlock_history`에 과거 기록 보관
- `user_achievements`에서 이번 달만 표시
- 반복 획득 시 `repeat_xp_multiplier` (50%) 적용

---

## 🟡 Important (중요)

### 3. 뱃지 획득 알림 시스템
- 뱃지 획득 시 토스트 알림
- 새로 획득한 뱃지 표시 (NEW 배지)
- 홈페이지에 최근 획득 뱃지 섹션 (선택)

### 4. 추가 뱃지 디자인
**Phase 2**: 5개 고난이도 뱃지
- `streak_60`: 60일 연속 (1500 XP)
- `checks_1000`: 1000회 실천 (2000 XP)
- `perfect_quarter`: 분기 100% (3000 XP)

**Phase 3**: 2-3개 시크릿 뱃지
- `hint_level='hidden'`
- 특별한 조건 (자정 실천, 모든 요일 균등 등)

---

## 🟢 Optional (선택)

### 5. 시즌/이벤트 뱃지 시스템
- `badge_type='seasonal'` / `'event'`
- `active_from` / `active_until` 자동 활성화/비활성화

### 6. 뱃지 진행률 캐싱
- 현재: 매번 계산
- 개선: `achievement_progress` 테이블 활용

---

## 📊 현재 완료 상태

### ✅ 완료된 작업
- [x] 데이터베이스 마이그레이션 (v2.0)
- [x] 8개 새 뱃지 추가 (3 초급 + 2 중급 + 3 월간)
- [x] TypeScript 타입 시스템
- [x] 뱃지 힌트 시스템 (cryptic/hidden)
- [x] 진행률 계산 로직 (9개 조건 타입)
- [x] BadgeDetailDialog 컴포넌트 (Dialog 패턴)
- [x] UserProfileCard 뱃지 갤러리
- [x] UI 간소화 (카테고리/타입 제거, 진행률 통합)
- [x] 진행률 메시지 로직 수정 (100% 초과 처리)

### 🚧 진행 중
- [ ] 뱃지 자동 평가 시스템

---

**최종 업데이트**: 2025-11-10
**다음 우선순위**: 뱃지 자동 평가 시스템 구현
