# AI Report Truncation 문제 분석 및 해결

## 📋 문제 요약

**현상**: 실천 리포트(weekly)와 목표 진단(diagnosis) 생성 시 JSON이 중간에 잘려서 파싱 실패

**영향**:
- 실천 리포트: 빈 내용 표시 (headline, metrics, detailContent 모두 비어있음)
- 목표 진단: 일부 필드만 표시 또는 "[object Object]" 표시
- 사용자가 리포트를 볼 수 없음

## 🔍 근본 원인 분석

### 1. Perplexity API Token 제한
**파일**: `supabase/functions/generate-report/index.ts:626`

```typescript
body: JSON.stringify({
  model: 'sonar',
  messages: [...],
  temperature: 0.7,
  max_tokens: 1000,  // ❌ 문제: 1000 토큰 제한
})
```

**문제점**:
- AI가 생성하는 JSON 응답이 1000 토큰을 초과
- Perplexity API가 응답을 중간에 잘라버림
- 잘린 JSON: `{"headline": "...", "key_metrics": [...]` (닫는 괄호 없음)
- JSON.parse() 실패 → 파싱 에러

**실제 사례**:
```
Console: "JSON parsing failed for weekly report, falling back to markdown:
SyntaxError: Expected ',' or '}' after property value in JSON at position 657"
```

### 2. 비효율적인 데이터 흐름

**현재 로직**:
```
AI 생성 (JSON)
  → max_tokens로 잘림
  → convertJsonToMarkdown() 변환 시도
  → Markdown 저장 (이미 잘린 상태)
  → Frontend에서 JSON 파싱 재시도
  → 파싱 실패 → fixTruncatedJSON() 복구 시도
  → 복구 실패 → Markdown fallback
  → Markdown도 잘려서 파싱 실패
  → 빈 화면
```

**문제점**:
1. **이중 변환**: JSON → Markdown → JSON (불필요한 오버헤드)
2. **정보 손실**: Markdown 변환 중 구조 정보 손실
3. **복구 어려움**: 이미 잘린 데이터를 복구하려는 시도

### 3. 프롬프트 길이

**Weekly Report**:
- System Prompt: ~390자
- User Prompt: ~510자
- **총 Input**: ~900자

**Diagnosis Report**:
- System Prompt: ~570자
- User Prompt: ~430자
- **총 Input**: ~1000자

**예상 Output**: 600-800자 (실제로는 1000 토큰 초과하여 잘림)

## ❌ 실패한 시도

### 시도 1: 프롬프트 최적화 (2025-11-14)
**변경 내용**:
- 문장 길이 제한: 25자
- 필드 축소: improvements 2개 → 1개
- metrics를 객체로 변경: `{"총": 35, "일수": 6}`
- 프롬프트 압축: ~50% 단축

**결과**: ❌ **품질 저하**
- AI 응답이 지나치게 간결해짐
- 인사이트가 얕고 실용성 떨어짐
- 사용자 피드백: "리포트 품질이 지극히 나빠졌어"
- **롤백 실행**

**교훈**: 프롬프트 최적화는 품질과 트레이드오프 관계

## ✅ 최종 해결책

### Option A: 빠른 수정 (30초)
**내용**: `max_tokens: 1000` → `max_tokens: 2000`

**장점**:
- 즉시 적용 가능
- 코드 변경 최소
- 품질 유지

**단점**:
- API 비용 약 2배 증가
- 여전히 제한 존재 (2000 토큰)
- 근본적 해결 아님

### Option B: 완전한 해결 (10분) ⭐ **채택**
**내용**: max_tokens 증가 + JSON 직접 저장

#### 1단계: max_tokens 증가
```typescript
max_tokens: 2000  // 1000 → 2000
```

#### 2단계: JSON 직접 저장 방식 변경
**변경 전**:
```typescript
// AI Response (JSON) → Markdown 변환 → 저장
const markdown = convertJsonToMarkdown(jsonResponse, reportType)
return markdown  // Markdown 저장
```

**변경 후**:
```typescript
// AI Response (JSON) → 그대로 저장
return JSON.stringify(jsonResponse)  // JSON 문자열 저장
```

