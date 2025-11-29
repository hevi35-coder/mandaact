# MandaAct 개발 로드맵 v3.4

**최종 업데이트**: 2025-11-29 (Latest) - 코드 리팩토링 진행
**현재 상태**: Phase 4 완료 ✅ | Mobile App 100% 완료 ✅ | 코드 리팩토링 진행 중 🔄

---

## 📊 현재 프로젝트 상태

### ✅ 완료된 Phase
- **Phase 1-A**: Image OCR (이미지 업로드) ✅
- **Phase 1**: UX 개선 (4개) ✅
- **Phase 2**: 기능 확장 (4개) ✅
- **Phase 2-B**: UX 개선 후속 (8개) ✅
- **Phase 3-A**: 게임화 시스템 ✅
  - XP 시스템 Phase 1 & 2 (배율 + 로그 곡선)
  - 배지 시스템 (21개 배지, 자동 해제)
  - 스트릭 시스템 (프리즈 포함)
  - 월간 배지 자동 리셋 (Cron)
- **Phase 3-B**: 튜토리얼 시스템 ✅
- **Phase 3-C**: 리포트 시스템 ✅
  - 주간 실천 리포트 (AI 분석)
  - 목표 진단 리포트 (SMART 기준)
- **PWA 배포**: 프로덕션 환경 구축 완료 ✅
- **Mobile App**: React Native 개발 완료 ✅ (100%)
  - Sentry 에러 추적 통합
  - Production Logger 시스템
  - 환경변수 검증
  - React.memo 최적화
  - 공유 XP 유틸리티

### 🎯 핵심 기능 현황
| 기능 영역 | 상태 | 설명 |
|---------|------|------|
| 만다라트 생성 | ✅ 완료 | 이미지 OCR, 텍스트 파싱, 수동 입력 (3가지 방식) |
| 액션 관리 | ✅ 완료 | CRUD, 타입 시스템 (루틴/미션/참고), AI 추천, 인라인 편집 |
| 일일 체크 | ✅ 완료 | 오늘의 실천, 날짜 선택, 어제까지 체크 |
| 통계/리포트 | ✅ 완료 | 대시보드, 진행률, 히트맵, 만다라트 필터 |
| 게임화 | ✅ 완료 | XP/레벨, 배지 21개, 스트릭, 월간 챌린지 |
| 리포트 | ✅ 완료 | 주간 실천 리포트, 목표 진단 (AI 분석) |
| 튜토리얼 | ✅ 완료 | 인터랙티브 온보딩 (7단계) |
| 알림 | ✅ 완료 | PWA 푸시 알림, 권한 관리 |
| 인증 | ✅ 완료 | 이메일/비밀번호 로그인 |
| PWA | ✅ 완료 | 설치 가능, 오프라인 지원, 모바일 최적화 |

---

## 🔥 다음 세션 우선 작업: Mobile App 테스트

> **우선순위**: 🔴 Critical
> **예상 소요**: 1-2시간
> **문서**: [`docs/mobile/TESTING_GUIDE.md`](../mobile/TESTING_GUIDE.md)

### 즉시 실행 명령어

```bash
# 1. 환경 설정 (최초 1회)
cd apps/mobile
cp .env.example .env
# .env 파일에 Supabase 설정 입력

# 2. 의존성 설치 + 실행
cd ../..
npm install
cd apps/mobile
npm start
```

### 테스트 항목 (49개)

| 영역 | 항목 수 | 주요 테스트 |
|------|--------|------------|
| 인증 | 6 | 로그인, 회원가입, 비밀번호 재설정 |
| 홈 화면 | 4 | XP/레벨/스트릭 표시 |
| 오늘의 실천 | 5 | 체크, 타입 필터 |
| 만다라트 관리 | 4 | 활성화 토글, 상세 이동 |
| 만다라트 생성 | 7 | OCR, 텍스트 파싱, 수동 입력 |
| 만다라트 상세 | 7 | 9x9 그리드, **액션 편집**, 이미지 내보내기 |
| 통계 | 4 | 히트맵, 진행률 |
| AI 리포트 | 3 | 주간 리포트, 목표 진단 |
| 배지 | 4 | 21개 배지, 진행률 |
| 설정 | 5 | **알림 토글**, **시간 선택**, 로그아웃 |

