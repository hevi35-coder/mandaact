# MandaAct 배지 시스템 최종 명세

**작성일**: 2025-11-12
**버전**: v4.0 (Badge Consolidation)
**상태**: 프로덕션 배포 완료

---

## 📊 시스템 현황

### 배지 통계
- **총 배지 수**: 34개 (DB 저장)
- **활성 배지**: 25개 (UI 표시)
- **비활성 배지**: 9개 (Phase 2 구현 예정)

### 최근 변경사항 (2025-11-12)
✅ 중복 배지 5개 삭제 (`checks_100`, `checks_1000`, `perfect_month`, `perfect_day`, `checks_100_v2`)
✅ 미구현 배지 9개 비활성화 (RPC 함수 미구현)
✅ `midnight_warrior` 시간 범위 확대 (00:00-00:59 → 23:00-01:00)
✅ Streak 배지 설명 명확화
✅ 스키마 v2→v4 통합 완료

---

## 🏆 활성 배지 목록 (25개)

### A. 스트릭 배지 (7개)

| Key | 타이틀 | 아이콘 | XP | 티어 | 조건 |
|-----|--------|--------|-----|------|------|
| `streak_3` | 3일의 기적 | 🔥 | 50 | Bronze | 3일 연속 |
| `streak_7` | 일주일 불씨 | 🔥 | 100 | Silver | 7일 연속 |
| `streak_14` | 2주 열정 | 🔥 | 200 | Silver | 14일 연속 |
| `streak_30` | 한 달 열정 | 🔥 | 500 | Gold | 30일 연속 (언제든) |
| `streak_60` | 두 달의 열정 | 🔥 | 1500 | Gold | 60일 연속 |
| `streak_100` | 백일장 | 🔥 | 2000 | Platinum | 100일 연속 |
| `streak_150` | 불꽃의 제왕 | 🔥 | 3500 | Platinum | 150일 연속 |

**특징**: 일관된 난이도 증가, 명확한 목표 설정

---

### B. 볼륨 배지 - Recurring (7개)

| Key | 타이틀 | 아이콘 | XP | 티어 | 조건 | 반복 |
|-----|--------|--------|-----|------|------|------|
| `checks_50` | 오십보백보 | 💯 | 100 | Silver | 50회 | ❌ |
| `checks_100` | 백발백중 | 💯 | 200 | Gold | 100회 | ✅ |
| `checks_250` | 이백오십 | 💯 | 400 | Silver | 250회 | ❌ |
| `checks_500` | 오백나한 | 💯 | 1000 | Gold | 500회 | ❌ |
| `checks_1000` | 천수천안 | 💯 | 3000 | Platinum | 1000회 | ✅ |
| `checks_2500` | 이천오백의 탑 | 💯 | 3500 | Platinum | 2500회 | ❌ |
| `checks_5000` | 만 번의 수련 (반) | 💯 | 5000 | Platinum | 5000회 | ❌ |

**특징**: 100회/1000회 반복 획득 가능 (동기부여 강화)

---

### C. 완료율 배지 (2개)

| Key | 타이틀 | 아이콘 | XP | 티어 | 조건 |
|-----|--------|--------|-----|------|------|
| `perfect_day` | Perfect Day | ⭐ | 50 | Gold | 하루 100% 달성 (반복) |
| `level_10` | 성장하는 나무 | 📈 | 300 | Silver | 레벨 10 도달 |

---

### D. 월간 챌린지 배지 - Repeatable (4개)

| Key | 타이틀 | 아이콘 | XP | 조건 | Repeat XP |
|-----|--------|--------|-----|------|-----------|
| `monthly_90_percent` | 이달의 MVP | 🏆 | 800 | 월 90%+ 완료 | 50% (400 XP) |
| `monthly_perfect_week` | 주간 챔피언 | ⭐ | 500 | 월내 완벽주 달성 | 50% (250 XP) |
| `monthly_streak_30` | 월간 연속 달성 | 🔥 | 600 | 매달 30일 연속 도전 | 50% (300 XP) |
| `monthly_champion` | 월간 챔피언 | 🏅 | 1000 | 월 100% 완료 | ❌ |

**특징**:
- 매월 1일 자동 리셋 (Edge Function + Cron)
- 반복 획득 시 50% XP (첫 획득 제외)
- 월간 챔피언은 최고 난이도 (100% 완료)

---

### E. 시크릿 배지 (3개)

| Key | 타이틀 (잠금) | 아이콘 | XP | Hint Level | 해제 조건 |
|-----|--------------|--------|-----|------------|----------|
| `midnight_warrior` | ??? | 🌙 | 500 | Hidden | 밤 11시-새벽 1시 (23:00-01:00) 30회 체크 |
| `mandalart_rainbow` | 무지개 실천 | 🌈 | 600 | Cryptic | 7일간 매일 3개+ 만다라트 체크 |
| `night_owl` | 올빼미의 습관 | 🦉 | 400 | Cryptic | 밤 10시-자정 (22:00-24:00) 50회 체크 |

**특징**:
- Hidden: 타이틀/설명 완전 비공개 (해제 전 "???")
- Cryptic: 힌트만 제공 ("여러 색깔의 목표를...")

---

### F. 마일스톤 배지 (2개)

| Key | 타이틀 | 아이콘 | XP | 조건 | Anti-Cheat |
|-----|--------|--------|-----|------|------------|
| `first_check` | 첫걸음 | 👣 | 25 | 첫 체크 | ❌ |
| `first_mandalart` | 첫 걸음 | 🌱 | 100 | 첫 만다라트 생성 | ✅ (16 actions, 5+ chars) |

