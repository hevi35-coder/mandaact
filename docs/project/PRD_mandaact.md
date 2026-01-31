# Product Requirements Document (PRD)
# MandaAct - AI-Powered Mandalart Action Tracker

> 문서 인덱스: `docs/README.md`

**Version**: 2.0
**Date**: 2025-11-15
**Status**: Production (MVP Deployed)
**Author**: Product Team

---

## Executive Summary

**MandaAct**는 만다라트(Mandalart) 목표 설정 프레임워크와 게임화 시스템을 결합하여 사용자의 실천율을 획기적으로 높이는 개인 목표 관리 PWA 서비스입니다.

### Core Value Proposition
"목표를 세우는 것은 쉽지만, 실천하는 것은 어렵다" - MandaAct는 게임화와 AI 리포트로 당신의 실천을 도와줍니다.

### Key Differentiators
- ✨ **지능형 입력 방식**: 직접 입력 + AI 실천 제안 (OCR/텍스트 파싱 제거)
- 🎮 **게임화 시스템**: XP/레벨, 배지 21개, 스트릭, 월간 챌린지
- 📊 **AI 리포트**: 주간 실천 리포트 & 목표 진단 (Perplexity API)
- 📱 **Mobile App**: iOS/Android 네이티브 앱 (Expo 52)
- 🎓 **인터랙티브 튜토리얼**: UX 최적화 완료 ('마인드' 용어 적용)

### Implementation Status (v2.0)
✅ **Phase 1-2 완료**: 코어 기능 (만다라트 입력, 체크, 통계)
✅ **Phase 3 완료**: 게임화 시스템 (XP, 배지, 스트릭)
✅ **리포트 완료**: AI 주간 실천 리포트, 목표 진단
✅ **튜토리얼 완료**: 인터랙티브 온보딩 (7단계)
✅ **PWA 배포**: 프로덕션 환경 구축 완료
✅ **Mobile App 완료**: iOS/Android 앱 개발 및 iPad 지원
✅ **글로벌 지원 완료**: 한국어/영어 i18n 적용
⏳ **Next**: 스토어 배포, AdMob 연동, 모니터링 강화

---

## 1. Problem Statement & Vision

### Problem Statement
1. **목표 설정은 쉽지만 실천은 어렵다**
   - 만다라트를 작성하고도 잊어버리는 사용자 다수
   - 일일 실천에 대한 체계적 관리 부재
   - 혼자서는 동기부여 유지 어려움

2. **기존 솔루션의 한계**
   - 수동 입력의 번거로움 (입력 장벽 높음)
   - 단순 체크리스트만 제공 (맥락 없는 관리)
   - AI 기반 개인화 코칭 부재

### Vision
"AI와 함께하는 실천의 동반자" - 모든 사람이 자신의 목표를 체계적으로 실천하고 성취할 수 있도록 돕는 플랫폼

---

## 2. Target Users

### Primary User Persona: "목표는 있지만 실천이 어려운 직장인"
- **연령**: 25-40세
- **특징**:
  - 자기계발에 관심 많지만 시간 부족
  - 만다라트 등 목표 설정 프레임워크에 익숙
  - 디지털 툴 활용에 거부감 없음
- **Pain Points**:
  - 작성한 목표를 잊어버림
  - 실천 동기 부족
  - 진행 상황 파악 어려움

### Secondary Personas
- 학생 (시험/진로 목표 관리)
- 창업가 (사업 목표 체계화)
- 자기계발 커뮤니티 리더

---

## 3. Feature Specifications

### Phase 1: Core Foundation (MVP v1.0)
**목표**: 만다라트 입력 + 기본 실천 체크 기능
**기간**: 2주

#### F1.1 만다라트 입력 시스템
**User Story**: 사용자는 자신이 작성한 만다라트를 앱에 쉽게 입력할 수 있어야 한다.

**입력 방식 선택 화면**:
- 온보딩 시 두 가지 옵션 제시
  1. 📸 **이미지 업로드**: "이미 작성한 만다라트가 있나요?"
  2. ✏️ **직접 입력**: "처음부터 작성하시겠어요?"

---

**방식 1: 이미지 업로드 & AI 인식 (v1.1.0에서 제거됨)**

> [!WARNING]
> 이 방식은 입력 데이터의 정확도와 사용성 복잡도 문제로 인해 v1.1.0에서 제거되었습니다. 현재는 '직접 입력'과 'AI 코칭'을 통한 생성을 권장합니다.

- **이전 사양**:
  - Google Cloud Vision OCR 기반 파싱
  - 9x9 그리드 자동 감지 및 텍스트 추출
  - (현재는 코드베이스에서 비활성화 또는 제거됨)

---

**방식 2: 직접 입력 (템플릿 기반)**

- **9x9 그리드 템플릿**
  - 빈 만다라트 그리드 제공
  - 중앙 셀부터 시작 (핵심 목표 입력)
  - 단계별 가이드:
    1. "핵심 목표를 입력하세요"
    2. "8개 세부 목표를 입력하세요"
    3. "각 세부 목표당 8개 실천 항목 입력"

