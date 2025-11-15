# 외부 서비스 설정 가이드

MandaAct 프로젝트에 필요한 외부 서비스를 설정하는 상세 가이드입니다.

---

## 📋 설정할 서비스 목록

1. ✅ **Supabase** - 데이터베이스, 인증, 스토리지
2. ✅ **Google Cloud Vision API** - 이미지 OCR (만다라트 인식)
3. ✅ **Perplexity API** - AI 코칭 챗봇

**예상 소요 시간**: 30-40분

---

## 1️⃣ Supabase 설정

### Step 1: Supabase 계정 생성 및 프로젝트 생성

1. **Supabase 웹사이트 접속**
   - URL: https://supabase.com
   - "Start your project" 클릭

2. **계정 생성**
   - GitHub 계정으로 로그인 (권장)
   - 또는 이메일로 회원가입

3. **새 프로젝트 생성**
   - "New Project" 버튼 클릭
   - 프로젝트 정보 입력:
     - **Name**: `mandaact` (또는 원하는 이름)
     - **Database Password**: 강력한 비밀번호 설정 (나중에 필요 없음)
     - **Region**: `Northeast Asia (Seoul)` 또는 가까운 지역
     - **Pricing Plan**: Free (무료)
   - "Create new project" 클릭
   - ⏳ 프로젝트 생성 완료까지 약 2분 대기

---

### Step 2: API 키 복사

프로젝트가 생성되면:

1. 왼쪽 사이드바에서 **⚙️ Settings** 클릭
2. **API** 메뉴 클릭
3. 다음 두 가지 정보를 복사해두세요:

#### ① Project URL
```
예시: https://abcdefghijklmn.supabase.co
```

