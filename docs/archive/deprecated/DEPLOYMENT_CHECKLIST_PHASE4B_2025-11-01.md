# MandaAct Deployment Checklist

Phase 4-B AI Coaching 기능 배포를 위한 체크리스트입니다.

## 📊 현재 상태 (2025-11-01)

### ✅ 완료된 항목
- [x] Supabase 프로젝트 생성 완료
  - Project: `mandaact`
  - Reference ID: `gxnvovnwlqjstpcsprqr`
  - Region: Northeast Asia (Seoul)
- [x] 로컬 프로젝트와 Supabase 연결 완료
- [x] 코드 구현 완료
  - Frontend: ChatCoach 컴포넌트
  - Backend: Edge Function (chat)
  - Database: Migration 파일 작성

### ❌ 미완료 항목 (배포 필요)
- [ ] Database Migration 실행 (3개)
- [ ] Edge Function 배포 (chat)
- [ ] API Keys Secrets 설정 (PERPLEXITY_API_KEY)

---

## 🚀 배포 순서 (반드시 이 순서대로!)

### Step 1: Database Migration 실행 ⚠️ 가장 먼저!

**중요**: Edge Function이 chat_sessions, chat_messages 테이블에 의존하므로 DB 먼저 설정해야 합니다.

```bash
# Migration 상태 확인
supabase migration list

# 모든 마이그레이션 적용
supabase db push

# 적용 확인 (Remote 컬럼에 값이 있어야 함)
supabase migration list
```

**예상 결과**:
```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20251029000001 | 20251029000001 | 2025-10-29 00:00:01 ✅
   20251031000001 | 20251031000001 | 2025-10-31 00:00:01 ✅
   20251101000001 | 20251101000001 | 2025-11-01 00:00:01 ✅
```

**실행되는 내용**:
1. 20251029000001: 기본 테이블 생성 (mandalarts, sub_goals, actions, check_history)
2. 20251031000001: Action Type System (type, routine, mission 필드 추가)
3. 20251101000001: Chat 테이블 (chat_sessions, chat_messages)

**예상 소요 시간**: 30초 ~ 1분

---

### Step 2: Perplexity API Key 발급 및 설정

#### 2.1 API Key 발급

1. Perplexity 웹사이트 접속: https://www.perplexity.ai/
2. 로그인 또는 회원가입
3. Settings → API 섹션으로 이동
4. "Create API Key" 클릭
5. 생성된 키 복사 (한 번만 표시됨!)
   - 형식: `pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**비용**:
- Free tier 존재
- 예상 비용: 대화당 ~$0.01
- 월 100 사용자 기준: ~$9/월

#### 2.2 Supabase Secrets 설정

```bash
# API 키 설정 (위에서 복사한 키 사용)
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 설정 확인
supabase secrets list
```

**예상 결과**:
```
   NAME                | DIGEST
  ---------------------|--------
   PERPLEXITY_API_KEY  | ****** ✅
```

**예상 소요 시간**: 5분 (API 키 발급 포함)

---

### Step 3: Edge Function 배포

```bash
# chat 함수 배포
supabase functions deploy chat

# 배포 확인
supabase functions list
```

**예상 결과**:
```
ID | NAME | SLUG | STATUS  | VERSION | UPDATED_AT (UTC)
---|------|------|---------|---------|------------------
1  | chat | chat | ACTIVE  | 1       | 2025-11-01 12:00 ✅
```

**배포되는 내용**:
- `supabase/functions/chat/index.ts`
- Perplexity API 호출 로직
- Context Builder (만다라트 + 체크 이력 분석)
- 대화 히스토리 관리

**예상 소요 시간**: 1~2분

---

### Step 4: 기능 테스트

#### 4.1 프론트엔드 테스트

1. 애플리케이션 접속
   ```bash
   npm run dev
   # 또는 프로덕션 URL
   ```

2. 로그인 후 우측 하단 확인
   - 💬 플로팅 버튼 표시 확인

3. 채팅 테스트
   - 버튼 클릭 → 채팅 모달 오픈
   - 메시지 입력: "안녕하세요"
   - AI 응답 확인 (3~5초 소요)

#### 4.2 데이터베이스 확인

Supabase Dashboard → SQL Editor:

```sql
-- Chat 세션 확인
SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT 5;