- **입력 도우미**
  - 툴팁 안내: "구체적이고 측정 가능한 목표를 작성하세요"
  - 예시 템플릿 제공 (선택 가능):
    - "건강 개선"
    - "커리어 성장"
    - "인간관계 개선"
  - 자동 저장 (입력 중 데이터 손실 방지)

- **입력 진행 상태**
  - 프로그레스 바: "X/81 항목 입력 완료"
  - 미완성 셀 하이라이트
  - "나중에 계속하기" 버튼 (초안 저장)

**Acceptance Criteria**:
- [ ] 이미지 업로드 성공률 > 95%
- [ ] 한글 OCR 정확도 > 75% (Google Vision baseline)
- [ ] 직접 입력 완료까지 평균 시간 < 10분
- [ ] 수정 완료까지 평균 시간 < 3분
- [ ] 입력 방식 선택 → 완료까지 이탈률 < 30%

#### F1.2 실천 항목 체크리스트
**User Story**: 사용자는 추출된 실천 항목들을 매일 체크할 수 있어야 한다.

**기능 상세**:
- **Today View (오늘의 실천)**
  - 모든 실천 항목 리스트 표시
  - 체크박스 UI (완료 시 체크)
  - 완료된 항목: 회색 처리 + 취소선
  - 진행률 프로그레스 바 (X/81)

- **실천 항목 상세**
  - 클릭 시 모달 오픈
  - 소속 세부목표 표시
  - 메모 추가 기능 (선택사항)
  - 체크 이력 캘린더 뷰

**Acceptance Criteria**:
- [ ] 체크 동작 응답 시간 < 200ms
- [ ] 오프라인 체크 지원 (동기화는 온라인 시)
- [ ] 체크 취소 기능 제공

#### F1.3 사용자 인증 & 데이터 저장
**기술 스택**: Supabase Auth + PostgreSQL

**기능 상세**:
- **회원가입/로그인**
  - Email + Password
  - 소셜 로그인 준비 (Phase 2에서 활성화)
  - 비밀번호 재설정 플로우

- **데이터 동기화**
  - 실시간 동기화 (Supabase Realtime)
  - 다중 기기 지원
  - 충돌 방지 (last-write-wins)

**Database Schema (v1)**:
```sql
-- Users (Supabase Auth 기본 테이블 사용)

-- Mandalarts
CREATE TABLE mandalarts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  center_goal TEXT NOT NULL,
  input_method TEXT CHECK (input_method IN ('manual')) NOT NULL, -- v1.1.0 'manual'로 고정
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub Goals
CREATE TABLE sub_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mandalart_id UUID REFERENCES mandalarts(id) ON DELETE CASCADE,
  position INT NOT NULL, -- 1-8
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions (실천 항목)
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_goal_id UUID REFERENCES sub_goals(id) ON DELETE CASCADE,
  position INT NOT NULL, -- 1-8
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check History
CREATE TABLE check_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  UNIQUE(action_id, DATE(checked_at)) -- 하루에 한 번만 체크 가능
);
```

---

### Phase 2: Engagement Boost (MVP v1.1)
**목표**: 일일 리마인더로 사용자 참여 유도
**기간**: 1주

#### F2.1 일일 리마인더 알림
**User Story**: 사용자는 설정한 시간에 오늘 할 일을 알림으로 받아야 한다.

**기능 상세**:
- **Push Notification (PWA)**
  - 사용자 알림 권한 요청
  - 설정된 시간에 알림 발송
  - 알림 클릭 → Today View로 이동

- **알림 메시지 개인화**
  - 패턴 1: "오늘도 [핵심목표] 향해 한 걸음! 3개 항목 체크해볼까요?"
  - 패턴 2: "어제 5개 완료하셨네요! 오늘도 화이팅!"
  - 패턴 3: "[세부목표]에 집중하는 건 어때요?"

- **설정 옵션**
  - 알림 시간 설정 (기본: 오전 9시)
  - 알림 빈도 (매일 / 평일만 / 커스텀)
  - 알림 끄기 (Do Not Disturb)

**Acceptance Criteria**:
- [ ] 알림 도달률 > 90%
- [ ] 알림 클릭률 (CTR) > 15%
- [ ] 모바일 네이티브 푸시 알림 정상 작동 (Expo Notifications)

---

### Phase 3: Insights & Motivation (MVP v1.2)
**목표**: 진행 상황 시각화로 동기부여 강화
**기간**: 2주

#### F3.1 진행 상황 대시보드
**User Story**: 사용자는 자신의 실천 패턴과 성과를 한눈에 볼 수 있어야 한다.

**기능 상세**:
- **Overview Cards**
  - 총 실천율 (%)
  - 연속 체크 일수 (Streak)
  - 이번 주 완료 항목 수
  - 가장 활발한 세부목표

- **실천 히트맵 (GitHub-style)**
  - 지난 365일 체크 활동 시각화
  - 색상 강도: 0개(회색) → 10개+(진한 초록)
  - 호버 시 해당 날짜 상세 정보