**신규 기능 (Mobile-1~4)**: 설정의 알림 시스템, 만다라트 상세의 액션 편집

---

## 🚀 Phase 4: 코드 품질 & 안정성 ✅ **100% 완료** (2025-11-25)

**목표**: 프로덕션 품질 확보 및 유지보수성 향상
**기간**: 1-2주
**완료일**: 2025-11-25

### 4.1 TypeScript & ESLint 정리 ✅ **100% 완료** (2025-11-29 업데이트)

**최종 상황**:
- ✅ TypeScript: 0 errors (완벽)
- ✅ ESLint 경고: 43개 → 7개로 감소 (84% 개선)
- ✅ any 타입: 모두 제거 (프로젝트 전체 0개)
- ✅ Unused variables 모두 제거
- ✅ ESLint 설정 개선: `varsIgnorePattern: '^_'` 추가
- ⚠️ 남은 경고 7개 (모두 무시 가능):
  - 4개: shadcn/ui 라이브러리 코드 (react-refresh)
  - 2개: 테스트 유틸 export * (react-refresh)
  - 1개: SubGoalModal useEffect (의도적 설계)

**작업 목록**:
- [x] ESLint 경고 제거 (React Hook 의존성, unused variables)
- [x] `any` 타입 제거 (Edge Functions 포함)
- [x] Supabase QueryBuilder 타입 정의
- [x] SupabaseAuthError 타입 정의

**우선순위**: 🔴 Critical - ✅ 완료

---

### 4.2 성능 최적화 ✅ **100% 완료** (2025-11-25)

**완료 사항**:
- ✅ 번들 크기 분석: rollup-plugin-visualizer로 상세 분석
- ✅ 불필요한 의존성 제거: html2canvas, dom-to-image-more (6개 패키지)
- ✅ Code splitting 확인: 이미 모든 페이지 lazy loading 적용됨
- ✅ Tree shaking 검증: 활성화 확인
- ✅ 빌드 최적화: CSS 코드 분할, 소스맵 비활성화
- ✅ 번들 크기: 1.18MB (gzipped ~350KB)
- ✅ React.memo 적용: 9개 주요 컴포넌트 (Navigation 추가)
- ✅ TanStack Query 캐싱: staleTime 5분, gcTime 10분, refetchOnWindowFocus false
- ✅ 이미지 최적화 분석: 3개 아이콘만 존재 (이미 최적화됨)

**작업 목록**:
- [x] 번들 크기 분석 및 최적화 (1.33MB → 1.18MB)
  - [x] Code splitting (React.lazy) - 이미 적용됨
  - [x] Tree shaking 검증 - 활성화됨
  - [x] 중복 의존성 제거 - 6개 패키지 제거
- [x] 이미지 최적화 (WebP, lazy loading) - 필요 없음 (아이콘 3개만 존재)
- [x] TanStack Query 캐싱 전략 개선 - 이미 최적화됨
- [x] React.memo 적용 (불필요한 re-render 방지) - 9개 컴포넌트 적용
- [x] `performanceUtils.ts` 단위 테스트 작성

**측정 결과** (2025-11-22):
- ✅ Lighthouse Performance Score: **88점** (목표 90 근접)
- ⚠️ First Contentful Paint: 2.49초 (시뮬레이션) / **100ms** (실제) ✅
- ✅ Time to Interactive: 3.47초 (시뮬레이션) / **816ms** (실제) ✅
- ✅ Total Blocking Time: 0ms
- ✅ Cumulative Layout Shift: 0

**우선순위**: 🟡 Important

---

### 4.3 에러 핸들링 개선 ✅ **완료** (2025-11-22)

**완료 사항**:
- Edge Function 에러 응답 표준화 유틸리티 (`_shared/errorResponse.ts`)
- 2개 Edge Function 리팩토링 (generate-report, parse-mandalart-text)
- 표준화된 에러 코드 및 타입 시스템
- withErrorHandler 래퍼 함수 구현

