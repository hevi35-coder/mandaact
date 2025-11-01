# Phase 1-A: Image OCR - 진행 상황

**날짜**: 2025-11-01
**상태**: 🟡 진행 중 (GCP 인증 문제)

---

## ✅ 완료된 작업

### 1. UI 구현 ✅
- 입력 방식 선택 (이미지 업로드 vs 수동 입력)
- 이미지 업로드 UI with 미리보기
- 파일 검증 (타입, 크기)
- OCR 처리 로딩 상태

### 2. Storage 설정 ✅
- Supabase Storage bucket 생성: `mandalart-images`
- RLS 정책 migration 생성 및 적용
- 정책: 인증된 사용자 업로드, 공개 읽기, 소유자 관리

### 3. Edge Function ✅
- `ocr-mandalart` Edge Function 생성
- Google Cloud Vision API 통합 코드 작성
- JWT 인증 로직 구현
- OCR 텍스트 파싱 로직 구현
- Supabase Secrets 설정 (GCP credentials)
- Edge Function 배포 완료

### 4. Git ✅
- Phase 1-A 초기 구현 커밋 및 푸시
- Storage RLS 정책 커밋 및 푸시

---

## ❌ 현재 문제

### 에러 메시지
```
processing error: Error: Failed to get access token
    at handleProcessOCR (MandalartCreatePage.tsx:161:15)
```

### 발생 위치
Edge Function의 `createGoogleJWT()` 함수에서 Google OAuth2 토큰 교환 단계

### 가능한 원인

1. **GCP Private Key 형식 문제**
   - Supabase Secrets에 저장된 Private Key의 줄바꿈 문자(`\n`) 처리
   - Edge Function에서 `.replace(/\\n/g, '\n')` 처리가 제대로 안 될 수 있음

2. **GCP Service Account 권한 문제**
   - Vision API 사용 권한이 없을 수 있음
   - Service Account에 올바른 역할이 부여되지 않았을 수 있음

3. **GCP API 활성화 문제**
   - Cloud Vision API가 활성화되지 않았을 수 있음
   - OAuth2 API가 활성화되지 않았을 수 있음

4. **Secrets 환경변수 문제**
   - GCP_PRIVATE_KEY가 제대로 저장되지 않았을 수 있음
   - 특수 문자 이스케이핑 문제

---

## 🔧 다음 단계 (재개 시)

### 1. GCP 설정 확인
```bash
# Google Cloud Console에서 확인
1. Vision API 활성화 여부
2. Service Account 권한 확인
3. JSON 키 파일 재다운로드
```

### 2. Edge Function 디버깅
```typescript
// supabase/functions/ocr-mandalart/index.ts
// createGoogleJWT 함수에 로깅 추가

console.log('GCP Project ID:', gcpProjectId)
console.log('GCP Client Email:', gcpClientEmail)
console.log('Private Key first 50 chars:', gcpPrivateKey?.substring(0, 50))
```

### 3. 대체 방안
- Vision API 대신 Tesseract.js 사용 고려 (클라이언트 사이드 OCR)
- 또는 다른 OCR 서비스 고려

### 4. Secrets 재설정
```bash
# Private Key를 파일로 저장 후 설정
supabase secrets set GCP_PRIVATE_KEY="$(cat gcp-key.json | jq -r .private_key)"
```

---

## 📁 관련 파일

### Frontend
- `src/pages/MandalartCreatePage.tsx` - 이미지 업로드 UI

### Backend
- `supabase/functions/ocr-mandalart/index.ts` - OCR Edge Function
- `supabase/migrations/20251101000002_add_storage_policies.sql` - Storage RLS 정책

### 설정
- `.env.local` - 로컬 GCP credentials (참고용)
- Supabase Secrets - GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY

---

## 🐛 디버깅 명령어

### Supabase Secrets 확인
```bash
supabase secrets list
```

### Edge Function 로그 확인
```bash
# Supabase Dashboard → Edge Functions → ocr-mandalart → Logs
# 또는 CLI로 실시간 로그
supabase functions logs ocr-mandalart --tail
```

### Storage 정책 확인
```sql
-- Supabase Dashboard → SQL Editor
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
```

---

## 💡 참고사항

### Google Cloud Vision API 비용
- 첫 1,000개 요청/월: 무료
- 이후: $1.50 per 1,000 requests
- 현재 무료 크레딧($300) 사용 중

### Storage 용량
- Supabase 무료 티어: 1GB
- 이미지당 최대 5MB 제한

---

## 📚 관련 문서

- [Google Cloud Vision API 문서](https://cloud.google.com/vision/docs)
- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)

---

**다음 세션 시작 시**:
1. 이 파일 읽기
2. GCP 설정 재확인
3. Edge Function 로그 확인으로 시작

**예상 소요 시간**: 30분 ~ 1시간
**우선순위**: 중 (기능 작동하지만 OCR은 선택적)
