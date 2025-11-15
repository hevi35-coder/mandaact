# Phase 1-A: Image OCR - 진행 상황

**날짜**: 2025-11-01
**상태**: ✅ 완료

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
- `ocr-mandalart` Edge Function 생성 및 배포 (v4)
- Google Cloud Vision API 통합 (DOCUMENT_TEXT_DETECTION)
- JWT 인증 로직 구현 (scope 추가로 해결)
- **위치 기반 OCR 파싱 로직 구현** (9x9 그리드)
- 한글/영어 언어 힌트 추가
- Supabase Secrets 설정 (GCP credentials)

### 4. Git ✅
- Phase 1-A 초기 구현 커밋 및 푸시
- Storage RLS 정책 커밋 및 푸시

### 5. OCR 인식 품질 ✅
- **DOCUMENT_TEXT_DETECTION** 적용 (문서 전용 OCR)
- 언어 힌트 추가 (`ko`, `en`)
- 위치 기반 파싱으로 만다라트 구조 정확히 인식

---

## ✅ 해결된 문제

### 1. GCP 인증 문제 (해결 ✅)
**문제**: "Failed to get access token" 에러
**원인**: Google Cloud Vision API JWT에 **scope** 누락
**해결**:
```typescript
const jwt = await new SignJWT({
  scope: 'https://www.googleapis.com/auth/cloud-vision',
})
```

### 2. OCR 파싱 문제 (해결 ✅)
**문제**:
- 핵심목표와 세부목표 위치 무시
- 한 칸 내 여러 줄을 다른 항목으로 인식

**해결**:
- Vision API의 `boundingPoly` 활용하여 9x9 그리드 매핑
- 같은 셀 내 텍스트 통합
- 중앙(4,4) = 핵심목표, 주변 8칸 = 세부목표
- 각 3x3 블록에서 액션 자동 추출

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

---

## 🎯 추가 개선 가능 사항 (선택적)

1. **이미지 전처리**: 대비 증가, 노이즈 제거
2. **AI 후처리**: Perplexity API로 OCR 결과 정제
3. **하이브리드 OCR**: Tesseract.js 병행 사용
4. **사용자 피드백 학습**: 수정 패턴 분석

---

**완료 일시**: 2025-11-01
**최종 버전**: ocr-mandalart v4
**상태**: 테스트 완료, 정상 작동
