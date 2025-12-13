# Phase 8 설정 가이드

**작성일**: 2025-11-25
**Phase**: 8.1 모니터링 & 운영 강화
**상태**: 코드 구현 완료, 환경 설정 필요

---

## 완료된 작업 ✅

### 1. PostHog 이벤트 추적 시스템
- ✅ `posthog-js` 패키지 설치
- ✅ `src/lib/posthog.ts` 유틸리티 생성
- ✅ `App.tsx`에 PostHog 초기화 통합
- ✅ 핵심 이벤트 5개 추적 함수 구현:
  - `trackMandalartCreated` - 만다라트 생성
  - `trackActionChecked` - 액션 체크
  - `trackBadgeUnlocked` - 배지 획득
  - `trackTutorialCompleted` - 튜토리얼 완료
  - `trackNotificationClicked` - 알림 클릭

### 2. Sentry 에러 추적 시스템
- ✅ `@sentry/react` 패키지 설치
- ✅ `src/lib/sentry.ts` 유틸리티 생성
- ✅ `App.tsx`에 Sentry 초기화 통합
- ✅ 에러 필터링 및 브레드크럼 설정
- ✅ 사용자 컨텍스트 자동 추적

### 3. GitHub Actions CI/CD 파이프라인
- ✅ `.github/workflows/ci.yml` 생성
- ✅ 4단계 자동 검증 구현:
  1. Code Quality (TypeScript + ESLint)
  2. Tests (Vitest)
  3. Build Verification
  4. Success Notification

### 4. 백업 & 복구 전략 문서화
- ✅ `docs/operations/BACKUP_RECOVERY_STRATEGY.md` 작성
- ✅ 백업 전략 정의
- ✅ 복구 절차 문서화
- ✅ 재해 복구 계획 수립

---

## 환경 설정 가이드

### Step 1: PostHog 설정

#### 1.1 PostHog 계정 생성 (무료)

1. https://app.posthog.com 접속
2. "Get started - free" 클릭
3. 이메일 또는 Google 계정으로 가입
4. 프로젝트 생성: "MandaAct"

#### 1.2 API 키 발급

1. PostHog Dashboard → Project Settings → Project API Key 복사
2. `.env.local` 파일에 추가:
   ```bash
   VITE_POSTHOG_KEY=phc_your_api_key_here
   VITE_POSTHOG_HOST=https://app.posthog.com
   ```

#### 1.3 이벤트 추적 테스트

```bash
# 개발 서버 재시작
npm run dev

# 브라우저에서 http://localhost:5173 접속
# 로그인 → 만다라트 생성 → 액션 체크

# PostHog Dashboard → Live Events에서 실시간 이벤트 확인
```

---

### Step 2: Sentry 설정

#### 2.1 Sentry 계정 생성 (무료 5,000 errors/month)

1. https://sentry.io 접속
2. "Start Free" 클릭
3. GitHub 계정으로 가입 (권장)
4. 프로젝트 생성:
   - Platform: React
   - Project name: mandaact
   - Alert frequency: On every new issue

#### 2.2 DSN 복사

1. Sentry Project Settings → Client Keys (DSN)
2. DSN 복사 (예: `https://xxx@o123.ingest.sentry.io/456`)
3. `.env.local` 파일에 추가:
   ```bash
   VITE_SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
   ```

#### 2.3 에러 추적 테스트

```bash
# 개발 서버 재시작
npm run dev

# 브라우저 콘솔에서 테스트 에러 발생
window.dispatchEvent(new Error('Test Sentry Error'))

# Sentry Dashboard → Issues에서 에러 확인
```

**주의**: 개발 환경에서는 Sentry가 비활성화되도록 설정되어 있습니다.
프로덕션 배포 후 테스트하세요.

---

### Step 3: GitHub Actions 설정

#### 3.1 GitHub Secrets 설정

GitHub Actions가 빌드할 때 필요한 환경변수를 설정합니다.

1. GitHub 리포지토리 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 다음 secrets 추가:

| Name | Value | 필수 여부 |
|------|-------|-----------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 필수 |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ 필수 |
| `VITE_POSTHOG_KEY` | PostHog API Key | 선택 (빌드 성공) |
| `VITE_SENTRY_DSN` | Sentry DSN | 선택 (빌드 성공) |

#### 3.2 CI/CD 테스트

```bash
# 1. 현재 변경사항 커밋
git add .
git commit -m "feat: Add Phase 8 monitoring and CI/CD setup"

# 2. GitHub에 푸시
git push origin main

# 3. GitHub Actions 확인
# GitHub 리포지토리 → Actions 탭에서 워크플로우 실행 확인
```

**예상 결과**:
- ✅ Code Quality 통과
- ✅ Tests 통과 (192개)
- ✅ Build Verification 통과

---

### Step 4: Vercel 환경변수 설정

Vercel 프로덕션 배포에 환경변수를 추가합니다.

1. Vercel Dashboard → mandaact 프로젝트 선택
2. Settings → Environment Variables
3. 다음 변수 추가:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_POSTHOG_KEY` | PostHog API Key | Production |
| `VITE_POSTHOG_HOST` | `https://app.posthog.com` | Production |
| `VITE_SENTRY_DSN` | Sentry DSN | Production |

4. "Save" 클릭
5. "Redeploy" 클릭하여 새 배포 트리거

---

## 이벤트 추적 사용 예시

### 예시 1: 만다라트 생성 추적

**파일**: `src/pages/MandalartCreatePage.tsx`

```typescript
import { trackMandalartCreated } from '@/lib/posthog'

// 만다라트 저장 후
const handleSave = async () => {
  // ... 저장 로직 ...

  // 이벤트 추적
  trackMandalartCreated({
    mandalart_id: newMandalart.id,
    input_method: 'manual', // 'image' | 'text' | 'manual'
    sub_goals_count: 8,
    actions_count: 64
  })
}
```

---

### 예시 2: 액션 체크 추적

**파일**: `src/pages/TodayChecklistPage.tsx`

```typescript
import { trackActionChecked } from '@/lib/posthog'

// 체크 완료 후
const handleCheck = async (action) => {
  // ... 체크 로직 ...

  // 이벤트 추적
  trackActionChecked({
    action_id: action.id,
    action_type: action.type, // 'routine' | 'mission' | 'reference'
    sub_goal_id: action.sub_goal_id,
    mandalart_id: action.sub_goal.mandalart_id,
    checked_at: new Date()
  })
}
```

---

### 예시 3: 배지 획득 추적

**파일**: `src/lib/badgeEvaluator.ts`

```typescript
import { trackBadgeUnlocked } from '@/lib/posthog'

// 배지 해제 후
const unlockBadge = async (badge) => {
  // ... 배지 해제 로직 ...

  // 이벤트 추적
  trackBadgeUnlocked({
    badge_id: badge.id,
    badge_title: badge.title,
    badge_category: badge.category,
    xp_reward: badge.xp_reward,
    current_level: userLevel
  })
}
```

---

## 에러 추적 사용 예시

### 예시 1: API 에러 캡처

```typescript
import { captureError } from '@/lib/sentry'

try {
  const response = await fetch('/api/data')
  if (!response.ok) throw new Error('API request failed')
} catch (error) {
  // Sentry로 에러 전송
  captureError(error as Error, {
    api_endpoint: '/api/data',
    user_id: currentUser.id
  })

  // 사용자에게 에러 메시지 표시
  toast({ title: '데이터를 불러올 수 없습니다' })
}
```

---

### 예시 2: 컨텍스트 태그 추가

```typescript
import { setTag } from '@/lib/sentry'

// 사용자 행동 추적
setTag('feature', 'mandalart_creation')
setTag('input_method', 'image')

// 이후 발생하는 모든 에러에 태그 포함됨
```

---

## 대시보드 확인

### PostHog Dashboard

1. **Live Events**: 실시간 이벤트 스트림
   - URL: https://app.posthog.com/events
   - 새로고침 없이 실시간 확인

