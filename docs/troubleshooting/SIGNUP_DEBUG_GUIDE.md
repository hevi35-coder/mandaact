# 회원가입 에러 디버깅 가이드

**작성일**: 2025-10-29
**이슈**: 중복 이메일 에러 메시지가 표시되지 않음

---

## 🔍 개선 사항

### 1. 에러 메시지 한글화
`src/store/authStore.ts`에서 Supabase 에러를 한글로 변환:

```typescript
- "User already registered" → "이미 가입된 이메일입니다"
- "invalid email" → "유효하지 않은 이메일 형식입니다"
- "Password should be" → "비밀번호는 최소 6자 이상이어야 합니다"
- "rate limit" → "너무 많은 요청이 발생했습니다"
```

### 2. 이메일 미인증 사용자 처리
```typescript
// 이미 가입했지만 이메일 인증을 안 한 경우
if (data.user && !data.session && data.user.identities?.length === 0) {
  throw new Error('이미 가입된 이메일입니다. 이메일 인증을 완료해주세요')
}
```

### 3. 디버그 로그 추가
`src/pages/SignUpPage.tsx`에 콘솔 로그 추가:
- 회원가입 시도 시작
- 성공/실패 로그

---

## 🧪 테스트 방법

### Step 1: 브라우저 개발자 도구 열기
```
Chrome: F12 또는 Cmd+Option+I (Mac)
Console 탭 확인
```

### Step 2: 중복 이메일 테스트
1. **첫 번째 회원가입**
   ```
   이메일: test@example.com
   비밀번호: test1234
   ```

   **예상 콘솔 출력**:
   ```
   Attempting signup with email: test@example.com
   Signup successful
   ```

2. **같은 이메일로 다시 회원가입**
   ```
   이메일: test@example.com (동일)
   비밀번호: test1234
   ```

   **예상 콘솔 출력**:
   ```
   Attempting signup with email: test@example.com
   Signup error: Error: 이미 가입된 이메일입니다
   Signup failed: Error: 이미 가입된 이메일입니다
   ```

   **예상 화면 표시**:
   ```
   🔴 이미 가입된 이메일입니다
   ```

---

## ⚙️ Supabase 설정 확인

### 이메일 확인 설정 확인
1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트: `gxnvovnwlqjstpcsprqr` 선택

2. **Authentication → Settings**
   - **Enable email confirmations** 확인

   **Case 1: 이메일 확인 활성화 (권장)**
   ```
   ✅ Enable email confirmations: ON

   → 첫 회원가입: 이메일 전송, 인증 대기 상태
   → 중복 회원가입: Supabase가 자동으로 막음 (보안상 이유로 명확한 에러 안 줄 수 있음)
   ```

   **Case 2: 이메일 확인 비활성화 (테스트용)**
   ```
   ❌ Enable email confirmations: OFF

   → 첫 회원가입: 즉시 가입 완료
   → 중복 회원가입: "User already registered" 에러
   ```

3. **Email Templates 확인**
   - Confirm signup 템플릿이 올바르게 설정되었는지 확인

---

## 🐛 문제 해결

### 문제 1: 에러 메시지가 전혀 안 뜸
**원인**: Supabase가 보안상 중복 이메일 정보를 숨김

**해결**:
```typescript
// Supabase 응답 전체를 로그로 확인
console.log('Supabase response:', { data, error })
```

### 문제 2: "이미 가입된 이메일입니다" 대신 다른 메시지
**원인**: Supabase 에러 메시지가 예상과 다름

**해결**:
```typescript
// authStore.ts에서 에러 메시지 전체 확인
console.error('Full error object:', error)
console.error('Error message:', error.message)
console.error('Error code:', error.status)
```

### 문제 3: 회원가입 성공인데 세션이 없음
**원인**: 이메일 확인 대기 상태

**확인**:
1. Supabase Dashboard → Authentication → Users
2. 사용자의 `email_confirmed_at` 컬럼 확인
3. `null`이면 이메일 확인 대기 중

**해결**: 이메일 확인 링크 클릭 또는 이메일 확인 비활성화

---

## 📋 체크리스트

테스트 전 확인사항:

- [ ] 브라우저 개발자 도구 콘솔 열림
- [ ] Supabase Dashboard에서 이메일 확인 설정 확인
- [ ] `.env.local`에 올바른 Supabase URL/Key 설정
- [ ] 개발 서버 실행 중 (http://localhost:5173)
- [ ] 네트워크 연결 정상

---

## 🔄 다음 테스트 시나리오

### 시나리오 1: 정상 회원가입
```
1. 새 이메일로 회원가입
2. 콘솔에서 "Signup successful" 확인
3. 홈페이지로 리다이렉트 확인
4. Supabase Dashboard에서 사용자 생성 확인
```

### 시나리오 2: 중복 이메일
```
1. 이미 가입한 이메일로 다시 회원가입
2. 콘솔에서 "Signup error" 확인
3. 화면에 에러 메시지 표시 확인
```

### 시나리오 3: 이메일 미인증 상태에서 재가입
```
1. 이메일 미인증 상태 사용자
2. 같은 이메일로 다시 회원가입
3. "이메일 인증을 완료해주세요" 메시지 확인
```

---

## 📝 테스트 결과 보고

테스트 후 다음 정보를 공유해주세요:

1. **브라우저 콘솔 로그** (스크린샷 또는 텍스트)
2. **화면에 표시된 에러 메시지**
3. **Supabase 이메일 확인 설정** (ON/OFF)
4. **실제 동작** (예상과 다른 부분)

---

## 🎯 예상 동작 (이메일 확인 ON)

**첫 번째 회원가입**:
```
입력: test@example.com / test1234
→ "회원가입 완료! 이메일로 전송된 인증 링크를 확인해주세요"
→ Supabase Users에 사용자 생성 (email_confirmed_at: null)
```

**두 번째 회원가입 (같은 이메일)**:
```
입력: test@example.com / test1234
→ 콘솔: "Signup error: ..."
→ 화면: "이미 가입된 이메일입니다" 또는 관련 메시지
```

---

**파일 수정 완료**:
- ✅ `src/store/authStore.ts` - 에러 메시지 한글화
- ✅ `src/pages/SignUpPage.tsx` - 디버그 로그 추가
- ✅ TypeScript 타입 체크 통과