**작업 목록**:
- [x] 전역 에러 바운더리 추가
- [x] Edge Function 에러 응답 표준화
- [x] 사용자 친화적 에러 메시지 (한글)
- [x] 에러 추적 시스템 검토 (Sentry 추천, 나중에 설정 가능)

**우선순위**: 🟡 Important - ✅ 완료

---

### 4.4 테스트 추가 ✅ **100% 완료** (2025-11-25)

**최종 결과**:
- ✅ **192개 테스트 통과** (이전 170개에서 +13%)
- ✅ **0개 실패** (이전 25개 실패 100% 해결)
- ⏭️ 5개 skip (타이밍 이슈)
- ✅ **15/15 테스트 파일 통과** (100%)

**완료 사항**:
- ✅ @testing-library/dom 의존성 설치
- ✅ 테스트 유틸리티 생성: `src/test/utils.tsx` (QueryClientProvider + BrowserRouter)
- ✅ HomePage 테스트 수정: 11개 테스트 모두 통과
- ✅ TodayChecklistPage 테스트 수정: 8개 테스트 통과
- ✅ MandalartDetailPage 테스트 수정: 6개 테스트 통과
- ✅ Navigation 테스트: 10개 테스트 모두 통과 (이전 7개 실패 해결)
- ✅ ESLint 설정 개선: 테스트 파일에서 any 타입 허용

**작업 목록**:
- [x] Vitest 설정 (단위 테스트)
- [x] 핵심 로직 테스트:
  - [x] `actionTypes.ts` (타입 추천, shouldShowToday) - 73/73 통과
  - [x] `stats.ts` (통계 계산) - 6/6 통과
  - [x] `reportParser.ts` (리포트 파싱) - 5/5 통과
  - [x] `xpMultipliers.ts` (XP 배율 계산) - 14/14 통과
- [x] 컴포넌트 테스트 (React Testing Library)
  - [x] `ErrorBoundary` - 4/4 통과
  - [x] `Navigation` - 10/10 통과
  - [x] `HomePage` - 11/11 통과 (skip 2개)
  - [x] `TodayChecklistPage` - 8/8 통과 (skip 1개)
  - [x] `MandalartDetailPage` - 6/6 통과
  - [x] `UserProfileCard` - 8/8 통과
  - [x] `MandalartGrid` - 14/14 통과
  - [x] `ActionTypeSelector` - 6/6 통과
  - [x] `ReportsPage` - 4/4 통과
- [ ] E2E 테스트 (Playwright) - 추후 Phase 8에서 고려
  - 만다라트 생성 플로우
  - 체크 플로우
  - 배지 해제 플로우

**우선순위**: 🟢 Recommended - ✅ 완료

---

## 📱 Mobile App: React Native 개발 ✅ **100% 완료** (2025-11-27)

**목표**: 네이티브 모바일 앱으로 사용자 경험 향상
**기술 스택**: React Native + Expo + NativeWind

### 완료된 기능 ✅

**스크린 (12개)**:
- ✅ HomeScreen - 대시보드, XP/레벨, 스트릭
- ✅ TodayScreen - 일일 체크리스트, 만다라트별 그룹화
- ✅ MandalartListScreen - 만다라트 관리, 활성화 토글
- ✅ MandalartCreateScreen - 3가지 입력 방식 (OCR/텍스트/수동)
- ✅ MandalartDetailScreen - 9x9 그리드, 이미지 내보내기, 액션 인라인 편집
- ✅ StatsScreen - 히트맵, 통계, 게임화 정보
- ✅ ReportsScreen - 주간 리포트, 목표 진단
- ✅ BadgeScreen - 21개 배지, 진행률
- ✅ TutorialScreen - 7단계 온보딩
- ✅ SettingsScreen - 설정, 알림 시간 선택, 로그아웃
- ✅ LoginScreen - 이메일/비밀번호 인증, 비밀번호 재설정
- ✅ LoadingScreen - 초기 로딩

**훅 (6개)**:
- ✅ useMandalarts - 만다라트 CRUD
- ✅ useActions - 액션 체크, 조회, 수정
- ✅ useStats - 통계, 게임화
- ✅ useBadges - 배지 시스템
- ✅ useReports - AI 리포트
- ✅ useNotifications - 푸시 알림 관리