- **세부목표별 진행률**
  - 8개 세부목표 각각의 완료율
  - 막대 그래프 / 원형 차트
  - 클릭 시 해당 목표의 액션 리스트

- **주간/월간 리포트**
  - 실천 트렌드 그래프
  - 가장 잘한 항목 / 소홀한 항목
  - AI 생성 인사이트 (Phase 4 연계)

**Acceptance Criteria**:
- [ ] 대시보드 로딩 시간 < 1초
- [ ] 모바일 반응형 지원
- [ ] 데이터 export 기능 (CSV)

---

### Phase 4: Gamification System (v1.5) ✅ **COMPLETED**
**목표**: XP/배지/스트릭으로 지속적 동기부여 제공
**기간**: 2주 (2025-11-10 ~ 11-12)

#### F4.1 XP 시스템 Phase 1 & 2 ✅
**구현 내용**:
- **하이브리드 로그 곡선**: 레벨 진행 속도 67% 개선
  - 레벨 10 도달: 66일 → 22일
  - 레벨 20 도달: 241일 → 66일
- **XP 배율 시스템** (4가지):
  - 주말 보너스 (1.5배)
  - 복귀 보너스 (1.5배, 3일간)
  - 레벨 마일스톤 (2배, 7일간)
  - 완벽한 주 (2배, 7일간)
- **부정방지**: 하루 3회 제한, 10초 간격, 스팸 감지

**참고**: `docs/features/XP_SYSTEM_PHASE2_COMPLETE.md`

#### F4.2 배지 시스템 (21개) ✅
**구현 내용**:
- **자동 해제 시스템**: RPC 함수 기반 실시간 평가
- **배지 카테고리**:
  - 스트릭 배지 (5개): 7일 ~ 150일 연속
  - 볼륨 배지 (4개): 10회 ~ 1000회 실천
  - 월간 배지 (4개): 80% ~ 100% 완료 (반복 가능)
  - 특별 배지 (8개): 활동일수, 완료율 등
- **토스트 알림**: 배지 획득 시 즉시 알림
- **NEW 인디케이터**: 새로 획득한 배지 표시
- **월간 자동 리셋**: Cron 스케줄러 (매월 1일)

**참고**: `docs/features/BADGE_SYSTEM_V5_RENEWAL.md` (v5.0 기획 완료, 미구현)

#### F4.3 스트릭 시스템 ✅
**구현 내용**:
- **연속 일수 추적**: KST 타임존 기반 정확한 계산
- **프리즈 기능**: 하루 놓쳐도 스트릭 유지 (제한적)
- **스트릭 배지**: 7일, 30일, 60일, 100일, 150일

#### F4.4 퀵 칩 (Quick Chips) ✅ **NEW**
**목표**: 실천 항목이 비어있을 때 사용자의 입력을 유도하는 지능형 UX
**구현 내용**:
- **필터링 로직**: 현재 세부목표 중 실천 항목이 8개 미만인 항목만 추천
- **제한**: 최대 4개의 칩 노출
- **인터랙션**: 칩 클릭 시 해당 세부목표의 실천 항목 추가 모달로 즉시 이동

---

### Phase 5: Tutorial & Onboarding (v1.6) ✅ **COMPLETED**
**목표**: 신규 사용자 활성화율 향상
**기간**: 3일 (2025-11-08 ~ 11-10)

#### F5.1 인터랙티브 튜토리얼 (7단계) ✅
**구현 내용**:
- **Step 1**: 환영 메시지
- **Step 2**: 만다라트 구조 설명
- **Step 3**: 만다라트 생성 방법
- **Step 4**: 실천 항목 체크 방법
- **Step 5**: 배지 시스템 소개
- **Step 6**: 리포트 활용법
- **Step 7**: 완료 축하
- **건너뛰기** 옵션 제공
- **재시작** 기능 (설정에서)

**파일**: `src/pages/TutorialPage.tsx`

---

### Phase 6: AI Reports (v1.7) ✅ **COMPLETED**
**목표**: AI 기반 분석으로 인사이트 제공 (대화형 코치 대신 리포트 형식)
**기간**: 1주 (2025-11-11 ~ 11-13)

#### F6.1 주간 실천 리포트 ✅
**User Story**: 사용자는 매주 자신의 실천 패턴을 AI 분석으로 리뷰할 수 있어야 한다.

**구현 내용**:
- **리포트 생성**: Perplexity API (sonar 모델)
- **분석 항목**:
  - 이번 주 실천 요약
  - 완료율 트렌드 분석
  - 가장 잘한 점 / 개선 포인트
  - 다음 주 실천 전략
- **UI**: 마크다운 렌더링, 이미지 공유 기능
- **Edge Function**: `generate-weekly-report`

#### F6.2 목표 진단 리포트 ✅
**구현 내용**:
- **SMART 기준 분석**: 만다라트 구조 진단
- **개선 제안**: AI 기반 구체적 피드백
- **Edge Function**: `generate-goal-diagnosis`

