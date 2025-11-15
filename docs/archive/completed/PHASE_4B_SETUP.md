# Phase 4-B: AI Coaching Setup Guide

Phase 4-B에서 추가된 AI 코칭 기능을 사용하기 위한 설정 가이드입니다.

## 0. 환경변수 관리 이해하기 (중요!)

### 왜 .env.local이 아닌 Supabase Secrets인가?

#### 실행 환경 분리

```
┌─────────────────────────────────────┐
│  Frontend (Browser)                 │
│  - React + Vite로 빌드               │
│  - .env.local의 VITE_* 변수 사용     │
│  - 클라이언트 사이드 실행             │
└─────────────────────────────────────┘
                 ↕ HTTPS
┌─────────────────────────────────────┐
│  Supabase Edge Function (Server)   │
│  - Deno 런타임                       │
│  - Supabase Secrets 접근            │
│  - 서버 사이드 실행                  │
│  - ❌ .env.local 접근 불가           │
└─────────────────────────────────────┘
```

**핵심:** Edge Function은 Supabase 클라우드에서 실행되므로 로컬 파일(`.env.local`)에 접근할 수 없습니다.

#### 보안 문제

만약 프론트엔드에서 직접 Perplexity API를 호출한다면:

```typescript
// ❌ 위험: API 키가 브라우저에 노출됨
const response = await fetch('https://api.perplexity.ai/chat', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_PERPLEXITY_API_KEY}`
    // ↑ 브라우저 개발자 도구 Network 탭에서 확인 가능
    // ↑ JavaScript 소스코드에 포함됨 (빌드해도 난독화만 됨)
  }
})
```

**문제점:**
- 사용자가 Network 탭에서 API 키를 쉽게 추출 가능
- 악의적 사용자가 키를 복사해서 무제한 사용 → 과금 폭탄 💸
- Rate limiting이나 사용자별 제한 불가능

현재 방식 (Edge Function 사용):

```typescript
// ✅ 안전: API 키는 서버에만 존재
const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
  headers: {
    'Authorization': `Bearer ${user_jwt_token}` // 사용자 인증 토큰
  },
  body: JSON.stringify({ message: "안녕하세요" })
})
// → Edge Function 내부에서만 Perplexity API 키 사용
// → 사용자는 절대 API 키를 볼 수 없음
```

#### 비용 관리

| 방식 | 비용 제어 | 악용 방지 |
|------|----------|----------|
| 프론트엔드 직접 호출 | ❌ 불가능 | ❌ 키 탈취 시 무제한 사용 |
| Edge Function | ✅ 서버에서 제어 | ✅ 인증/Rate limiting 가능 |

Edge Function에서:
- 일일 메시지 제한 구현 가능 (예: 20회/일)
- 사용자별 통계 수집
- 비정상 사용 패턴 감지 및 차단

#### 개발/프로덕션 환경 분리

```bash
# 개발 환경
supabase secrets set PERPLEXITY_API_KEY=pplx-dev-key \
  --project-ref dev-project-id

# 프로덕션 환경
supabase secrets set PERPLEXITY_API_KEY=pplx-prod-key \
  --project-ref prod-project-id