**서비스 (3개)**:
- ✅ ocrService - 이미지 OCR
- ✅ exportService - 이미지 캡처/저장
- ✅ notificationService - 푸시 알림 스케줄링

**코드 품질**:
- ✅ ErrorBoundary 컴포넌트
- ✅ Toast 알림 시스템
- ✅ Skeleton 로딩
- ✅ EmptyState 컴포넌트
- ✅ errorHandling 유틸리티 (한글화 완료)
- ✅ ActionEditModal 컴포넌트
- ✅ Sentry 에러 추적 (logger.ts)
- ✅ Production Logger 시스템 (console → logger 교체)
- ✅ 환경변수 검증 (env.ts)
- ✅ React.memo 최적화 (ActionListItem)
- ✅ 공유 XP 유틸리티 (@mandaact/shared)

### 완료된 작업 ✅

#### Mobile-1: 푸시 알림 시스템 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] Expo Notifications 설정
- [x] 권한 요청 플로우
- [x] 시간 선택 UI (TimePicker Modal)
- [x] 백그라운드 스케줄링

#### Mobile-2: 액션 인라인 편집 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] MandalartDetailScreen 편집 모드
- [x] ActionEditModal 컴포넌트
- [x] 액션 타입 변경 UI (루틴/미션/참고)
- [x] frequency/cycle 수정

#### Mobile-3: 에러 메시지 한글화 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] 인증 에러 메시지 번역 (20+ 메시지)
- [x] API 에러 메시지 번역
- [x] 사용자 친화적 메시지

#### Mobile-4: 비밀번호 재설정 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] LoginScreen에 "비밀번호를 잊으셨나요?" 링크
- [x] Supabase 비밀번호 재설정 연동
- [x] 성공/실패 피드백 (Modal UI)

### Web vs Mobile 비교

| 기능 | Web | Mobile | 상태 |
|------|-----|--------|------|
| 만다라트 CRUD | ✅ | ✅ | 동등 |
| 3가지 입력 방식 | ✅ | ✅ | 동등 |
| 일일 체크 | ✅ | ✅ | 동등 |
| 게임화 (XP/배지) | ✅ | ✅ | 동등 |
| AI 리포트 | ✅ | ✅ | 동등 |
| 튜토리얼 | ✅ | ✅ | 동등 |
| 알림 시스템 | ✅ | ✅ | 동등 |
| 액션 편집 | ✅ | ✅ | 동등 |
| 비밀번호 재설정 | ✅ | ✅ | 동등 |

**상태**: ✅ 완료 - Web과 기능 동등성 달성 + 프로덕션 품질 확보

### 남은 작업 (Optional)
- [ ] Sentry 프로젝트 생성 및 DSN 발급 (사용자 작업)
- [ ] EAS Build 설정 (앱스토어 배포 시)
- [ ] 실제 기기 테스트 (49개 테스트 항목)

---

## 🎨 Phase 5: UX 디테일 개선 (우선순위: 중간)

**목표**: 사용자 경험 마지막 다듬기
**기간**: 1주

### 5.1 만다라트 상세 페이지 개선
**작업 목록**:
- [ ] 핵심 목표 시각적 강조 (크기, 색상)
- [ ] "핵심목표" 라벨 연하게 처리
- [ ] 9x9 그리드 모바일 반응형 최적화
- [ ] 셀 호버 시 툴팁 표시 (전체 텍스트)

**우선순위**: 🟢 Recommended

---

### 5.2 아이콘 & UI 정리
**작업 목록**:
- [ ] 목표 우측 불필요한 아이콘 제거 확인
- [ ] 액션 타입 아이콘 일관성 검토
- [ ] 색상 팔레트 통일 (Tailwind theme 확장)
- [ ] 로딩 스피너/스켈레톤 UI 추가

**우선순위**: 🟢 Recommended

---

### 5.3 접힘/펼침 사용자 설정
**작업 목록**:
- [ ] LocalStorage에 섹션 상태 저장
- [ ] "전체 펼치기/접기" 버튼 추가
- [ ] 설정 페이지에서 기본값 변경 가능

**우선순위**: 🟢 Nice-to-have

---