#### F6.3 AI 실천 추천 (Motivation Assist) ✅ **NEW**
**구현 내용**:
- **브레인스토밍 버튼**: 세부목표 및 실천 항목 편집 모달 내 '추천 받기' 버튼 추가
- **AI 로직**: 현재 상위 목표의 맥락을 분석하여 구체적이고 측정 가능한 실천 행동 3~5개 제안
- **통합**: 제안된 항목을 클릭하여 즉시 입력창에 반영 가능

### Phase 8: Conversational Coaching (v2.0) ⏳ **PLANNING**
**목표**: 단순 리포트를 넘어 사용자와 대화하며 목표를 함께 수립하는 'AI 코칭 컴패니언'
**주요 기능**:
- **Chat-First Discovery**: 고정된 7단계 폼 대신 자연스러운 대화로 정보(Slot) 추출
- **Constitutional Rules 적용**: 냉정한 현실 검증, 수학적 논리 체크, 동사 중심 행동 강제
- **실시간 만다라트 시각화**: 대화 내용이 실시간으로 만다라트 그리드에 반영
- **Emergency Mode 설계**: 컨디션 변동성을 고려한 '비상 계획' 수립 지원

---

## 4. Technical Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Vite                    │  │
│  │  - React Router (SPA routing)                    │  │
│  │  - TanStack Query (data fetching/caching)        │  │
│  │  - Zustand (state management)                    │  │
│  │  - Tailwind CSS + shadcn/ui (UI components)     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│                   Backend Layer                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Supabase (BaaS)                                 │  │
│  │  - PostgreSQL (data storage)                     │  │
│  │  - Auth (JWT-based authentication)               │  │
│  │  - Storage (image files)                         │  │
│  │  - Realtime (WebSocket subscriptions)            │  │
│  │  - Edge Functions (serverless API)               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↕ API
┌─────────────────────────────────────────────────────────┐
│                  AI Services Layer                      │
│  ┌─────────────────────────┐  ┌────────────────────┐   │
│  │  Google Cloud Vision    │  │  Perplexity API    │   │
│  │  (OCR)                  │  │  (AI Coaching)     │   │
│  └─────────────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack Details

#### Frontend (Web)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (fast HMR, optimized build)
- **Routing**: React Router v6
- **State Management**:
  - Zustand (global state)
  - TanStack Query (server state)
- **Styling**:
  - Tailwind CSS (utility-first)
  - shadcn/ui (accessible components)
- **PWA**:
  - Vite PWA Plugin
  - Workbox (service worker)

#### Mobile (React Native)
- **Framework**: React Native + Expo SDK 52
- **Styling**: NativeWind (Tailwind for RN)
- **Navigation**: React Navigation
- **Build**: EAS Build (Cloud)
- **Notifications**: Expo Notifications

#### Backend (Supabase)
- **Database**: PostgreSQL 15
- **Authentication**: Supabase Auth (JWT)
- **File Storage**: Supabase Storage
- **Realtime**: PostgreSQL Change Data Capture
- **Edge Functions**: Deno runtime (for AI API calls)

#### AI Integration
- **Image Recognition (OCR)**:
  - Provider: Google Cloud Platform
  - API: Cloud Vision API (Text Detection)
  - Features: Document text detection, handwriting recognition
  - Cost: $1.50 per 1,000 images (~$0.0015 per image)
  - Free tier: 1,000 units/month

- **Coaching Chatbot & Reports**:
  - Provider: Flexible (Perplexity, Gemini, OpenAI) - Switchable via Env Vars
  - Default: Perplexity (sonar) or Gemini (gemini-1.5-flash)
  - Management: See **[AI Model Management Guide](../../.gemini/antigravity/brain/147a9338-92cf-4332-9335-ed209eb6e58d/llm_management_guide.md)**
  - Cost: ~$0.01 per conversation (Perplexity/OpenAI), Free tier available (Gemini)

#### Infrastructure
- **Hosting**: Vercel (frontend), Supabase (backend)
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry (error tracking)
- **Analytics**: PostHog (privacy-focused)

---

## 5. AI Integration Strategy

### 5.1 Google Cloud Vision for Mandalart OCR

**Workflow**:
```
User uploads image
    ↓
Frontend: Resize to max 2000px (optimization)
    ↓
Upload to Supabase Storage
    ↓
Trigger Edge Function: process_mandalart_image
    ↓
Call Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)
    ↓
Receive OCR results (text + bounding boxes)
    ↓
Backend: Parse structure using bounding box coordinates
    ↓
Identify 9x9 grid layout and extract text by position
    ↓
Build structured JSON (center + 8 sub-goals + 64 actions)
    ↓
Save to PostgreSQL (mandalarts, sub_goals, actions tables)
    ↓
Return to frontend for user review
```

