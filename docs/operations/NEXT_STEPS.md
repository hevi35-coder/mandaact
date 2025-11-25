# 다음 단계 - Phase 8 완료 후 남은 작업

**작성일**: 2025-11-25
**현재 상태**: Phase 8.1 완료 (90%)
**예상 소요 시간**: 1-2시간

---

## 📊 현재 완료 상태

### ✅ Phase 8.1 완료 (90%)

**완료된 작업**:
- ✅ PostHog 설치 및 통합
- ✅ Sentry 설치 및 통합
- ✅ 핵심 이벤트 4개 추적 통합
  - 만다라트 생성
  - 액션 체크
  - 배지 획득
  - 튜토리얼 완료
- ✅ GitHub Actions CI/CD 파이프라인
- ✅ 백업 & 복구 전략 문서화
- ✅ 환경변수 설정 완료

---

## 🎯 즉시 가능한 작업 (Quick Wins)

### 1. PostHog 대시보드 인사이트 생성 (10분) 🔴 **추천**

**목적**: 데이터 시각화 및 분석 준비

**작업 순서**:
1. PostHog 대시보드 접속: https://app.posthog.com
2. 좌측 메뉴에서 "Insights" → "New Insight" 클릭
3. 아래 6가지 인사이트 생성:

#### Insight 1: 일일 활성 사용자 (DAU)
```
Insight Type: Trends
Event: $pageview
Aggregation: Unique users
Interval: Daily
```

#### Insight 2: 만다라트 생성 방법 분포
```
Insight Type: Trends
Event: mandalart_created
Breakdown by: input_method
Chart: Pie chart
```

#### Insight 3: 액션 타입별 체크 비율
```
Insight Type: Trends
Event: action_checked
Breakdown by: action_type
Chart: Bar chart
```

#### Insight 4: 시간대별 체크 패턴
```
Insight Type: Trends
Event: action_checked
Breakdown by: hour (property)
Chart: Line chart
Interval: Hourly
```

#### Insight 5: 배지 획득 TOP 10
```
Insight Type: Trends
Event: badge_unlocked
Breakdown by: badge_title
Chart: Bar chart
Limit: Top 10
```

#### Insight 6: 튜토리얼 완료율 Funnel
```
Insight Type: Funnel
Steps:
  1. User signed up
  2. tutorial_completed (where skipped=false)
```

**예상 효과**:
- 사용자 행동 패턴 파악
- 기능별 사용률 측정
- 데이터 기반 의사결정 가능

---

### 2. 실제 사용 시나리오 테스트 (20분) 🟡

**목적**: 이벤트 추적 정상 작동 확인

**테스트 시나리오**:

#### Step 1: 새 계정 생성 (5분)
```bash
# 1. http://localhost:5173 접속
# 2. 새 이메일로 회원가입
# 3. PostHog Live Events 확인 (페이지뷰 추적 확인)
```

#### Step 2: 튜토리얼 완료 (3분)
```bash
# 1. 튜토리얼 시작
# 2. 7단계 모두 진행
# 3. "만다라트 만들기" 클릭
# 4. PostHog에서 `tutorial_completed` 이벤트 확인
#    - completed_steps: 7
#    - total_steps: 7
#    - time_spent_seconds: ~180
#    - skipped: false
```

#### Step 3: 만다라트 생성 - 3가지 방법 테스트 (10분)

**방법 1: 수동 입력**
```bash
# 1. "직접 입력" 선택
# 2. 만다라트 작성 (샘플 데이터)
# 3. 저장
# 4. PostHog에서 `mandalart_created` 확인
#    - input_method: "manual"
#    - sub_goals_count: 8
#    - actions_count: 64
```

**방법 2: 텍스트 파싱** (선택)
```bash
# 1. "텍스트 붙여넣기" 선택
# 2. 샘플 텍스트 붙여넣기
# 3. 저장
# 4. PostHog에서 input_method: "text" 확인
```

**방법 3: 이미지 OCR** (선택)
```bash
# 1. "이미지 업로드" 선택
# 2. 샘플 이미지 업로드
# 3. 저장
# 4. PostHog에서 input_method: "image" 확인
```