#### ② anon public (API Key)
```
예시: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**📝 메모장에 임시 저장하세요!**

---

### Step 3: 데이터베이스 스키마 생성

1. 왼쪽 사이드바에서 **🗂️ SQL Editor** 클릭
2. "New query" 버튼 클릭
3. 다음 파일의 내용을 복사:
   - 파일 위치: `supabase/migrations/20251029000001_initial_schema.sql`
   - 또는 아래에서 직접 복사

<details>
<summary>📄 데이터베이스 스키마 SQL (클릭하여 펼치기)</summary>

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mandalarts table
CREATE TABLE mandalarts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  center_goal TEXT NOT NULL,
  input_method TEXT CHECK (input_method IN ('image', 'manual')) NOT NULL,
  image_url TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sub Goals table
CREATE TABLE sub_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mandalart_id UUID REFERENCES mandalarts(id) ON DELETE CASCADE NOT NULL,
  position INT NOT NULL CHECK (position >= 1 AND position <= 8),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Actions (실천 항목) table
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_goal_id UUID REFERENCES sub_goals(id) ON DELETE CASCADE NOT NULL,
  position INT NOT NULL CHECK (position >= 1 AND position <= 8),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Check History table
CREATE TABLE check_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  note TEXT,
  UNIQUE(action_id, DATE(checked_at AT TIME ZONE 'UTC'))
);

-- Indexes for performance
CREATE INDEX idx_mandalarts_user_id ON mandalarts(user_id);
CREATE INDEX idx_sub_goals_mandalart_id ON sub_goals(mandalart_id);
CREATE INDEX idx_actions_sub_goal_id ON actions(sub_goal_id);
CREATE INDEX idx_check_history_action_id ON check_history(action_id);
CREATE INDEX idx_check_history_user_id ON check_history(user_id);
CREATE INDEX idx_check_history_checked_at ON check_history(checked_at);

-- Row Level Security (RLS) policies
ALTER TABLE mandalarts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_history ENABLE ROW LEVEL SECURITY;

-- Mandalarts policies
CREATE POLICY "Users can view their own mandalarts"
  ON mandalarts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mandalarts"
  ON mandalarts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mandalarts"
  ON mandalarts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mandalarts"
  ON mandalarts FOR DELETE
  USING (auth.uid() = user_id);

-- Sub goals policies
CREATE POLICY "Users can view sub goals of their mandalarts"
  ON sub_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mandalarts
      WHERE mandalarts.id = sub_goals.mandalart_id
      AND mandalarts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sub goals for their mandalarts"
  ON sub_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mandalarts
      WHERE mandalarts.id = sub_goals.mandalart_id
      AND mandalarts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sub goals of their mandalarts"
  ON sub_goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mandalarts
      WHERE mandalarts.id = sub_goals.mandalart_id
      AND mandalarts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sub goals of their mandalarts"
  ON sub_goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM mandalarts
      WHERE mandalarts.id = sub_goals.mandalart_id
      AND mandalarts.user_id = auth.uid()
    )
  );

-- Actions policies
CREATE POLICY "Users can view actions of their mandalarts"
  ON actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sub_goals
      JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
      WHERE sub_goals.id = actions.sub_goal_id
      AND mandalarts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create actions for their mandalarts"
  ON actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sub_goals
      JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
      WHERE sub_goals.id = actions.sub_goal_id
      AND mandalarts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update actions of their mandalarts"
  ON actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sub_goals
      JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
      WHERE sub_goals.id = actions.sub_goal_id
      AND mandalarts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete actions of their mandalarts"
  ON actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sub_goals
      JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
      WHERE sub_goals.id = actions.sub_goal_id
      AND mandalarts.user_id = auth.uid()
    )
  );

-- Check history policies
CREATE POLICY "Users can view their own check history"
  ON check_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own check history"
  ON check_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own check history"
  ON check_history FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mandalarts updated_at
CREATE TRIGGER update_mandalarts_updated_at
  BEFORE UPDATE ON mandalarts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

</details>

4. SQL을 붙여넣고 **"Run"** 버튼 클릭 (또는 `Ctrl/Cmd + Enter`)
5. ✅ "Success. No rows returned" 메시지 확인

---

### Step 4: 테이블 확인

1. 왼쪽 사이드바에서 **📊 Table Editor** 클릭
2. 다음 4개 테이블이 생성되었는지 확인:
   - ✅ `mandalarts`
   - ✅ `sub_goals`
   - ✅ `actions`
   - ✅ `check_history`

---

## 2️⃣ Google Cloud Vision API 설정

### Step 1: Google Cloud 계정 생성

1. **Google Cloud Console 접속**
   - URL: https://console.cloud.google.com
   - Google 계정으로 로그인

2. **무료 체험 시작** (처음 사용하는 경우)
   - "무료로 시작하기" 클릭
   - 신용카드 등록 (자동 청구 없음, $300 크레딧 제공)

---

### Step 2: 프로젝트 생성

1. 상단 프로젝트 선택 드롭다운 클릭
2. "새 프로젝트" 클릭
3. 프로젝트 정보 입력:
   - **프로젝트 이름**: `mandaact` (또는 원하는 이름)
   - **위치**: 조직 없음 (개인 프로젝트)
4. "만들기" 클릭

---

### Step 3: Cloud Vision API 활성화

1. 왼쪽 메뉴에서 **API 및 서비스** → **라이브러리** 클릭
2. 검색창에 `Cloud Vision API` 입력
3. **Cloud Vision API** 클릭
4. **"사용"** 버튼 클릭
5. ✅ API 활성화 완료 (몇 초 소요)

---

### Step 4: Service Account 생성

1. 왼쪽 메뉴에서 **IAM 및 관리자** → **서비스 계정** 클릭
2. **"+ 서비스 계정 만들기"** 클릭
3. 서비스 계정 세부정보 입력:
   - **서비스 계정 이름**: `mandaact-vision`
   - **서비스 계정 ID**: 자동 생성됨
   - **설명**: `MandaAct Vision OCR service account`
4. **"만들기 및 계속하기"** 클릭

---

### Step 5: 역할 부여

1. **역할 선택** 드롭다운 클릭
2. 검색: `Cloud Vision`
3. **"Cloud Vision API 사용자"** 선택
4. **"계속"** 클릭
5. **"완료"** 클릭

---

### Step 6: JSON 키 생성

1. 생성된 서비스 계정 목록에서 방금 만든 계정(`mandaact-vision@...`) 클릭
2. 상단 **"키"** 탭 클릭
3. **"키 추가"** → **"새 키 만들기"** 클릭
4. **"JSON"** 선택
5. **"만들기"** 클릭
6. ✅ JSON 파일이 자동으로 다운로드됨

---

### Step 7: JSON 키 정보 확인

다운로드된 JSON 파일을 열면 다음과 같은 구조입니다:

```json
{
  "type": "service_account",
  "project_id": "mandaact-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "mandaact-vision@mandaact-xxxxx.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

**📝 다음 3가지 정보를 복사해두세요:**
- `project_id`
- `client_email`
- `private_key` (전체, `\n` 포함)

---

## 3️⃣ Perplexity API 설정

### Step 1: Perplexity 계정 생성

1. **Perplexity API 페이지 접속**
   - URL: https://www.perplexity.ai/settings/api
   - Google 또는 이메일로 로그인/회원가입

---

### Step 2: API 키 생성

1. **"Generate API Key"** 버튼 클릭
2. API Key 이름 입력 (예: `mandaact-dev`)
3. **"Generate"** 클릭
4. ✅ API 키가 표시됨

**⚠️ 중요**: 이 키는 한 번만 표시되니 즉시 복사하세요!

```
예시: pplx-abc123def456ghi789jkl...
```

**📝 안전한 곳에 저장하세요!**

---

### Step 3: 무료 크레딧 확인

- 신규 가입 시 무료 크레딧 제공
- Dashboard에서 사용량 확인 가능
- 크레딧 소진 후 유료 전환 (Phase 4에서 필요)

---

## 4️⃣ 환경 변수 설정

이제 모든 API 키를 `.env.local` 파일에 저장합니다.

### 자동 생성 (권장)

저(Claude Code)가 `.env.local` 파일을 생성해드립니다.
아래 정보를 제공해주세요:

**필요한 정보:**
1. Supabase Project URL
2. Supabase anon public key
3. Google Cloud Project ID
4. Google Cloud Service Account Email
5. Google Cloud Private Key
6. Perplexity API Key

---

### 수동 생성 (직접 하시는 경우)

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Cloud Platform
GCP_PROJECT_ID=mandaact-xxxxx
GCP_CLIENT_EMAIL=mandaact-vision@mandaact-xxxxx.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Perplexity API
PERPLEXITY_API_KEY=pplx-abc123def456...
```

**⚠️ 주의사항:**
- `GCP_PRIVATE_KEY`는 반드시 큰따옴표(`"`)로 감싸야 함
- `\n` (줄바꿈 문자)을 그대로 유지해야 함
- `.env.local`은 `.gitignore`에 포함되어 있어 Git에 업로드되지 않음

---

## 5️⃣ 설정 검증

### Step 1: 개발 서버 재시작

```bash
# 현재 서버 중지 (Ctrl + C)
# 또는 저에게 "서버 재시작" 요청

npm run dev
```

---

### Step 2: 브라우저 콘솔 확인

1. 브라우저에서 `http://localhost:5173` 접속
2. **F12** 또는 **우클릭 → 검사** → **Console** 탭 열기
3. 에러 메시지 확인:
   - ✅ **에러 없음**: 설정 완료!
   - ❌ **"Missing Supabase environment variables"**: `.env.local` 파일 확인
   - ❌ **CORS 에러**: Supabase URL 확인

---

### Step 3: Supabase 연결 테스트 (Phase 1에서 진행)

인증 기능 구현 후 회원가입/로그인으로 테스트합니다.

---

## ✅ 설정 완료 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] Supabase 데이터베이스 스키마 실행
- [ ] Supabase API 키 복사
- [ ] Google Cloud 프로젝트 생성
- [ ] Google Cloud Vision API 활성화
- [ ] Google Cloud Service Account 생성 및 JSON 키 다운로드
- [ ] Perplexity API 키 발급
- [ ] `.env.local` 파일 생성 및 모든 키 입력
- [ ] 개발 서버 재시작
- [ ] 브라우저 콘솔에서 에러 없음 확인

---

## 🎯 다음 단계

모든 설정이 완료되면:

1. **Phase 1 개발 시작**
   - 인증 시스템 (회원가입/로그인)
   - 만다라트 입력 화면
   - 체크리스트 기능

2. **첫 번째 기능 선택**
   - Option 1: 인증 시스템부터
   - Option 2: 만다라트 입력부터

---

## 🐛 문제 해결

### Supabase 연결 안 됨
```bash
# .env.local 파일 확인
cat .env.local

# URL이 https://로 시작하는지 확인
# anon key가 "eyJ"로 시작하는지 확인
```

### Google Cloud 인증 실패
- JSON 파일의 private_key에 `\n` 포함 여부 확인
- 큰따옴표로 감싸져 있는지 확인

### 환경 변수 적용 안 됨
```bash
# 서버 완전 재시작
# Ctrl + C로 중지 후
npm run dev
```

---

**설정 과정에서 막히는 부분이 있으면 언제든 질문해주세요!** 🚀