#### 3단계: Frontend 파싱 단순화
**변경 전**:
```typescript
// Markdown → JSON 파싱 시도 → 실패 → Markdown fallback
parseWeeklyReport(content: string)
  → fixTruncatedJSON(content)
  → JSON.parse(jsonContent)
  → parseWeeklyReportMarkdown(content)  // fallback
```

**변경 후**:
```typescript
// JSON 직접 파싱 (Markdown fallback 제거)
parseWeeklyReport(content: string)
  → JSON.parse(content)  // 단순화
  → 파싱 성공하면 반환
  → 실패해도 fixTruncatedJSON() 자동 복구
```

## 📊 예상 효과

| 지표 | 변경 전 | 변경 후 | 개선 |
|------|---------|---------|------|
| **저장 크기** | ~1500자 (Markdown) | ~800자 (JSON) | **-47%** |
| **파싱 성공률** | ~30% | **~95%** | **+65%p** |
| **데이터 무결성** | 구조 정보 손실 | 완전 보존 | ✅ |
| **복구 가능성** | 낮음 (Markdown 구조 복잡) | 높음 (JSON 자동 보정) | ✅ |
| **API 비용** | 기준 | +100% | ⚠️ 증가 |
| **코드 복잡도** | 높음 (이중 변환) | 낮음 (단일 파싱) | ✅ |

## 🔄 마이그레이션 계획

### 단계 1: 새 리포트는 JSON 저장
- 새로 생성되는 리포트는 JSON 형식으로 저장
- 기존 Markdown 리포트는 그대로 유지 (하위 호환성)

### 단계 2: Frontend 양립성
```typescript
export function parseWeeklyReport(content: string): ReportSummary {
  // 1. JSON 파싱 시도
  try {
    const data = JSON.parse(content)
    if (data.headline && data.key_metrics) {
      return parseJsonFormat(data)
    }
  } catch (e) {
    // 2. Markdown fallback (기존 리포트용)
    return parseWeeklyReportMarkdown(content)
  }
}
```

### 단계 3: 점진적 전환
- 신규 리포트: JSON 저장 ✅
- 기존 리포트: Markdown 유지 (읽기만)
- 자연스럽게 JSON으로 전환됨

## 🎯 구현 체크리스트

- [ ] 문서화 완료
- [ ] Edge Function: `max_tokens` 2000으로 증가
- [ ] Edge Function: `convertJsonToMarkdown()` 제거, JSON 직접 반환
- [ ] Edge Function: 배포
- [ ] Frontend: 파싱 로직 단순화 (JSON 우선, Markdown fallback)
- [ ] 테스트: 새 리포트 생성 및 파싱 확인
- [ ] 모니터링: Console 로그로 JSON 저장 확인

## 📝 주요 파일

- `supabase/functions/generate-report/index.ts` (Lines 626, 658-666)
- `src/lib/reportParser.ts` (Lines 56-115, 178-232)
- `supabase/migrations/20251108000002_add_gamification_tables.sql` (Line 41: `content TEXT`)

## 🚀 배포 후 검증

1. **리포트 생성 테스트**:
   ```
   실천 리포트 "새로 생성" 클릭 → Console 확인:
   - "Successfully parsed JSON response: {...}"
   - "Parsed weekly JSON: {...}"
   - headline, metrics, detailContent 모두 출력됨
   ```

2. **JSON 저장 확인**:
   ```sql
   SELECT content FROM ai_reports
   WHERE report_type = 'weekly'
   ORDER BY generated_at DESC
   LIMIT 1;

   -- 예상 결과: {"headline":"...","key_metrics":[...],...}
   ```

3. **기존 리포트 호환성**:
   - 이전에 생성된 Markdown 리포트도 여전히 표시됨
   - Markdown fallback 로직 작동 확인

## 💡 추가 개선 아이디어

### 장기 최적화 (선택사항)
1. **Streaming API 도입**: 긴 응답도 실시간 처리
2. **압축 저장**: gzip으로 저장 크기 추가 감소
3. **CDN 캐싱**: 자주 조회되는 리포트 캐시
4. **분석 API 분리**: weekly/diagnosis를 별도 Edge Function으로 분리

---

**작성일**: 2025-11-14
**최종 수정**: 2025-11-14
**상태**: 구현 대기 중