#### Step 4: 액션 체크 (2분)
```bash
# 1. "오늘의 실천" 페이지 접속
# 2. 액션 3개 체크
# 3. PostHog에서 `action_checked` 이벤트 확인 (3개)
#    - action_type: routine / mission / reference
#    - hour: 현재 시간대
#    - day_of_week: 0-6
```

#### Step 5: PostHog Live Events 확인
```bash
# PostHog → Events → Live 탭
# 최근 이벤트 확인:
# - mandalart_created (1-3개)
# - action_checked (3개)
# - tutorial_completed (1개)
# - $pageview (여러 개)
```

**예상 결과**:
- 모든 이벤트가 PostHog Live Events에 실시간 표시됨
- 이벤트 속성(properties)이 정확히 추적됨

---

### 3. Vercel 프로덕션 재배포 (5분) 🟡

**목적**: 프로덕션 환경에서 모니터링 활성화

**작업 순서**:

#### Step 1: Vercel Dashboard 접속
```bash
https://vercel.com
→ mandaact 프로젝트 선택
```

#### Step 2: 환경변수 확인
```bash
Settings → Environment Variables

확인 항목:
- VITE_POSTHOG_KEY: phc_xxx (설정됨)
- VITE_POSTHOG_HOST: https://app.posthog.com (설정됨)
- VITE_SENTRY_DSN: https://xxx@o123... (설정됨)
```

#### Step 3: 재배포
```bash
Deployments → 최신 배포 → "..." 메뉴 → "Redeploy"
또는
main 브랜치에 푸시하면 자동 배포
```

#### Step 4: 프로덕션 테스트
```bash
# 1. 배포 완료 대기 (2-3분)
# 2. 프로덕션 URL 접속 (예: https://mandaact.vercel.app)
# 3. 개발자 도구 (F12) → Console
# 4. PostHog 로드 확인:
console.log(window.posthog) // PostHog 객체 출력 확인

# 5. Sentry 로드 확인:
console.log(window.Sentry) // Sentry 객체 출력 확인 (프로덕션만)

# 6. 간단한 액션 수행 (로그인, 페이지 이동)
# 7. PostHog Live Events에서 프로덕션 이벤트 확인
```

**예상 결과**:
- PostHog: 개발/프로덕션 모두 작동
- Sentry: 프로덕션만 작동 (개발 환경 비활성화)
- 프로덕션 이벤트가 PostHog에 실시간 전송됨

---

## 🔧 선택적 작업 (Optional)

### 4. Sentry 알림 규칙 설정 (10분)

**목적**: 에러 발생 시 실시간 알림

**작업 순서**:
1. Sentry Dashboard 접속: https://sentry.io
2. Project: mandaact → Settings → Alerts
3. "Create New Alert Rule" 클릭
4. 조건 설정:
   ```
   Alert Name: 새로운 에러 발생
   Conditions:
   - When: An issue is first seen
   - Environment: production
   ```
5. 알림 채널 설정:
   - Email: 본인 이메일
   - Slack (선택): 워크스페이스 연동
6. "Save Rule" 클릭

**추가 알림 규칙** (선택):
```
Alert Name: 에러 빈도 급증
Conditions:
- When: An issue's frequency increases by more than 50% in 1 hour
- Environment: production
```

---

### 5. GitHub Actions 테스트 (15분)

**목적**: CI/CD 파이프라인 정상 작동 확인

**작업 순서**:

#### Step 1: 새 브랜치 생성
```bash
git checkout -b test/ci-pipeline
```

#### Step 2: 간단한 변경사항 커밋
```bash
# 예시: README.md 수정
echo "\n## Test CI Pipeline" >> README.md

git add README.md
git commit -m "test: Verify GitHub Actions CI/CD pipeline"
git push origin test/ci-pipeline
```

#### Step 3: Pull Request 생성
```bash
# GitHub 웹사이트에서 PR 생성
1. Repository → Pull requests → New pull request
2. base: main ← compare: test/ci-pipeline
3. "Create pull request" 클릭
```

