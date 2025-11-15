# 삭제 권장 문서 목록

**작성일**: 2025-11-15
**상태**: 검토 대기 중

---

## ⚠️ 삭제 전 확인 필요

아래 문서들은 **중복**, **구버전**, 또는 **완료된 계획**으로 더 이상 유효하지 않을 가능성이 있습니다.
삭제하기 전에 각 문서의 내용을 확인하고 최종 결정해주세요.

---

## 1. 우선순위: 높음 (중복/구버전)

### Badge 시스템 구버전 (5개)

| 파일명 | 버전 | 작성일 | 사유 | 최신 버전 |
|--------|------|--------|------|-----------|
| `deprecated/BADGE_SYSTEM.md` | v1.0 | 2024-11-11 | 초기 설계 문서 | ✅ v5.0 (BADGE_SYSTEM_V5_RENEWAL.md) |
| `deprecated/BADGE_SYSTEM_COMPLETE.md` | v2.0 | 2025-11-10 | v2.0 구현 완료 | ✅ v5.0 |
| `deprecated/BADGE_SYSTEM_FINAL.md` | v4.0 | 2025-11-12 | v4.0 최종 명세 | ✅ v5.0 |
| `deprecated/BADGE_SYSTEM_TODO.md` | - | 2025-11-10 | TODO 추적 (완료됨) | ✅ 작업 완료 |
| `deprecated/BADGE_ANTI_CHEAT_SYSTEM.md` | - | 2025-11-10 | 부정방지 시스템 | ✅ v5.0에 통합됨 |

**권장 조치**: 전체 삭제 (v5.0이 최신이며 모든 내용 포함)

---

## 2. 우선순위: 중간 (완료된 계획)

### 계획 문서 (3개)

| 파일명 | 상태 | 최신 문서 | 권장 조치 |
|--------|------|----------|----------|
| `deprecated/NOTIFICATION_SYSTEM_PLAN.md` | 계획 단계 | ✅ NOTIFICATION_SYSTEM_PROGRESS.md | 삭제 권장 |
| `deprecated/ANIMATION_PLAN.md` | 계획 단계 | ✅ ANIMATION_GUIDE.md | 삭제 권장 |
| `deprecated/TEST_RESULTS.md` | 일회성 테스트 | - | 삭제 권장 |

**권장 조치**: 계획 문서는 구현 완료 시 삭제, 테스트 결과는 1회성이므로 삭제

---

## 3. 우선순위: 낮음 (세션 기록)

### 오래된 세션 기록 (3개)

| 파일명 | 날짜 | 통합 여부 | 권장 조치 |
|--------|------|----------|----------|
| `sessions/SESSION_2025-11-06.md` | 11-06 | ✅ SESSION_SUMMARY.md에 통합 | 보관 또는 삭제 |
| `sessions/SESSION_2025-11-07.md` | 11-07 | ✅ SESSION_SUMMARY.md에 통합 | 보관 또는 삭제 |
| `sessions/SESSION_2025-11-14.md` | 11-14 | ✅ SESSION_SUMMARY.md에 통합 | **최신 - 보관 권장** |

**권장 조치**:
- 최근 1개월(11-14) 세션은 보관
- 오래된 세션(11-06, 11-07)은 선택적 삭제

---

## 4. 완료된 기능 문서 (보관 권장)

아래 문서들은 `archive/completed/`에 보관되어 있으며, **프로젝트 이력 추적용**으로 **보관 권장**합니다:

- AI_REPORT_IMPROVEMENTS.md
- AI_REPORT_IMPROVEMENT_PLAN.md
- AI_REPORT_PHASE1_SUMMARY.md
- AI_REPORT_PHASE1B_SUMMARY.md
- AI_REPORT_PHASE1C_SUMMARY.md
- BADGE_EXPANSION_COMPLETE.md
- EXTERNAL_SERVICES_COMPLETE.md
- IMAGE_DOWNLOAD_IMPROVEMENT.md
- MANDALART_DELETION_COMPLETE.md
- NOTIFICATION_TEST_SCENARIOS.md
- PHASE_1A_STATUS.md
- PHASE_4B_SETUP.md
- PROJECT_SETUP_COMPLETE.md

**권장 조치**: 보관 (Git 히스토리 추적 및 참고용)

---

## 📊 삭제 권장 요약

| 카테고리 | 파일 수 | 권장 조치 |
|---------|--------|----------|
| Badge 구버전 | 5개 | ✅ 전체 삭제 |
| 완료된 계획 | 3개 | ✅ 전체 삭제 |
| 오래된 세션 | 2개 | ⚠️ 선택적 삭제 |
| 최신 세션 | 1개 | 💾 보관 |
| 완료된 기능 | 13개 | 💾 보관 |

**총 삭제 권장**: **10개** (Badge 5개 + 계획 3개 + 오래된 세션 2개)

---

## 🚀 삭제 실행 명령어 (확인 후 실행)

### 1단계: 고위험 중복 파일 삭제
```bash
# Badge 구버전 삭제
git rm docs/archive/deprecated/BADGE_SYSTEM.md
git rm docs/archive/deprecated/BADGE_SYSTEM_COMPLETE.md
git rm docs/archive/deprecated/BADGE_SYSTEM_FINAL.md
git rm docs/archive/deprecated/BADGE_SYSTEM_TODO.md
git rm docs/archive/deprecated/BADGE_ANTI_CHEAT_SYSTEM.md
```

### 2단계: 완료된 계획 문서 삭제
```bash
git rm docs/archive/deprecated/NOTIFICATION_SYSTEM_PLAN.md
git rm docs/archive/deprecated/ANIMATION_PLAN.md
git rm docs/archive/deprecated/TEST_RESULTS.md
```

### 3단계 (선택): 오래된 세션 삭제
```bash
# 선택적으로 삭제 (이력이 필요하면 보관)
git rm docs/archive/sessions/SESSION_2025-11-06.md
git rm docs/archive/sessions/SESSION_2025-11-07.md
```

---

## ✅ 최종 확인사항

삭제 전에 다음을 확인하세요:

1. [ ] 삭제할 파일이 다른 문서에서 참조되지 않는지 확인
2. [ ] 최신 버전에 모든 중요 정보가 포함되어 있는지 확인
3. [ ] Git 커밋 히스토리에서 언제든 복구 가능함을 이해
4. [ ] 팀원들과 삭제에 대해 합의

---

**작성자**: Documentation Cleanup Task
**검토 필요**: 프로젝트 관리자
