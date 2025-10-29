# Product Requirements Document (PRD)
# MandaAct - AI-Powered Mandalart Action Tracker

**Version**: 1.1
**Date**: 2025-10-29
**Status**: Draft
**Author**: Product Team

---

## Executive Summary

**MandaAct**는 만다라트(Mandalart) 목표 설정 프레임워크와 AI 기반 코칭을 결합하여 사용자의 실천율을 획기적으로 높이는 개인 목표 관리 서비스입니다.

### Core Value Proposition
"목표를 세우는 것은 쉽지만, 실천하는 것은 어렵다" - MandaAct는 AI 코치가 당신의 실천을 도와줍니다.

### Key Differentiators
- 📸 **유연한 입력**: 이미지 인식 또는 템플릿 기반 직접 입력 선택 가능
- 🤖 **AI 코칭**: 개인화된 동기부여와 실천 전략 제안
- 📊 **인사이트**: 실천 패턴 분석을 통한 자기 이해 향상

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

**방식 1: 이미지 업로드 & AI 인식**

- **이미지 업로드**
  - 지원 포맷: JPG, PNG, HEIC
  - 최대 크기: 10MB
  - 드래그앤드롭 / 파일 선택 / 카메라 촬영 지원

- **AI 이미지 인식 (Google Cloud Vision OCR)**
  - 9x9 만다라트 그리드 자동 감지
  - 한글 필기체 OCR 처리
  - 텍스트 위치 기반 구조 파싱
  - 구조화된 JSON 데이터 추출
  ```json
  {
    "center_goal": "핵심 목표",
    "sub_goals": [
      {
        "position": 1,
        "title": "세부 목표 1",
        "actions": ["실천1", "실천2", "실천3", ...]
      }
    ]
  }
  ```

- **수정 인터페이스** (이미지 & 직접 입력 공통)
  - AI 인식 결과를 9x9 그리드로 시각화
  - 셀 클릭 → 인라인 편집 가능
  - 드래그로 셀 내용 재배치
  - "인식 재시도" 버튼 제공 (이미지 업로드의 경우)

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
  input_method TEXT CHECK (input_method IN ('image', 'manual')) NOT NULL,
  image_url TEXT, -- NULL if input_method = 'manual'
  raw_ocr_data JSONB, -- NULL if input_method = 'manual'
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

### Phase 4: AI Coaching (MVP v2.0)
**목표**: AI 기반 대화형 코칭으로 차별화
**기간**: 2주

#### F4.1 대화형 AI 코치 챗봇
**User Story**: 사용자는 실천에 어려움을 느낄 때 AI 코치와 대화하며 해결책을 찾을 수 있어야 한다.

**기능 상세**:
- **Chat Interface**
  - 우측 하단 플로팅 버튼
  - 채팅 히스토리 유지 (세션별)
  - 마크다운 렌더링 지원

- **AI Model**: Perplexity API
  - Context: 사용자의 만다라트 구조 + 최근 체크 이력
  - 페르소나: "따뜻하고 격려하는 코치"
  - 응답 길이: 2-3문단 (간결함 유지)

- **대화 시나리오 예시**:
  ```
  User: 요즘 실천이 잘 안 돼요
  AI: 지난주 체크율이 30%로 떨어졌네요. 혹시 특정 목표가 부담스러우신가요?
      [세부목표] 중 어떤 부분이 가장 어려우신지 말씀해주세요.

  User: 운동 관련 항목이 힘들어요
  AI: 이해합니다. 운동 목표를 더 작고 쉬운 단계로 나눠보는 건 어떨까요?
      예를 들어 "매일 1시간 운동" 대신 "점심시간 10분 산책"부터 시작해보세요.
      작은 성공이 쌓이면 자신감도 생길 거예요!
  ```

- **프롬프트 엔지니어링**:
  ```
  You are a supportive life coach helping users achieve their Mandalart goals.

  User Context:
  - Center Goal: {center_goal}
  - Current Week Check Rate: {check_rate}%
  - Struggling Areas: {low_performance_goals}

  Guidelines:
  - Be warm, encouraging, and non-judgmental
  - Ask clarifying questions before giving advice
  - Suggest small, actionable steps
  - Reference their progress data when relevant
  - Keep responses concise (2-3 paragraphs max)
  ```

**Acceptance Criteria**:
- [ ] 응답 시간 < 3초
- [ ] 대화 만족도 > 4.0/5.0
- [ ] 세션당 평균 대화 턴 수 > 3

#### F4.2 AI 생성 인사이트 (주간 리포트)
**기능 상세**:
- 매주 일요일 저녁 자동 생성
- 내용:
  - 이번 주 실천 요약
  - 잘한 점 / 개선 포인트
  - 다음 주 추천 전략
- 이메일 + 앱 내 알림으로 전달

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

#### Frontend
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

- **Coaching Chatbot**:
  - Provider: Perplexity AI
  - Model: sonar-pro (initial), flexible for future change
  - Cost: ~$0.01 per conversation

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

**System Prompt**:
```
You are MandaAct Coach, a supportive AI helping users achieve their Mandalart goals.

User's Goals:
- Main: {center_goal}
- Focus Areas: {sub_goals}

Recent Performance:
- This week: {check_rate}% completion
- Struggling with: {low_performance_areas}

Your Role:
1. Empathize with challenges
2. Ask questions to understand root causes
3. Suggest small, actionable improvements
4. Celebrate wins, no matter how small

Tone: Warm, encouraging, non-judgmental
Format: 2-3 short paragraphs per response
```

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

---

## Next Steps

### Immediate Actions (Week 0)
1. **Validation**: Share PRD with 3-5 target users for feedback
2. **Technical Setup**:
   - Create GitHub repository
   - Set up Supabase project
   - Register Google Cloud Platform account + enable Vision API
   - Register Perplexity API account
3. **Design**: Create wireframes for Phase 1 screens (Figma/Excalidraw)
   - Input method selection screen
   - Image upload flow
   - Manual input template
   - Grid editor component
4. **Project Management**: Set up Linear/Notion for sprint planning

### Success Criteria for PRD Approval
- [ ] Stakeholder sign-off (product owner)
- [ ] Technical feasibility confirmed (lead engineer)
- [ ] MVP scope clearly defined and achievable in 7 weeks
- [ ] Budget approved (estimate: **$10-15/month for MVP** - Supabase Free + GCP Free tier + Perplexity)

---

**Document Status**: 🟡 Ready for Review
**Next Review Date**: 2025-11-05
**Approvers**: Product Owner, Tech Lead, Design Lead