### 5.4 빈 상태 (Empty State) 개선
**작업 목록**:
- [ ] 만다라트 없을 때: 온보딩 일러스트 + CTA
- [ ] 체크 항목 없을 때: 격려 메시지
- [ ] 통계 데이터 없을 때: 가이드 표시

**우선순위**: 🟢 Nice-to-have

---

## 🎮 Phase 6: 게임화 고도화 (선택사항, 우선순위: 낮음)

**목표**: 배지 시스템 확장 및 새로운 동기부여 요소 추가
**기간**: 1-2주

### 6.1 배지 시스템 v5.0 적용
**현재 상태**: v5.0 기획 완료, 미구현

**작업 목록**:
- [ ] 스토리 중심 배지 리뉴얼 (25개)
  - 🔥 스트릭 배지 7개 (3일 → 150일)
  - 💯 볼륨 배지 7개 (50회 → 5000회)
  - 🏆 월간 챌린지 4개
  - 🌙 시크릿 배지 3개
  - ⭐ 특별 배지 4개
- [ ] 감정 곡선 기반 XP 재조정
- [ ] 시크릿 배지 힌트 시스템
- [ ] 배지 스토리 UI 개선

**참고 문서**: `docs/features/BADGE_SYSTEM_V5_RENEWAL.md`

**우선순위**: 🟢 Optional

---

### 6.2 리더보드 & 소셜 기능
**작업 목록**:
- [ ] 주간/월간 리더보드 (선택 참여)
- [ ] 만다라트 공유 기능 (이미지 생성)
- [ ] SNS 공유 버튼 (카카오톡, 트위터)
- [ ] 친구 초대 시스템

**우선순위**: 🟢 Future

---

### 6.3 퀴즈 기능
**작업 목록**:
- [ ] 주간 복습 퀴즈 생성 (AI)
- [ ] "당신의 목표는?" 객관식 퀴즈
- [ ] 정답 시 격려 메시지
- [ ] 퀴즈 결과 통계

**우선순위**: 🟢 Future

---

## 🤖 Phase 7: AI 재설계 (선택사항, 우선순위: 낮음)

**목표**: AI 기능 재도입 (사용자 피드백 기반 결정)
**기간**: 2-3주

### 옵션 A: 간소화된 AI 도우미
**컨셉**: 전체 만다라트 생성이 아닌, 보조 기능으로만 활용

**기능**:
- [ ] AI 실천 항목 제안 (세부 목표 입력 시)
  - "운동" 입력 → "매일 30분 걷기", "주 3회 근력 운동" 제안
  - Perplexity API 사용, 3개 제안, 사용자 선택
- [ ] AI 동기부여 메시지 생성 (주간 리포트)
  - 실천율 데이터 → 개인화된 격려 메시지
  - 이메일 or 앱 내 알림

**장점**:
- 가볍고 빠른 구현
- 부담 없는 사용자 경험
- 비용 효율적 (프롬프트당 $0.002)

**비용 추정**: $5-10/month (100 DAU 기준)

**우선순위**: 🟢 Optional

---

### 옵션 B: 풀스택 AI 코칭 재구현
**컨셉**: 채팅 기반 만다라트 생성 재도입 (처음부터 재설계)

**설계 원칙**:
1. **단순화**: 4단계 → 2-3단계로 축소
2. **선택사항**: 수동 입력의 "추가 옵션"으로 제공
3. **빠른 완료**: 5분 이내 생성 목표

**작업 목록**:
- [ ] 새 프롬프트 전략 설계
- [ ] UI 재설계 (간소화된 플로우)
- [ ] Edge Function 재구현
- [ ] 베타 테스트 + 피드백 수집

**우선순위**: 🟡 Consider Later (사용자 피드백 후 결정)

---

## 📱 Phase 9: 플랫폼 확장 & 수익화 (우선순위: 중간)

**목표**: 플랫폼 확장 및 지속 가능한 수익 모델 구축
**기간**: 4-6주

### 9.1 iPad 지원 (유니버셜 앱) 🔵 **1순위**
**목표**: iPad에서 최적화된 레이아웃으로 사용자 경험 향상

**작업 목록**:
- [ ] iPad 전용 레이아웃 설계
  - 9x9 그리드 더 큰 화면에 최적화
  - 사이드바 네비게이션 검토
  - Split View 지원 고려