#### Step 4: GitHub Actions 확인
```bash
# PR 페이지에서 확인
1. "Checks" 탭 클릭
2. CI workflow 실행 확인:
   - ✅ Code Quality (TypeScript + ESLint)
   - ✅ Run Tests (192개 테스트)
   - ✅ Build Verification
   - ✅ All Checks Passed

# 예상 소요 시간: 3-5분
```

#### Step 5: PR 병합 (선택)
```bash
# 테스트 완료 후
1. "Merge pull request" 클릭
2. "Confirm merge" 클릭
3. 브랜치 삭제: "Delete branch" 클릭
```

**예상 결과**:
- PR마다 자동으로 품질 검증 실행
- 모든 체크 통과 시 병합 가능
- 배포 안정성 확보

---

## 📈 Phase 8.2 - 백업 자동화 (선택 사항)

**우선순위**: 낮음 (Phase 8.1 완료 후 고려)

### 작업 목록

#### 1. 백업 자동화 스크립트 구현
```bash
# scripts/backup-database.sh 생성
- Supabase DB 덤프
- 압축 (gzip)
- 30일 이상 된 백업 삭제
```

#### 2. Cron 작업 설정
```bash
# 주 1회 일요일 오전 3시 실행
crontab -e
0 3 * * 0 /path/to/scripts/backup-database.sh
```

#### 3. 클라우드 스토리지 연동 (선택)
```bash
# AWS S3 / Google Cloud Storage 업로드
- 백업 파일 자동 업로드
- 장기 보관 (90일)
```

**예상 소요 시간**: 2-3시간

---

## 🎯 다음 Phase 선택

Phase 8.1 완료 후 선택 가능한 다음 단계:

### Option A: Phase 5 - UX 디테일 개선 (중간 우선순위)
**예상 소요**: 1주
- 만다라트 상세 페이지 개선
- 빈 상태 UI 개선
- 아이콘 & UI 정리
- 접힘/펼침 사용자 설정

**장점**: 사용자 경험 향상, 세련된 UI

---

### Option B: Phase 6 - 게임화 고도화 (낮은 우선순위)
**예상 소요**: 1-2주
- 배지 시스템 v5.0 (25개 배지)
- 리더보드 & 소셜 기능
- 퀴즈 기능

**장점**: 사용자 engagement 증가

**단점**: 사용자 피드백 수집 후 결정 권장

---

### Option C: 사용자 피드백 수집 & 분석 (추천) ⭐
**예상 소요**: 1-2주
1. 실제 사용자 10명 초대
2. 사용 패턴 분석 (PostHog 데이터)
3. 피드백 인터뷰
4. 우선순위 재조정

**장점**: 데이터 기반 의사결정

---

## ✅ 완료 체크리스트

### Phase 8.1 완료 확인
- [x] PostHog 설치 및 통합
- [x] Sentry 설치 및 통합
- [x] 이벤트 추적 통합 (4개)
- [x] GitHub Actions CI/CD
- [x] 백업 & 복구 전략 문서화
- [x] 환경변수 설정
- [ ] PostHog 대시보드 인사이트 생성
- [ ] 실제 사용 시나리오 테스트
- [ ] Vercel 프로덕션 재배포

### Phase 8.1 → 100% 완료 조건
- [ ] 위 3가지 작업 완료
- [ ] PostHog Live Events에서 모든 이벤트 확인
- [ ] Sentry 에러 추적 확인 (프로덕션)
- [ ] GitHub Actions 성공 확인

---

## 📞 다음 작업 선택

추천 순서:
1. **PostHog 대시보드 인사이트 생성** (10분) ← 지금 바로
2. **실제 사용 시나리오 테스트** (20분) ← 오늘 중
3. **Vercel 프로덕션 재배포** (5분) ← 오늘 중

선택사항:
4. Sentry 알림 규칙 설정 (10분)
5. GitHub Actions 테스트 (15분)

---

**최종 업데이트**: 2025-11-25
**다음 리뷰**: Phase 8.1 100% 완료 후