**Google Cloud Vision API Call**:
```typescript
// Edge Function: process_mandalart_image
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY,
  },
});

async function processMandalartImage(imageUrl: string) {
  // Step 1: Call Vision API
  const [result] = await client.documentTextDetection(imageUrl);
  const fullTextAnnotation = result.fullTextAnnotation;

  if (!fullTextAnnotation) {
    throw new Error('No text detected in image');
  }

  // Step 2: Extract text blocks with coordinates
  const blocks = fullTextAnnotation.pages[0].blocks.map(block => ({
    text: block.paragraphs.map(p =>
      p.words.map(w =>
        w.symbols.map(s => s.text).join('')
      ).join(' ')
    ).join('\n'),
    boundingBox: block.boundingBox,
    confidence: block.confidence
  }));

  // Step 3: Parse 9x9 grid structure
  const gridData = parseMandalartGrid(blocks);

  return gridData;
}

function parseMandalartGrid(blocks) {
  // Sort blocks by position (top-to-bottom, left-to-right)
  const sortedBlocks = blocks.sort((a, b) => {
    const aTop = a.boundingBox.vertices[0].y;
    const bTop = b.boundingBox.vertices[0].y;
    if (Math.abs(aTop - bTop) > 50) return aTop - bTop;
    return a.boundingBox.vertices[0].x - b.boundingBox.vertices[0].x;
  });

  // Expected 9x9 = 81 cells, but allow some flexibility
  // Group into 9 rows of 9 cells each
  const grid = [];
  for (let i = 0; i < Math.min(81, sortedBlocks.length); i++) {
    grid.push(sortedBlocks[i].text);
  }

  // Identify center goal (position 40, 0-indexed)
  const centerGoal = grid[40] || '';

  // Extract 8 sub-goals (positions around center in 9x9 layout)
  // Positions: top-left, top-center, top-right, left, right, bottom-left, bottom-center, bottom-right
  const subGoalPositions = [30, 31, 32, 39, 41, 48, 49, 50];

  const subGoals = subGoalPositions.map((pos, idx) => {
    const title = grid[pos] || '';
    // Each sub-goal has 8 actions in its 3x3 grid (excluding center which is sub-goal title)
    const actions = extractActionsForSubGoal(idx, grid);

    return {
      position: idx + 1,
      title,
      actions
    };
  });

  return {
    center_goal: centerGoal,
    sub_goals: subGoals
  };
}

function extractActionsForSubGoal(subGoalIndex: number, grid: string[]) {
  // Map each sub-goal to its 3x3 grid area in the 9x9 layout
  // This is complex logic based on mandalart structure
  // For simplicity, return placeholder - implement detailed mapping
  const actionMappings = {
    0: [0,1,2,9,11,18,19,20], // Top-left sub-goal actions
    1: [3,4,5,12,14,21,22,23], // Top-center sub-goal actions
    // ... (complete mapping for all 8 sub-goals)
  };

  const positions = actionMappings[subGoalIndex] || [];
  return positions.map(pos => grid[pos] || '').filter(Boolean);
}
```

**Structure Recognition Logic**:
- Mandalart is divided into 9 regions (3x3 of 3x3)
- Center region: Core goal + 8 sub-goals
- 8 outer regions: Each contains 1 sub-goal (center) + 8 actions
- Use bounding box coordinates to map text to correct cells
- Handle rotations and perspective distortions

**Error Handling**:
- Text confidence < 0.7 → Flag low-confidence cells for manual review
- Missing cells (< 81 detected) → Show template overlay for correction
- API timeout → Retry with exponential backoff (max 3 attempts)
- Invalid grid structure → Fallback to manual input mode

**Cost Optimization**:
- Image compression before upload (reduce API data transfer)
- Cache OCR results (store raw_ocr_data in DB)
- Free tier: 1,000 images/month = $0 (covers MVP)
- Expected usage: 100 users × 1 upload = 100 images/month
- Estimated cost (post-MVP): $0.15/month (100 images beyond free tier)

---

### 5.2 Perplexity for AI Coaching
> 관련 문서: `docs/project/AI_MANDALART_COACHING_MILESTONE.md`, `docs/project/AI_MANDALART_COACHING_EXECUTION_PLAN.md`

**Context Building**:
```typescript
interface CoachingContext {
  user_id: string;
  mandalart: {
    center_goal: string;
    sub_goals: string[];
  };
  recent_activity: {
    last_7_days_check_rate: number;
    total_checks_this_week: number;
    low_performance_areas: string[];
  };
  conversation_history: Message[];
}
```

**System Prompt Optimization**:
AI는 다음의 **헌법(Constitutional Rules)**을 준수해야 함:
1. **냉정한 도발**: 사용자의 자기기만과 추상적 목표를 지적함
2. **수학적 검증**: 시간/비용/수익의 논리적 타당성을 계산함
3. **동사 중심**: 모든 실행 항목을 '동사+숫자' 조합으로 강제함
4. **시스템 중심**: 실패 방지를 위한 '비상 모드'를 반드시 설계함

**Conversation Flow Management**:
- Session timeout: 30 minutes
- Max context: Last 10 messages
- Auto-save conversation history
- Daily conversation limit: 20 messages (prevent abuse)

**Cost Management**:
- Average conversation: 5 turns × $0.002 = $0.01
- Expected usage: 30% of DAU engage daily
- Monthly cost estimate (100 DAU): 100 × 0.3 × 30 × $0.01 = $9

---

## 6. Data Model & API Design