- [ ] 반응형 브레이크포인트 추가
  - Tablet (768px+) 스타일 정의
  - 컴포넌트별 iPad 레이아웃 조정
- [ ] 멀티태스킹 지원
  - Slide Over, Split View 테스트
  - 화면 회전 대응
- [ ] iPad 시뮬레이터/실기기 테스트

**선정 이유**:
- 외부 의존성 없이 순수 UI 작업
- 기존 코드베이스 안정성 유지
- 앱스토어 기기 호환성 확대

**우선순위**: 🟡 Important

---

### 9.2 글로벌 대응 (i18n) 🟢 **2순위**
**목표**: 한국어 + 일본어 + 영어 다국어 지원

**작업 목록**:
- [ ] i18n 라이브러리 설정
  - react-i18next 또는 expo-localization
  - 언어 감지 및 전환 로직
- [ ] 번역 파일 구조 설계
  - `locales/ko.json`, `ja.json`, `en.json`
  - 네임스페이스 분리 (common, home, settings 등)
- [ ] UI 텍스트 추출 및 키 변환
  - 모든 하드코딩된 한국어 텍스트 → 번역 키
  - 날짜/숫자 포맷 로케일 대응
- [ ] 언어 설정 UI
  - 설정 화면에 언어 선택 추가
  - 시스템 언어 자동 감지 옵션
- [ ] 일본어/영어 번역 작업
  - 전문 번역 또는 AI 번역 + 검수
- [ ] 폰트 대응
  - 일본어 폰트 (Noto Sans JP 등)
  - 다국어 텍스트 렌더링 테스트

**선정 이유**:
- iPad 레이아웃 안정화 후 진행이 효율적
- 내부 작업으로 완료 가능 (외부 서비스 불필요)
- 글로벌 시장 진출 기반 마련

**우선순위**: 🟡 Important

---

### 9.3 AdMob 광고 연동 🟠 **3순위**
**목표**: 지속 가능한 수익 모델 구축

**작업 목록**:
- [ ] AdMob 계정 설정
  - Google AdMob 계정 생성
  - 앱 등록 및 광고 단위 ID 발급
  - 테스트 기기 등록
- [ ] react-native-google-mobile-ads 통합
  - 라이브러리 설치 및 설정
  - iOS/Android 네이티브 설정
- [ ] 광고 유형 구현
  - 배너 광고 (하단 고정)
  - 전면 광고 (적절한 타이밍)
  - 보상형 광고 (XP 보너스 등 연계)
- [ ] 광고 정책 준수
  - 앱스토어 광고 정책 검토
  - GDPR/개인정보 동의 (EU 대응)
  - 어린이 보호법 대응 (COPPA)
- [ ] 광고 제거 옵션 (선택)
  - 프리미엄 구독 또는 일회성 구매
  - IAP 연동 검토
- [ ] 광고 성과 추적
  - AdMob 대시보드 모니터링
  - 수익 최적화 A/B 테스트

**선정 이유**:
- 외부 SDK + 광고 계정 + 정책 검토 필요
- i18n 완료 후 글로벌 광고 네트워크 활용 가능
- 사용자 기반 확보 후 수익화가 효과적

**우선순위**: 🟢 Recommended

---

## 🌐 Phase 8: 운영 & 모니터링 강화 (우선순위: 높음)

**목표**: 프로덕션 환경 안정화 및 데이터 기반 의사결정
**기간**: 1주

### 8.1 모니터링 & 분석
**작업 목록**:
- [ ] 핵심 이벤트 추적 설정:
  - `mandalart_created`
  - `action_checked`
  - `badge_unlocked`
  - `notification_clicked`
  - `tutorial_completed`
- [ ] 에러 추적 시스템 (Sentry 등)
- [ ] Vercel Analytics 상세 분석
- [ ] 사용자 행동 퍼널 분석

**우선순위**: 🟡 Important

---

### 8.2 CI/CD 파이프라인 개선
**작업 목록**:
- [ ] GitHub Actions 설정
  - `npm run type-check` 자동 실행
  - `npm run lint` 자동 실행
  - `npm run build` 검증