-- 메시지 확인
SELECT
  cs.user_id,
  cm.role,
  cm.content,
  cm.created_at
FROM chat_messages cm
JOIN chat_sessions cs ON cm.session_id = cs.id
ORDER BY cm.created_at DESC
LIMIT 10;
```

#### 4.3 Edge Function 로그 확인

```bash
# 실시간 로그 보기
supabase functions logs chat --tail

# 최근 로그 보기
supabase functions logs chat --limit 50
```

**예상 소요 시간**: 5~10분

---

## 🔍 문제 해결

### Migration 실패

**증상**: `supabase db push` 실패

**해결**:
```bash
# 1. Remote 상태 확인
supabase migration list

# 2. 특정 마이그레이션만 실행 (필요시)
supabase db reset

# 3. 수동 실행 (Dashboard)
# Supabase Dashboard → SQL Editor에서 migration 파일 내용 복사 후 실행
```

### Edge Function 배포 실패

**증상**: `supabase functions deploy chat` 실패

**해결**:
```bash
# 1. 함수 파일 확인
cat supabase/functions/chat/index.ts

# 2. 재배포 시도
supabase functions deploy chat --no-verify-jwt

# 3. 로그 확인
supabase functions logs chat --limit 100
```

### API 호출 실패 (401 Unauthorized)

**원인**: Perplexity API 키 미설정 또는 잘못된 키

**해결**:
```bash
# 1. Secrets 확인
supabase secrets list

# 2. 키 재설정
supabase secrets unset PERPLEXITY_API_KEY
supabase secrets set PERPLEXITY_API_KEY=pplx-새로운키

# 3. Edge Function 재배포 (Secrets 반영)
supabase functions deploy chat
```

### AI 응답이 너무 느림 (>10초)

**원인**: Perplexity API 응답 지연 또는 네트워크 문제

**확인**:
```bash
# Edge Function 로그에서 API 응답 시간 확인
supabase functions logs chat --tail
```

**해결**:
- Perplexity API 상태 페이지 확인
- 모델 변경 고려 (현재: llama-3.1-sonar-small-128k-online)

---

## 📋 배포 후 확인 사항

### 필수 체크리스트

- [ ] Database
  - [ ] 3개 마이그레이션 모두 적용됨
  - [ ] chat_sessions 테이블 존재
  - [ ] chat_messages 테이블 존재
  - [ ] RLS 정책 활성화됨

- [ ] Edge Function
  - [ ] chat 함수 배포됨 (STATUS: ACTIVE)
  - [ ] 로그에 에러 없음

- [ ] Secrets
  - [ ] PERPLEXITY_API_KEY 설정됨

- [ ] Frontend
  - [ ] 플로팅 버튼 표시됨
  - [ ] 채팅 모달 정상 작동
  - [ ] 메시지 전송/수신 성공
  - [ ] 대화 히스토리 저장됨

### 성능 확인

```bash
# Edge Function 호출 통계
supabase functions stats chat

# Database 쿼리 성능 (Dashboard)
# Performance → Query Performance
```

---

## 🎯 예상 총 소요 시간

| 단계 | 예상 시간 | 실제 시간 |
|-----|----------|----------|
| 1. DB Migration | 1분 | |
| 2. API Key 설정 | 5분 | |
| 3. Edge Function 배포 | 2분 | |
| 4. 기능 테스트 | 10분 | |
| **합계** | **18분** | |

---

## 🚨 주의사항

1. **순서 엄수**: DB → Secrets → Edge Function 순서로 진행
2. **API 키 보관**: Perplexity API 키는 안전하게 보관 (재발급 불가)
3. **비용 모니터링**: Perplexity 사용량 주기적 확인
4. **로그 확인**: 배포 후 24시간 동안 로그 모니터링

---

## 📚 참고 문서

- [Phase 4-B Setup Guide](./PHASE_4B_SETUP.md) - 상세 설정 가이드
- [API Specification](./API_SPEC.md) - API 명세
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Perplexity API Docs](https://docs.perplexity.ai/)

---

**마지막 업데이트**: 2025-11-01
**작성자**: Claude Code
**프로젝트**: MandaAct Phase 4-B