### Core Entities Relationship
```
User (Supabase Auth)
  ↓ 1:N
Mandalart
  ↓ 1:8
SubGoal
  ↓ 1:8
Action (실천 항목)
  ↓ 1:N
CheckHistory
```

### API Endpoints (Supabase Edge Functions)

#### Mandalart Management
```typescript
// Create via image upload
POST /api/mandalarts/from-image
Body: { image: File }
Response: { id: string, ocr_status: 'processing' | 'completed', data: MandalartData }

// Create via manual input
POST /api/mandalarts/manual
Body: { center_goal: string, sub_goals: SubGoal[] }
Response: { id: string, data: MandalartData }

GET /api/mandalarts/:id
Response: { mandalart: Mandalart, sub_goals: SubGoal[], actions: Action[] }

PUT /api/mandalarts/:id
Body: { center_goal?: string, sub_goals?: SubGoal[] }
Response: { success: boolean }

DELETE /api/mandalarts/:id
Response: { success: boolean }
```

#### Action Tracking
```typescript
POST /api/actions/:id/check
Body: { note?: string }
Response: { checked: boolean, check_id: string }

DELETE /api/checks/:check_id
Response: { success: boolean }

GET /api/actions/:id/history
Query: { from: date, to: date }
Response: { checks: CheckHistory[] }
```

#### Analytics
```typescript
GET /api/analytics/dashboard
Response: {
  total_actions: number,
  completed_actions: number,
  completion_rate: number,
  streak_days: number,
  heatmap_data: { date: string, count: number }[],
  sub_goal_progress: { sub_goal_id: string, progress: number }[]
}

GET /api/analytics/weekly-report
Response: {
  week_start: date,
  summary: string, // AI-generated
  top_achievements: string[],
  improvement_areas: string[],
  next_week_suggestions: string[]
}
```

#### AI Coaching
```typescript
POST /api/chat
Body: { message: string, session_id?: string }
Response: {
  reply: string,
  session_id: string,
  context_used: CoachingContext
}

GET /api/chat/history/:session_id
Response: { messages: Message[] }
```

---

## 7. User Experience & UI/UX Guidelines

### Design Principles
1. **Simplicity First**: 3-click rule to any action
2. **Mobile-First**: Thumb-friendly interactions
3. **Instant Feedback**: Visual confirmation within 200ms
4. **Progressive Disclosure**: Show advanced features only when needed

### Key User Flows

#### Flow 1: Onboarding (First-Time User)
```
1. Landing Page → "시작하기" CTA
2. Sign Up (Email/Password)
3. Welcome Modal: "만다라트를 만들어보세요!"
4. Input Method Selection:
   - Option A: 📸 "이미지 업로드" → Path A
   - Option B: ✏️ "직접 입력" → Path B

--- Path A (Image Upload) ---
5a. Image Upload → AI Processing (Loading animation + progress)
6a. OCR Results Preview (confidence indicators)
7a. Review & Edit Screen (9x9 grid with corrections)
8a. Save → Today View (체크리스트)

--- Path B (Manual Input) ---
5b. Empty 9x9 Grid Template
6b. Guided Input:
    - Step 1: "핵심 목표를 입력하세요" (center cell)
    - Step 2: "8개 세부 목표 입력" (surrounding cells)
    - Step 3: "각 세부목표당 8개 실천 항목 입력"
7b. Progress Indicator (X/81 cells completed)
8b. Save → Today View (체크리스트)

--- Common Path (Post-Input) ---
9. Notification Permission Request
10. Onboarding Tour: "매일 체크하고 AI 코치와 대화하세요!"
11. First Check Prompt: "오늘 실천할 항목 3개를 골라보세요"
```

#### Flow 2: Daily Check-In (Returning User)
```
1. Push Notification (9:00 AM)
2. Click → Opens Today View
3. Scroll → Check completed items
4. View progress bar update in real-time
5. (Optional) Open AI Coach chat for motivation
```

#### Flow 3: Struggling User → AI Coaching
```
1. User notices low check rate
2. Dashboard shows "실천율이 떨어졌어요. AI 코치와 대화해볼까요?" banner
3. Click → Chat opens with context-aware first message
4. Conversation: Identify barriers → Suggest solutions
5. Coach recommends adjusting specific actions
6. User updates actions → Re-commits
```

### Responsive Design Breakpoints
- Mobile: < 640px (primary target)
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 8. MVP Implementation Roadmap

### Phase 1: Core Foundation (Week 1-2)
**Deliverables**:
- [ ] Project setup (React + Vite + TypeScript)
- [ ] Supabase project initialization
- [ ] Database schema + migrations
- [ ] Authentication UI (signup/login)
- [ ] **Input method selection screen** (image vs manual)
- [ ] **Path A: Image Upload**
  - [ ] Image upload component (drag-drop, camera)
  - [ ] Google Cloud Vision API integration (Edge Function)
  - [ ] OCR result parsing logic (grid structure detection)
- [ ] **Path B: Manual Input**
  - [ ] Empty 9x9 grid template component
  - [ ] Guided step-by-step input flow
  - [ ] Progress tracking (X/81 cells)
  - [ ] Auto-save draft functionality