2. **Insights**: 맞춤 분석
   - 예시: "오늘 체크된 액션 수"
   - 예시: "만다라트 생성 방법별 분포"

3. **Funnels**: 전환율 분석
   - 예시: 회원가입 → 튜토리얼 완료 → 첫 체크

4. **Retention**: 리텐션 분석
   - 예시: 7일 리텐션율

---

### Sentry Dashboard

1. **Issues**: 에러 목록
   - URL: https://sentry.io/issues/
   - 우선순위: High → Medium → Low

2. **Performance**: 성능 모니터링
   - 페이지 로드 시간
   - API 응답 시간

3. **Releases**: 배포 추적
   - 버전별 에러 비교
   - 배포 후 에러 증가 감지

---

## 다음 단계 (Quick Wins)

### 1. PostHog 대시보드 설정 (30분)

추천 인사이트:
- 일일 활성 사용자 (DAU)
- 만다라트 생성 방법 분포 (image/text/manual)
- 액션 타입별 체크 비율 (routine/mission/reference)
- 배지 획득 TOP 10
- 튜토리얼 완료율

---

### 2. Sentry 알림 설정 (10분)

1. Sentry Project Settings → Alerts → New Alert Rule
2. 조건 설정:
   - "When an issue is first seen"
   - "When an issue changes state from ignored to unresolved"
3. 알림 채널: Email / Slack (선택)

---

### 3. GitHub Actions Badge 추가 (5분)

**파일**: `README.md`

```markdown
# MandaAct

![CI Status](https://github.com/YOUR_USERNAME/mandaact/actions/workflows/ci.yml/badge.svg)

AI-powered Mandalart Action Tracker
```

---

## 문제 해결 (Troubleshooting)

### 문제 1: PostHog 이벤트가 보이지 않음

**원인**:
- API 키 미설정
- 브라우저 애드블로커

**해결**:
```bash
# 1. 환경변수 확인
echo $VITE_POSTHOG_KEY

# 2. 브라우저 콘솔에서 PostHog 로드 확인
console.log(window.posthog)

# 3. 애드블로커 비활성화 (localhost)
```

---

### 문제 2: Sentry 에러가 기록되지 않음

**원인**:
- 개발 환경에서는 비활성화됨
- DSN 미설정

**해결**:
```bash
# 1. 프로덕션 빌드 테스트
npm run build
npm run preview

# 2. 환경변수 확인
echo $VITE_SENTRY_DSN

# 3. 수동 에러 발생
import * as Sentry from '@sentry/react'
Sentry.captureMessage('Test error')
```

---

### 문제 3: GitHub Actions 빌드 실패

**원인**:
- Secrets 미설정
- 의존성 버전 충돌

**해결**:
1. GitHub Secrets 재확인
2. 로컬에서 빌드 테스트:
   ```bash
   npm run build
   ```
3. Actions 로그 확인 (GitHub Actions 탭)

---

## 체크리스트

### Phase 8.1 완료 체크리스트

- [x] PostHog 설치 및 코드 통합
- [x] Sentry 설치 및 코드 통합
- [x] GitHub Actions CI/CD 파이프라인 생성
- [x] 백업 & 복구 전략 문서화
- [x] PostHog 계정 생성 및 API 키 설정
- [x] Sentry 계정 생성 및 DSN 설정
- [x] GitHub Secrets 설정
- [x] Vercel 환경변수 설정
- [x] **이벤트 추적 통합** (2025-11-25 완료)
  - [x] MandalartCreatePage - 만다라트 생성 추적
  - [x] TodayChecklistPage - 액션 체크 추적
  - [x] badgeEvaluator.ts - 배지 획득 추적
  - [x] TutorialPage - 튜토리얼 완료 추적
- [ ] PostHog 대시보드 인사이트 생성
- [ ] Sentry 알림 규칙 설정

---

## 참고 자료

- [PostHog Documentation](https://posthog.com/docs)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**최종 업데이트**: 2025-11-25
**작성자**: Development Team
**다음 단계**: Phase 8.2 (백업 자동화 스크립트 구현)