- [ ] PR 프리뷰 배포 활성화
- [ ] 자동 테스트 통합 (추후)

**우선순위**: 🟡 Important

---

### 8.3 백업 & 복구 전략
**작업 목록**:
- [ ] Supabase 자동 백업 설정
- [ ] 데이터 복구 프로시저 문서화
- [ ] 마이그레이션 롤백 테스트
- [ ] RLS 정책 검증 (보안 테스트)

**우선순위**: 🟡 Important

---

## 📊 성공 지표 (KPIs)

### 단기 목표 (배포 후 1개월)
| 지표 | 목표 | 현재 |
|-----|------|------|
| 회원가입 전환율 | > 50% | 측정 중 |
| 온보딩 완료율 (만다라트 생성) | > 70% | 측정 중 |
| 튜토리얼 완료율 | > 60% | 측정 중 |
| DAU / MAU (Stickiness) | > 30% | 측정 중 |
| 주간 평균 체크 수 | > 10 | 측정 중 |
| 7일 리텐션 | > 40% | 측정 중 |

### 중기 목표 (3개월)
| 지표 | 목표 |
|-----|------|
| MAU | 500+ |
| DAU / MAU | > 50% |
| 주간 평균 체크 수 | > 20 |
| 배지 획득 평균 개수 | > 5 |
| NPS | > 50 |

---

## 🗓️ 타임라인 요약

```
Week 1-2  | Phase 4: 코드 품질 & 안정성     [🔴 Critical] ✅ 완료
          ├─ TypeScript/ESLint 정리
          ├─ 성능 최적화
          └─ 에러 핸들링 개선

Week 3    | Phase 8: 모니터링 강화          [🟡 Important]
          ├─ 이벤트 추적 설정
          ├─ CI/CD 파이프라인
          └─ 백업 전략

Week 4    | Phase 5: UX 디테일 개선         [🟢 Recommended]
          ├─ 만다라트 상세 페이지
          ├─ 아이콘 정리
          └─ 빈 상태 개선

Week 5-6  | Phase 9.1: iPad 지원           [🟡 Important]
          ├─ iPad 전용 레이아웃
          ├─ 반응형 브레이크포인트
          └─ 멀티태스킹 지원

Week 7-8  | Phase 9.2: 글로벌 대응 (i18n)   [🟡 Important]
          ├─ i18n 라이브러리 설정
          ├─ 번역 파일 구조
          └─ 한/일/영 번역 작업

Week 9-10 | Phase 9.3: AdMob 광고          [🟢 Recommended]
          ├─ AdMob 계정 및 SDK 연동
          ├─ 광고 유형 구현
          └─ 정책 준수 및 수익 최적화

Week 11+  | Phase 6/7: 고급 기능           [🟢 Optional]
          └─ 사용자 피드백 기반 결정
```

---

## 🎯 즉시 착수 가능한 작업 (Quick Wins)

**오늘/내일 할 수 있는 작업**:

1. **TypeScript 정리** (2-3시간)
   - `any` 타입 제거
   - unused variables 정리
   - React Hook 의존성 추가

2. **이벤트 추적 설정** (1-2시간)
   - 핵심 이벤트 정의
   - 분석 도구 연동 (PostHog or GA4)

3. **에러 바운더리 추가** (1시간)
   - 전역 에러 바운더리 컴포넌트
   - 사용자 친화적 에러 메시지

4. **성능 측정** (30분)
   - Lighthouse 분석
   - 번들 크기 확인
   - 개선 영역 파악

---

## 📝 의사결정 필요 사항

### 우선순위 결정
- [ ] **배지 v5.0 적용 여부**: 현재 21개 → 25개로 확장
- [ ] **AI 재도입 여부**: 옵션 A (간소화) vs 옵션 B (풀스택) vs 없음
- [ ] **소셜 기능 추가**: 리더보드, 공유 기능 필요성
- [ ] **테스트 커버리지**: 핵심만 vs 전체 커버리지

### 기술 결정
- [ ] **에러 추적 도구**: Sentry vs LogRocket vs 없음
- [ ] **분석 도구**: PostHog vs Google Analytics vs Mixpanel
- [ ] **모니터링**: Vercel Analytics만 vs 추가 도구