- [ ] **Common Features**
  - [ ] 9x9 grid editor component (shared by both paths)
  - [ ] Inline cell editing
  - [ ] Today View (action checklist)
  - [ ] Check/uncheck functionality with DB sync

**Success Metrics**:
- Input method selection → completion rate > 70%
- **Path A (Image)**: Upload success > 95%, OCR accuracy > 75%
- **Path B (Manual)**: Avg completion time < 10min, abandonment < 30%
- E2E onboarding completion rate > 70%

---

### Phase 2: Engagement Boost (Week 3)
**Deliverables**:
- [ ] PWA configuration (manifest, service worker)
- [ ] Push notification setup
- [ ] User notification preferences UI
- [ ] Scheduled notification logic (Edge Function + cron)
- [ ] Notification personalization (dynamic messages)

**Success Metrics**:
- Notification permission grant rate > 60%
- Notification click-through rate > 15%

---

### Phase 3: Insights & Motivation (Week 4-5)
**Deliverables**:
- [ ] Dashboard page layout
- [ ] Overview cards (stats widgets)
- [ ] Heatmap component (365-day activity)
- [ ] Sub-goal progress charts
- [ ] Analytics API endpoints
- [ ] Data export (CSV download)

**Success Metrics**:
- Dashboard load time < 1s
- User views dashboard avg 2x/week

---

### Phase 4: AI Coaching (Week 6-7)
**Deliverables**:
- [ ] Chat UI component (floating button + modal)
- [ ] Chat history storage (DB)
- [ ] Perplexity API integration
- [ ] Context builder (user data → AI prompt)
- [ ] Conversation session management
- [ ] Weekly AI report generator (Edge Function)

**Success Metrics**:
- Chat engagement rate > 20% of DAU
- Avg conversation length > 3 turns
- User satisfaction rating > 4.0/5.0

---

### Post-MVP Enhancements (Future Phases)
**Phase 5: Social & Sharing**
- Public profile pages
- Share achievements on social media
- Friend accountability features

**Phase 6: Advanced AI**
- Predictive analytics (risk of dropping off)
- Personalized action suggestions
- Voice-based check-ins

**Phase 7: Enterprise**
- Team/organization accounts
- Manager dashboards
- Integration with productivity tools (Notion, Slack)

---

## 9. Success Metrics & KPIs

### North Star Metric
**Daily Active Users (DAU)** - Measures true engagement and habit formation

### Primary Metrics
| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|------------------|
| **Activation Rate** | > 70% | > 80% |
| (Complete onboarding) | | |
| **DAU / MAU** | > 30% | > 50% |
| (Stickiness) | | |
| **Avg Checks/User/Week** | > 10 | > 20 |
| (Engagement depth) | | |
| **Week 2 Retention** | > 40% | > 60% |
| (Early retention) | | |

### Secondary Metrics
- **Mandalart Completion Rate**: % of users who complete grid setup
- **AI Chat Engagement**: % of users who send > 3 messages
- **Notification Opt-In Rate**: % who enable push notifications
- **NPS (Net Promoter Score)**: User recommendation likelihood

### Analytics Implementation
- **Tool**: PostHog (self-hosted, privacy-friendly)
- **Key Events**:
  ```typescript
  // Onboarding
  posthog.capture('signup_completed')
  posthog.capture('mandalart_uploaded')
  posthog.capture('mandalart_saved')

  // Engagement
  posthog.capture('action_checked', { action_id, sub_goal_id })
  posthog.capture('dashboard_viewed')
  posthog.capture('chat_message_sent', { session_id })

  // Retention
  posthog.capture('notification_clicked')
  posthog.capture('weekly_report_opened')
  ```

---

## 10. Technical Constraints & Requirements

### Performance Requirements
- **First Contentful Paint (FCP)**: < 1.5s
- **Time to Interactive (TTI)**: < 3s
- **Lighthouse Score**: > 90 (Performance, Accessibility, Best Practices)

### Browser Support
- Chrome/Edge: Last 2 versions
- Safari: Last 2 versions (iOS 15+)
- Firefox: Last 2 versions
- No IE11 support (PWA limitations)

### Security Requirements
- HTTPS only (enforced)
- JWT token expiration: 7 days
- Password requirements: min 8 chars, 1 uppercase, 1 number
- Rate limiting:
  - API: 100 req/min per user
  - AI Chat: 20 messages/day per user
- OWASP Top 10 compliance

### Accessibility (WCAG 2.1 Level AA)
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratio > 4.5:1
- Focus indicators visible
- Alt text for images

---

