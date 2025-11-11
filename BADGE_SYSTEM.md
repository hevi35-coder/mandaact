# 🎯 MandaAct 배지 시스템 설계 문서

## 목적
게임화를 통한 사용자 동기부여 및 지속적인 참여 유도

## 1. 배지 분류 체계

### 1.1 일회성 배지 (One-Time Achievement)
- **특징**: 특별한 마일스톤 달성 시 1회만 획득
- **목적**: 높은 희소성과 자부심 제공
- **등급**: 브론즈 → 실버 → 골드 → 플래티넘

### 1.2 반복 획득 배지 (Recurring Achievement)
- **특징**: 동일 조건 충족 시 중복 획득 가능
- **목적**: 지속적 동기부여 제공
- **주기**: 주간, 월간, 누적 기준

### 1.3 한정판 배지 (Limited Edition)
- **특징**: 특정 기간/이벤트 중에만 획득 가능
- **목적**: FOMO 효과로 참여 유도
- **예시**: 새해, 명절, 계절별 이벤트

### 1.4 히든 배지 (Secret Achievement)
- **특징**: 획득 조건 비공개
- **목적**: 발견의 즐거움 제공
- **힌트**: 최소한의 힌트만 제공

### 1.5 소셜 배지 (Social Achievement)
- **특징**: 커뮤니티 활동 관련
- **목적**: 사용자 간 상호작용 촉진
- **조건**: AI 코칭, 공유 기능 활용

## 2. Phase별 구현 계획

### Phase 1 - 즉시 구현 (우선순위: 높음)
| 배지 키 | 이름 | 아이콘 | 조건 | XP | 카테고리 |
|---------|------|--------|------|-----|----------|
| first_mandalart | 첫 걸음 | 🌱 | 첫 만다라트 생성 | 100 | 일회성 |
| streak_7 | 일주일 전사 | 🔥 | 7일 연속 실천 | 200 | 일회성 |
| streak_30 | 한 달 전사 | 🔥 | 30일 연속 실천 | 500 | 일회성 |
| level_10 | 성장하는 나무 | 📈 | 레벨 10 달성 | 300 | 일회성 |
| monthly_champion | 월간 챔피언 | 🏅 | 월 100% 달성 | 1000 | 반복 |

### Phase 2 - 중기 구현 (우선순위: 중간)
| 배지 키 | 이름 | 아이콘 | 조건 | XP | 카테고리 |
|---------|------|--------|------|-----|----------|
| mandalart_50 | 집중력 | 🎯 | 한 만다라트 50% 완성 | 400 | 일회성 |
| mandalart_100 | 완벽주의자 | 🏆 | 한 만다라트 100% 완성 | 800 | 일회성 |
| checks_100 | 100의 힘 | 💪 | 누적 100회 실천 | 200 | 반복 |
| new_year | 새해의 다짐 | 🎆 | 1월 1-7일 100% 달성 | 1500 | 한정판 |
| ai_coach_100 | 대화의 달인 | 💭 | AI 코칭 100회 | 600 | 소셜 |

### Phase 3 - 장기 구현 (우선순위: 낮음)
| 배지 키 | 이름 | 아이콘 | 조건 | XP | 카테고리 |
|---------|------|--------|------|-----|----------|
| level_50 | 마스터 | 👑 | 레벨 50 달성 | 2000 | 일회성 |
| mandalart_master | 만다라트 마스터 | 🌟 | 3개 만다라트 100% | 3000 | 일회성 |
| streak_100 | 불굴의 의지 | 🔥 | 100일 연속 실천 | 1500 | 일회성 |
| checks_10000 | 만 시간의 법칙 | 🎓 | 10000회 실천 | 5000 | 반복 |
| hidden_rainbow | 무지개 전사 | 🌈 | 7개 색깔 테마 | ? | 히든 |
| hidden_777 | 행운의 777 | 🍀 | 7/77/777일 연속 | ? | 히든 |

## 3. 부정행위 방지 메커니즘

