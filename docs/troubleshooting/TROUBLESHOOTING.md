# AI 코치 Unauthorized 에러 해결 가이드

## 증상
- AI 코치 채팅에서 메시지 전송 시 "Unauthorized" 에러 발생

## 원인 진단 순서

### 1. 로그인 상태 확인

**브라우저 개발자 도구 (F12) → Console 탭**

```javascript
// Supabase 세션 확인
const { data: { session } } = await window.supabase.auth.getSession()
console.log('Session:', session)
```

**예상 결과:**
- ✅ session이 있음 → 다음 단계로
- ❌ session이 null → **로그아웃 후 다시 로그인 필요**

---

### 2. Network 요청 확인

**브라우저 개발자 도구 (F12) → Network 탭**

1. 채팅에서 메시지 전송
2. `chat` 요청 찾기
3. **Headers 탭 확인:**
   ```
   Request Headers:
   Authorization: Bearer eyJ... (JWT 토큰이 있어야 함)
   Content-Type: application/json
   ```

**문제별 해결:**
- ❌ Authorization 헤더 없음 → 로그아웃 후 재로그인
- ❌ Authorization 값이 `undefined` → 세션 만료, 재로그인
- ✅ Authorization 있음 → Response 탭 확인

---

### 3. Response 에러 확인

**Network 탭 → Response 탭**

```json
{
  "error": "Unauthorized"
}
```

**가능한 원인:**
1. JWT 토큰 만료
2. Supabase 프로젝트 설정 문제
3. Edge Function 환경변수 문제

---

## 빠른 해결 방법

### 해결 1: 로그아웃 후 재로그인

```
1. 우측 상단 "로그아웃" 클릭
2. 로그인 페이지에서 다시 로그인
3. AI 코치 💬 버튼 클릭하여 재시도
```

### 해결 2: 브라우저 새로고침

```
1. Ctrl+Shift+R (또는 Cmd+Shift+R) - Hard Refresh
2. 자동 로그인 확인
3. AI 코치 재시도
```

### 해결 3: Local Storage 초기화

**개발자 도구 → Application 탭 → Local Storage**

```
1. https://localhost:5173 선택
2. 모든 항목 삭제 (Clear All)
3. 페이지 새로고침
4. 다시 로그인
```

---

## 고급 진단

### Edge Function 로그 확인

Supabase Dashboard에서:

```
1. https://supabase.com/dashboard/project/gxnvovnwlqjstpcsprqr
2. Edge Functions → chat
3. Logs 탭
4. 최근 에러 확인
```

**주요 에러 패턴:**
```
❌ "Missing authorization header" → 프론트엔드에서 헤더 전송 안 됨
❌ "Invalid JWT" → 토큰 만료 또는 잘못된 토큰
❌ "User not found" → 사용자 인증 실패
```

---

## 프론트엔드 코드 디버깅

ChatCoach 컴포넌트에 로그 추가:

```typescript
// src/components/ChatCoach.tsx의 sendMessage 함수 수정

const sendMessage = async () => {
  if (!user || !input.trim() || isLoading) return

  const userMessage = input.trim()
  setInput('')
  setError(null)
  setIsLoading(true)

  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    // 디버깅 로그 추가
    console.log('🔍 Session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      userId: user?.id
    })

    if (authError || !session) {
      console.error('❌ Auth error:', authError)
      throw new Error('Not authenticated')
    }

    console.log('✅ Sending message with token:', session.access_token.substring(0, 20) + '...')

    const response = await fetch(...)

    console.log('📡 Response status:', response.status)

    // 나머지 코드...
```

---

## 확인된 정상 상태

### 정상 로그 패턴

```
Console:
🔍 Session check: { hasSession: true, hasAccessToken: true, userId: "xxx..." }
✅ Sending message with token: eyJhbGciOiJIUzI1NiI...
📡 Response status: 200

Network:
POST https://gxnvovnwlqjstpcsprqr.supabase.co/functions/v1/chat
Status: 200 OK
Response: { reply: "...", session_id: "...", ... }
```

---

## 여전히 안 되는 경우

1. `.env.local` 확인:
   ```bash
   VITE_SUPABASE_URL=https://gxnvovnwlqjstpcsprqr.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ... (올바른 키)
   ```

2. 개발 서버 재시작:
   ```bash
   # Ctrl+C로 종료 후
   npm run dev
   ```

3. Supabase Secrets 확인:
   ```bash
   supabase secrets list
   # PERPLEXITY_API_KEY가 있어야 함
   ```

4. Edge Function 재배포:
   ```bash
   supabase functions deploy chat
   ```

---

## 연락처

문제가 지속되면 다음 정보와 함께 이슈 제기:

1. Console 탭 전체 로그 (스크린샷)
2. Network 탭 chat 요청 상세 (Headers + Response)
3. Edge Function Logs (Dashboard)