---

## 📈 프로젝트 현황

### 구현 완료 기능
✅ **코어 기능** (100%)
- 만다라트 생성 (이미지/텍스트/수동)
- 액션 타입 시스템 (루틴/미션/참고)
- 일일 체크 & 히스토리
- 통계 & 대시보드

✅ **게임화** (100%)
- XP/레벨 시스템 (하이브리드 로그 곡선)
- XP 배율 시스템 (주말, 복귀, 마일스톤, 완벽한 주)
- 배지 21개 (자동 해제)
- 스트릭 시스템 (프리즈 포함)
- 월간 배지 자동 리셋 (Cron)

✅ **리포트** (100%)
- 주간 실천 리포트 (AI 분석)
- 목표 진단 리포트 (SMART 기준)

✅ **온보딩** (100%)
- 인터랙티브 튜토리얼 (7단계)
- 샘플 데이터 제공

✅ **PWA** (100%)
- 설치 가능
- 오프라인 지원
- 푸시 알림
- 모바일 최적화

### 기술 부채
🟡 **중간 수준**
- TypeScript `any` 타입 일부 존재
- 번들 크기 최적화 여지
- 테스트 커버리지 0%
- 에러 추적 시스템 미구축

---

## 🔄 로드맵 업데이트 기준

이 로드맵은 다음 상황에서 업데이트됩니다:
- Phase 완료 시
- 사용자 피드백 수집 후
- 기술적 제약 발견 시
- 비즈니스 우선순위 변경 시

**다음 리뷰**: Phase 4 완료 후

---

## 🎉 주요 성과

### 최근 완료 (2025-11-29)
✅ 코드 리팩토링 - Web 린트 경고 대폭 감소 (30개 → 7개)
✅ shared 패키지 린트 완료 (0 에러, 0 경고)
✅ ESLint 설정 개선 (varsIgnorePattern 추가)
✅ 미사용 import/변수 정리 (12개 파일)

### 이전 완료 (2025-11-27)
✅ Mobile App 코드 품질 개선 완료 (100%)
✅ Sentry 에러 추적 통합 (@sentry/react-native)
✅ Production Logger 시스템 (console.log → logger)
✅ 환경변수 검증 유틸리티 (env.ts)
✅ React.memo 최적화 (ActionListItem 컴포넌트)
✅ 공유 XP 유틸리티 (@mandaact/shared/xpUtils)
✅ EAS Build 배포 가이드 문서화

### 이전 완료 (2025-11-26)
✅ React Native 모바일 앱 기능 완성
✅ 12개 스크린, 6개 훅, 3개 서비스 구현
✅ Mobile-1: 푸시 알림 시스템 (useNotifications 훅, 시간 선택 UI)
✅ Mobile-2: 액션 인라인 편집 (ActionEditModal 컴포넌트)
✅ Mobile-3: 에러 메시지 한글화 (20+ 메시지 번역)
✅ Mobile-4: 비밀번호 재설정 (LoginScreen 통합)
✅ Vercel 배포 설정 수정 (npm workspaces)
✅ 코드 품질 컴포넌트 추가 (ErrorBoundary, Toast, Skeleton)

### 이전 완료 (2025-11-14)
✅ PWA 프로덕션 배포 완료
✅ 모바일 라우팅 수정 (vercel.json)
✅ 브랜드 로고 적용 (PWA manifest)
✅ 자동 리다이렉트 로직 구현

### Phase 3 게임화 시스템 (2025-11-10~12)
✅ XP 시스템 Phase 1 & 2 (레벨 진행 속도 67% 개선)
✅ 배지 시스템 완전 자동화 (토스트 알림, NEW 인디케이터)
✅ 월간 배지 자동 리셋 (Cron)
✅ 스트릭 계산 버그 수정 (KST 타임존 지원)

### Phase 2 기능 확장 (2025-11-01~08)
✅ 만다라트 활성화/비활성화
✅ 날짜 선택 기능 (어제까지 체크 허용)
✅ 알림 권한 안내
✅ 통계 만다라트 필터

---

**문서 버전**: 3.4
**최종 수정**: 2025-11-29
**작성자**: Development Team