### 3.1 최소 요구사항
```typescript
interface AntiCheatRules {
  minActionsPerMandalart: 16;     // 최소 16개 액션 필요
  minCheckInterval: 60;            // 체크 간 최소 60초 간격
  maxDailyChecks: 50;             // 일일 최대 50회 제한
  minActionTextLength: 5;          // 액션 텍스트 최소 5자
  duplicateTextThreshold: 0.3;    // 중복 텍스트 30% 이하
}
```

### 3.2 검증 로직
1. **만다라트 품질 검증**
   - 실천 항목 16개 이상
   - 각 항목 5자 이상 의미있는 텍스트
   - 중복 텍스트 30% 이하

2. **실천 패턴 분석**
   - 60초 미만 간격 체크 무효
   - 일괄 체크 패턴 감지
   - 비정상적 시간대 대량 체크 모니터링

3. **진정성 점수 (Authenticity Score)**
   ```typescript
   authenticity_score = {
     mandalart_quality: 40,   // 만다라트 충실도
     check_pattern: 30,        // 실천 패턴 자연스러움
     ai_interaction: 20,       // AI 코칭 활용도
     consistency: 10           // 일관성
   }
   ```

### 3.3 페널티 시스템
- **경고**: 첫 위반 시 경고 메시지
- **일시 정지**: 반복 위반 시 24시간 배지 획득 정지
- **배지 회수**: 심각한 위반 시 부정 획득 배지 회수

## 4. 데이터베이스 스키마 변경사항

### 4.1 achievements 테이블 확장
```sql
ALTER TABLE achievements
ADD COLUMN category VARCHAR(20) DEFAULT 'one_time'
  CHECK (category IN ('one_time', 'recurring', 'limited', 'hidden', 'social')),
ADD COLUMN tier VARCHAR(20) DEFAULT 'bronze'
  CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN valid_from TIMESTAMP,
ADD COLUMN valid_until TIMESTAMP,
ADD COLUMN anti_cheat_rules JSONB,
ADD COLUMN max_count INTEGER DEFAULT 1;
```

### 4.2 user_achievements 테이블 확장
```sql
ALTER TABLE user_achievements
ADD COLUMN count INTEGER DEFAULT 1,
ADD COLUMN authenticity_score INTEGER DEFAULT 100,
ADD COLUMN is_verified BOOLEAN DEFAULT TRUE;
```

### 4.3 새로운 테이블: badge_validation_logs
```sql
CREATE TABLE badge_validation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  badge_key VARCHAR(50),
  validation_type VARCHAR(20),
  passed BOOLEAN,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 5. 구현 우선순위

### 즉시 작업 (Sprint 1)
1. ✅ 문서 작성 (BADGE_SYSTEM.md)
2. 🔄 DB 스키마 업데이트
3. 🔄 Phase 1 배지 5개 데이터 추가
4. 🔄 부정행위 방지 기본 로직
5. 🔄 UI 카테고리별 표시

### 다음 작업 (Sprint 2)
1. Phase 2 배지 구현
2. 진정성 점수 시스템
3. 배지 상세 페이지 개선
4. 통계 대시보드 연동

### 향후 작업 (Sprint 3+)
1. 히든 배지 로직
2. 한정판 배지 스케줄러
3. 소셜 기능 연계
4. 배지 공유 기능

## 6. 성공 지표 (KPI)

### 단기 (1개월)
- DAU 20% 증가
- 평균 세션 시간 15% 증가
- 7일 리텐션 30% 개선

### 중기 (3개월)
- MAU 50% 증가
- 평균 완료율 25% 개선
- 30일 리텐션 40% 개선

### 장기 (6개월)
- 유료 전환율 10% 달성
- NPS 스코어 60+ 달성
- 바이럴 계수 1.2 달성

## 7. 참고 자료
- [Gamification Best Practices 2024](https://www.scavify.com/gamification/gamification-badges)
- [Habit Tracker Badge Systems](https://help.trainerize.com/hc/en-us/articles/360042304131)
- [Duolingo Badge System Analysis](https://trophy.so/blog/badges-feature-gamification-examples)

---
*최종 업데이트: 2024-11-11*
*작성자: MandaAct Development Team*