```

- 개발 중 프로덕션 API 비용 발생 방지
- 환경별 Quota 분리 관리
- 배포 시 환경변수 변경 불필요

### 정리

**`.env.local`에 PERPLEXITY_API_KEY가 있다면?**
- ⚠️ **제거하셔도 됩니다** - 실제로 사용되지 않습니다
- 또는 그대로 두셔도 무방합니다 - Edge Function이 읽지 않습니다
- `.env.example`의 주석을 참고하세요

**필수 설정:**
- ✅ Supabase Secrets에만 설정: `supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxx`
- ❌ .env.local에 설정: 불필요하며 혼란만 야기

---

## 1. Database Migration 실행

Chat 기능을 위한 테이블을 생성해야 합니다.

### 방법 1: Supabase Dashboard에서 직접 실행 (권장)

1. Supabase Dashboard 접속: https://app.supabase.com
2. 프로젝트 선택
3. SQL Editor 메뉴로 이동
4. 새 쿼리 생성
5. 아래 SQL 복사 후 실행:

```sql
-- supabase/migrations/20251101000001_add_chat_tables.sql 내용 복사
-- Chat Sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Chat Messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  context_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_last_message_at ON chat_sessions(last_message_at);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
  ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON chat_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages of their sessions"
  ON chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON chat_messages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their sessions"
  ON chat_messages FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Trigger
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET last_message_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_session_timestamp
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_message();
```

### 방법 2: Supabase CLI 사용 (로컬 개발 환경)

```bash
# Supabase 프로젝트 연결
supabase link --project-ref <your-project-ref>

# Migration 실행
supabase db push
```

## 2. Supabase Edge Function 배포

Chat 기능을 위한 Edge Function을 배포합니다.

```bash
# Supabase 로그인
supabase login

# Edge Function 배포
supabase functions deploy chat

# 환경변수 설정 (아래 3번 참조)
supabase secrets set PERPLEXITY_API_KEY=your_api_key_here
```

## 3. Perplexity API 키 발급 및 설정

### 3.1 Perplexity API 키 발급

1. Perplexity 웹사이트 접속: https://www.perplexity.ai/
2. 계정 생성/로그인
3. API 섹션으로 이동
4. API 키 생성
5. 생성된 키 복사 (한 번만 표시됨)

### 3.2 환경변수 설정

#### 로컬 개발 환경

`.env.local` 파일에 추가:
```bash
# Perplexity API (AI Coaching)
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxx
```

#### Supabase Edge Function

```bash
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxx
```

또는 Supabase Dashboard에서:
1. Settings > Edge Functions
2. Secrets 탭
3. 새 Secret 추가: `PERPLEXITY_API_KEY`

## 4. 기능 확인

1. 애플리케이션 실행
2. 로그인 후 대시보드 또는 Today 페이지로 이동
3. 우측 하단의 플로팅 버튼(💬) 확인
4. 버튼 클릭하여 AI 코치와 대화 시작
5. 메시지 전송 테스트

## 5. 주요 기능

### AI 코치 대화
- **위치**: 모든 페이지 우측 하단 플로팅 버튼
- **기능**:
  - 실시간 AI 코칭
  - 사용자의 만다라트 목표 기반 맥락 제공
  - 최근 7일 실천율 분석
  - 어려움 겪는 영역 식별 및 조언

### Context-Aware Coaching
AI 코치는 다음 정보를 자동으로 파악합니다:
- 핵심 목표
- 세부 목표 목록
- 지난 7일 실천율
- 연속 실천 일수
- 소홀한 영역 (체크 횟수 기준)

## 6. 비용 예상

### Perplexity API
- 모델: `llama-3.1-sonar-small-128k-online`
- 예상 비용: 대화당 약 $0.01
- 월 100명 사용자 기준: 약 $9/월

### Supabase
- Edge Function 호출: 무료 티어 범위 내 (500K 호출/월)
- Database: 기존 무료 티어 사용

## 7. 문제 해결

### Migration 실패
```sql
-- 테이블 존재 여부 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('chat_sessions', 'chat_messages');
```

### Edge Function 오류
```bash
# 로그 확인
supabase functions logs chat

# 재배포
supabase functions deploy chat --no-verify-jwt
```

### API 키 오류
- Perplexity API 키가 올바른지 확인
- Secrets가 제대로 설정되었는지 확인
- Edge Function이 최신 버전인지 확인 (재배포)

## 8. 다음 단계

Phase 4-B 완료 후:
- [ ] Phase 1-A: Image OCR (Google Cloud Vision)
- [ ] Phase 4-C: Weekly AI Reports (자동 생성)
- [ ] Advanced AI Features (예측 분석, 맞춤 제안 등)