---

## 🔒 비활성 배지 목록 (9개)

| Key | 사유 | Phase 2 우선순위 |
|-----|------|------------------|
| `first_perfect_day` | RPC 미지원 | 높음 |
| `perfect_week_3` | RPC 미지원 | 중간 |
| `balanced_goals` | RPC 미지원 | 높음 |
| `early_bird` | RPC 미지원 | 중간 |
| `weekend_warrior` | RPC 미지원 | 중간 |
| `mandalart_50` | RPC 미지원 | 낮음 |
| `mandalart_100` | RPC 미지원 | 낮음 |
| `new_year_2025` | 이벤트 종료 | 제거 예정 |
| `monthly_perfect_3` | 난이도 과다 | 제거 예정 |

**Phase 2 계획**: RPC 함수 `evaluate_badge_progress()` 확장 (9개 condition type 추가)

---

## 🛡️ 부정방지 시스템

### 적용 배지
- **`first_mandalart`**: minActionsPerMandalart=16, minActionTextLength=5
- **`monthly_champion`**: minActionsPerMandalart=16, minCheckInterval=60s, maxDailyChecks=50

### 검증 규칙
1. **Rule 1**: 최소 16개 실천 항목 (5자 이상)
2. **Rule 2**: 체크 간격 60초 이상 (5회 급속 체크 허용)
3. **Rule 3**: 일일 최대 50회 체크 (미구현)

자세한 내용: `BADGE_ANTI_CHEAT_SYSTEM.md` 참조

---

## 📊 카테고리 시스템 (v4)

### 정의
- **`one_time`**: 영구 배지 (1회 획득)
- **`recurring`**: 반복 가능 배지
- **`limited`**: 기간 한정 배지
- **`hidden`**: 시크릿 배지
- **`social`**: 소셜 배지 (미사용)

### 티어 시스템
- **Bronze**: 입문 (25-100 XP)
- **Silver**: 중급 (100-400 XP)
- **Gold**: 고급 (400-1500 XP)
- **Platinum**: 최고급 (1500-5000 XP)

---

## 🔧 기술 구현

### RPC 함수: `evaluate_badge_progress()`

**지원하는 Condition Types (9개)**:
1. `total_checks` - 총 체크 횟수
2. `streak` - 연속 일수
3. `monthly_completion` - 월간 완료율
4. `monthly_streak` - 월간 연속 일수
5. `perfect_week_in_month` - 월내 완벽주
6. `perfect_month_count` - 완벽월 횟수
7. `midnight_checks` - 자정 체크 횟수
8. `balanced_mandalart_week` - 균형 주간
9. `time_range_checks` - 시간대 체크

### 자동 해제 시스템
- **Trigger-based**: `first_check`, `first_mandalart`, `level_10`
- **RPC-based**: 모든 streak/volume/completion 배지
- **Manual**: `monthly_champion` (함수 직접 호출)

### 월간 리셋 시스템
- **Edge Function**: `reset-monthly-badges`
- **Cron**: 매월 1일 00:00 UTC
- **처리**: 해제 취소 + 히스토리 보존

---

## 📈 XP 보상 체계

### 난이도별 XP 범위
- **입문 (Bronze)**: 25-100 XP
- **중급 (Silver)**: 100-400 XP
- **고급 (Gold)**: 400-1500 XP
- **최고급 (Platinum)**: 1500-5000 XP

### 반복 획득 보상
- **첫 획득**: 100% XP
- **반복 획득**: 50% XP (월간 챌린지만 해당)

### 총 획득 가능 XP
- **일회성 배지**: ~30,000 XP
- **월간 배지 (1년)**: ~18,000 XP
- **반복 배지**: 무제한

---

## 🚀 로드맵

### Phase 2 (Q1 2025)
- [ ] 미구현 condition type 9개 개발
- [ ] 비활성 배지 7개 활성화
- [ ] UI 필터링 (is_active = TRUE만 표시)
- [ ] 배지 진행도 표시 UI

### Phase 3 (Q2 2025)
- [ ] 소셜 배지 카테고리 활성화
- [ ] 배지 컬렉션 통계 페이지
- [ ] 배지 공유 기능

---

## 📚 관련 문서

- `BADGE_ANTI_CHEAT_SYSTEM.md` - 부정방지 시스템 상세
- `XP_SYSTEM_PHASE2_COMPLETE.md` - XP 시스템 문서
- `supabase/migrations/20251112000004_badge_system_consolidation.sql` - 통합 마이그레이션

---

## 📝 변경 이력

### v4.0 (2025-11-12) - Badge Consolidation
- 중복 배지 5개 삭제
- 미구현 배지 9개 비활성화
- midnight_warrior 시간 확대 (23:00-01:00)
- Streak 배지 설명 명확화
- 스키마 v2→v4 통합

### v3.0 (2025-11-10) - Advanced Badges
- 고급 배지 8개 추가
- 시크릿 배지 3개 추가
- RPC 함수 condition type 9개 지원

### v2.0 (2025-11-10) - System Improvements
- 월간 리셋 시스템 구현
- 반복 배지 지원
- 부정방지 시스템 통합

### v1.0 (2025-11-08) - Initial Release
- 기본 배지 12개 출시
- Gamification 테이블 구조 정의