## 11. Risk Analysis & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **AI API outage** | Medium | High | Implement retry logic, fallback to manual input, status page monitoring |
| **OCR accuracy issues** | High | Medium | Manual correction UI, save raw image for retry, A/B test different prompts |
| **PWA notification delivery** | Medium | Medium | Fallback to email reminders, educate users on browser permissions |
| **Database scaling** | Low | High | Use Supabase connection pooler, implement query optimization, monitor slow queries |
| **High AI costs** | Medium | High | Set daily limits per user, cache common responses, optimize prompts for token usage |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low user activation** | High | Critical | Simplify onboarding, improve OCR UX, add sample templates |
| **Poor retention** | High | Critical | A/B test notification timing/content, improve AI coaching quality, gamification |
| **AI coaching feels generic** | Medium | High | Collect feedback, iterate on prompts, add personality options |
| **Feature overload** | Medium | Medium | Strict MVP scope, defer non-essential features, user testing |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **High burn rate (AI costs)** | Medium | High | Freemium model (limit AI usage for free tier), sponsor/grant funding |
| **Market competition** | Low | Medium | Focus on unique AI coaching, Korean market specificity, rapid iteration |
| **Privacy concerns** | Low | High | Clear privacy policy, data anonymization, GDPR compliance, self-hosted analytics |

---

## 12. Open Questions & Decisions Needed

### Technical Decisions
- [ ] **Image storage optimization**: Should we delete original images after OCR? (storage cost vs. re-processing)
- [ ] **Offline-first architecture**: How deep should offline support go? (just UI caching vs. full offline CRUD)
- [ ] **AI model switching**: When should we evaluate Perplexity alternatives? (cost/quality thresholds)

### Product Decisions
- [ ] **Freemium model**: When to introduce paid tier? What features should be premium?
- [ ] **Gamification**: Should we add badges, streaks, leaderboards? (engagement vs. extrinsic motivation concerns)
- [ ] **Social features**: Allow sharing mandalarts publicly? Privacy implications?

### Design Decisions
- [ ] **Empty state handling**: What if user has no checks for 7 days? Gentle nudge vs. aggressive re-engagement?
- [ ] **AI voice/tone**: Should coach be more professional or casual/friendly? A/B test different personas?

---

## 13. Appendix

### Glossary
- **Mandalart**: 9x9 goal-setting framework (1 center + 8 sub-goals × 8 actions each)
- **Action**: Specific, actionable task under a sub-goal (총 64개)
- **Check**: Daily completion mark for an action
- **Streak**: Consecutive days with at least 1 check
- **DAU**: Daily Active Users (logged in + performed action)

### References
- [Mandalart Method Explained](https://example.com/mandalart-guide)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Cloud Vision API Documentation](https://cloud.google.com/vision/docs)
- [Perplexity API Documentation](https://docs.perplexity.ai/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

### Change Log
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-29 | Product Team | Initial draft based on discovery session |
| 1.1 | 2025-10-29 | Product Team | **Major updates**: (1) Added dual input methods (image upload + manual template), (2) Changed Vision AI from Claude to Google Cloud Vision, (3) Updated cost estimates to $10-15/month, (4) Revised onboarding flow with input method selection, (5) Added input_method field to database schema |
| 2.0 | 2025-11-15 | Product Team | **Production Release Update**: (1) Status changed to "Production (MVP Deployed)", (2) Added Phase 4-6 completion status (Gamification, Tutorial, AI Reports), (3) Updated Key Differentiators with 3 input methods, gamification, PWA, (4) Added Implementation Status section, (5) Documented XP system (Phase 1 & 2), Badge system (21 badges), Tutorial system (7 steps), (6) AI Coaching replaced with AI Reports (weekly practice + goal diagnosis), (7) Updated cost estimates with gamification system overhead, (8) Marked completed phases, (9) Next focus: Code quality & monitoring |

---

## Next Steps

### Immediate Actions (Post-Launch Phase)
1. ✅ **Phase 1-3 완료**: 코어 기능, UX 개선, 게임화 시스템
2. ✅ **Phase 4-6 완료**: 튜토리얼, AI 리포트, PWA 배포
3. **Phase 7 (진행 중)**: 코드 품질 & 안정성
   - TypeScript/ESLint 정리
   - 성능 최적화 (번들 크기, Lighthouse Score)
   - 에러 핸들링 개선
   - 테스트 추가 (Vitest)
4. **Phase 8 (계획)**: 모니터링 & 운영 강화
   - 이벤트 추적 설정 (mandalart_created, badge_unlocked 등)
   - CI/CD 파이프라인 (GitHub Actions)
   - 백업 & 복구 전략
5. **사용자 피드백 수집**:
   - KPI 측정 (DAU/MAU, 온보딩 완료율, 배지 획득률)
   - 사용자 인터뷰 (N=10)
   - A/B 테스트 (알림 시간, 배지 메시지)

### Success Criteria (Post-Launch)
- ✅ MVP 배포 완료 (Vercel + Supabase)
- ✅ 핵심 기능 100% 구현
- ✅ PWA 설치 가능 (모바일 최적화)
- ✅ 게임화 시스템 구축 (XP, 배지, 스트릭)
- ✅ AI 리포트 시스템 (주간 실천 + 목표 진단)
- [ ] DAU/MAU > 30% (측정 중)
- [ ] 7일 리텐션 > 40% (측정 중)
- [ ] 배지 획득 평균 > 5개 (측정 중)

---

**Document Status**: 🟢 Production (v2.0)
**Next Review Date**: 2025-12-01
**Last Updated**: 2025-11-15
