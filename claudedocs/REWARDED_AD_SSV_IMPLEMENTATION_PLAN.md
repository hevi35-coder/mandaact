# Rewarded Ad Server-Side Verification (SSV) 구현 계획

**작성일**: 2025-12-24
**우선순위**: 🟡 중요 (장기 계획)
**목적**: AdMob Rewarded Ad 완료를 서버 측에서 검증하여 100% 신뢰할 수 있는 보상 시스템 구축

---

## 배경

### 현재 상황 (Build 114)
- **클라이언트 측 검증**: PAID 이벤트 기반 Fallback 시스템
- **장점**: AdMob 정책 준수, SDK 이벤트 활용
- **단점**: 클라이언트 조작 가능성 존재

### 왜 SSV가 필요한가?
1. **100% 신뢰성**: Google 서버가 직접 우리 서버에 광고 완료 알림
2. **부정 방지**: 클라이언트 코드 조작으로 보상 획득 불가
3. **AdMob 공식 권장**: [Server-side verification](https://support.google.com/admob/answer/9603226)
4. **Premium 기능 보호**: 리포트 생성, XP 부스트 등 고가치 보상

---

## SSV 동작 원리

### 1. 광고 시청 프로세스

```
[사용자] → [앱] → [AdMob SDK] → [Google 서버]
                                        ↓
                                   [광고 표시]
                                        ↓
                              [사용자 광고 시청 완료]
                                        ↓
                          [Google → 우리 서버로 콜백]
                                        ↓
                            [서버: 사용자에게 보상 지급]
                                        ↓
                          [앱: 서버에서 보상 상태 확인]
```

### 2. 검증 흐름

```typescript
// Client (React Native)
1. 광고 요청 시 custom_data에 userId + requestId 포함
2. EARNED_REWARD 이벤트 → 즉시 보상 지급 (UX)
3. 백그라운드에서 서버에 검증 요청
4. 서버가 Google SSV 확인할 때까지 임시 보상

// Server (Supabase Edge Function)
1. Google으로부터 SSV 콜백 수신
2. signature 검증 (Google 공개키로 JWT 검증)
3. custom_data에서 userId + requestId 추출
4. DB에 영구 보상 기록 (rewarded_ad_verifications 테이블)
5. 사용자 보상 적용 (XP, 리포트 등)

// Reconciliation
1. 클라이언트 임시 보상과 서버 검증 비교
2. 불일치 시 서버 데이터를 신뢰
3. 부정 사용자 플래그/차단
```

---

## 구현 단계

### Phase 1: 서버 인프라 (1-2일)

#### 1.1 Supabase Edge Function 생성

**파일**: `supabase/functions/verify-rewarded-ad/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SSVCallbackPayload {
  ad_network: string
  ad_unit: string
  custom_data: string  // JSON: { userId, requestId, adType }
  reward_amount: number
  reward_item: string
  timestamp: string
  transaction_id: string
  signature: string
  key_id: number
}

serve(async (req) => {
  try {
    // 1. POST 요청만 허용
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // 2. 페이로드 파싱
    const payload: SSVCallbackPayload = await req.json()

    // 3. Signature 검증 (Google 공개키)
    const isValid = await verifyGoogleSignature(payload)
    if (!isValid) {
      console.error('Invalid signature from Google SSV')
      return new Response('Invalid signature', { status: 403 })
    }

    // 4. custom_data 파싱
    const customData = JSON.parse(payload.custom_data)
    const { userId, requestId, adType } = customData

    // 5. DB에 검증 기록 저장
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: insertError } = await supabase
      .from('rewarded_ad_verifications')
      .insert({
        user_id: userId,
        request_id: requestId,
        ad_type: adType,
        transaction_id: payload.transaction_id,
        reward_amount: payload.reward_amount,
        reward_item: payload.reward_item,
        verified_at: new Date().toISOString(),
        ad_network: payload.ad_network,
        ad_unit: payload.ad_unit,
      })

    if (insertError) {
      console.error('Failed to insert verification:', insertError)
      // Google에게는 성공 응답 (재시도 방지)
      return new Response('OK', { status: 200 })
    }

    // 6. 보상 지급 로직 실행
    await grantReward(supabase, userId, adType)

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('SSV callback error:', error)
    return new Response('Internal error', { status: 500 })
  }
})

async function verifyGoogleSignature(payload: SSVCallbackPayload): Promise<boolean> {
  // TODO: Implement Google signature verification
  // https://developers.google.com/admob/android/rewarded-video-ssv#verify_the_ssv_callback
  // 1. Google 공개키 fetch (캐시)
  // 2. JWT 검증
  return true // Placeholder
}

async function grantReward(supabase: any, userId: string, adType: string) {
  // TODO: 광고 타입별 보상 지급
  if (adType === 'REWARDED_REPORT_GENERATE') {
    // 리포트 생성 권한 부여
  } else if (adType === 'REWARDED_XP_BOOST') {
    // XP 부스트 적용
  }
  // ...
}
```

#### 1.2 Database Schema

**파일**: `supabase/migrations/YYYYMMDD_add_rewarded_ad_verification.sql`

```sql
-- 광고 검증 기록 테이블
CREATE TABLE rewarded_ad_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,  -- 클라이언트에서 생성한 고유 ID
  ad_type TEXT NOT NULL,  -- REWARDED_REPORT_GENERATE, REWARDED_XP_BOOST 등
  transaction_id TEXT NOT NULL UNIQUE,  -- Google이 제공하는 거래 ID
  reward_amount INTEGER NOT NULL,
  reward_item TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ad_network TEXT NOT NULL,
  ad_unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_rewarded_ad_verifications_user_id ON rewarded_ad_verifications(user_id);
CREATE INDEX idx_rewarded_ad_verifications_request_id ON rewarded_ad_verifications(request_id);
CREATE INDEX idx_rewarded_ad_verifications_transaction_id ON rewarded_ad_verifications(transaction_id);

-- RLS 정책
ALTER TABLE rewarded_ad_verifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 검증 기록만 읽을 수 있음
CREATE POLICY "Users can view own verifications"
  ON rewarded_ad_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 서비스 역할만 삽입 가능 (Edge Function에서만)
CREATE POLICY "Service role can insert verifications"
  ON rewarded_ad_verifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

---

### Phase 2: 클라이언트 통합 (1일)

#### 2.1 useRewardedAd Hook 수정

**파일**: `apps/mobile/src/hooks/useRewardedAd.ts`

```typescript
// custom_data 생성
const generateCustomData = (userId: string, adType: string) => {
  const requestId = `${userId}_${Date.now()}_${Math.random().toString(36)}`
  return {
    userId,
    requestId,
    adType,
    timestamp: Date.now(),
  }
}

// 광고 요청 시 custom_data 포함
const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: false,
  serverSideVerificationOptions: {
    customData: JSON.stringify(generateCustomData(user.id, adType)),
    userId: user.id,  // Google이 권장하는 필드
  },
})

// EARNED_REWARD 이벤트: 즉시 보상 (UX) + 백그라운드 검증 요청
const unsubEarned = rewardedAd.addAdEventListener(
  RewardedAdEventType.EARNED_REWARD,
  async (reward) => {
    rewardEarnedRef.current = true

    // 1. 즉시 보상 지급 (사용자 경험)
    onRewardEarned?.(reward)

    // 2. 백그라운드에서 서버 검증 상태 확인 (비동기)
    // 몇 초 후 서버에 검증 완료 여부 확인
    setTimeout(async () => {
      const verified = await checkServerVerification(requestId)
      if (!verified) {
        logger.warn('SSV not received yet, will reconcile later')
      }
    }, 5000)
  }
)
```

#### 2.2 서버 검증 확인 함수

```typescript
async function checkServerVerification(requestId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('rewarded_ad_verifications')
    .select('id, verified_at')
    .eq('request_id', requestId)
    .single()

  if (error || !data) {
    return false
  }

  return true
}
```

---

### Phase 3: AdMob 설정 (30분)

#### 3.1 App Settings

1. [AdMob Console](https://apps.admob.com) 접속
2. **Apps** → **MandaAct** 선택
3. **App settings** → **Server-side verification**
4. **Add callback URL**:
   ```
   https://[PROJECT_ID].supabase.co/functions/v1/verify-rewarded-ad
   ```
5. **Save**

#### 3.2 각 Rewarded Ad Unit 설정

각 광고 유닛별로 SSV 활성화:
- `REWARDED_REPORT_GENERATE`
- `REWARDED_XP_BOOST`
- `REWARDED_STREAK_FREEZE`
- `REWARDED_YESTERDAY_CHECK`

---

### Phase 4: 테스트 (1일)

#### 4.1 개발 환경 테스트

```typescript
// Test Ad Unit ID 사용
const TEST_SSV_AD_UNIT = 'ca-app-pub-3940256099942544/1712485313'

// 1. 광고 시청
// 2. Edge Function 로그 확인
// 3. rewarded_ad_verifications 테이블 확인
// 4. 보상 지급 확인
```

#### 4.2 검증 시나리오

| 시나리오 | 클라이언트 | SSV | 예상 결과 |
|---------|----------|-----|---------|
| 정상 완료 | ✅ EARNED_REWARD | ✅ Callback | 보상 지급 ✅ |
| SDK 버그 | ❌ No EARNED_REWARD | ✅ Callback | 보상 지급 ✅ (SSV 신뢰) |
| 조기 종료 | ❌ No EARNED_REWARD | ❌ No Callback | 보상 미지급 ❌ |
| 클라이언트 조작 | ✅ Fake EARNED_REWARD | ❌ No Callback | 보상 회수 (Reconciliation) |

---

## 보안 고려사항

### 1. Signature 검증 필수
```typescript
// Google 공개키로 JWT 검증
// https://www.gstatic.com/admob/reward/verifier-keys.json
const GOOGLE_PUBLIC_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json'

async function fetchGooglePublicKeys() {
  const response = await fetch(GOOGLE_PUBLIC_KEYS_URL)
  const keys = await response.json()
  // 캐시 (1시간)
  return keys
}
```

### 2. Replay Attack 방지
```typescript
// transaction_id는 UNIQUE constraint로 중복 방지
// request_id로 클라이언트-서버 매칭
```

### 3. Rate Limiting
```typescript
// Edge Function에 rate limiting 적용
// 사용자당 1분에 최대 5개 광고 검증
```

---

## Reconciliation (불일치 해소)

### 주기적 검증 작업

**파일**: `supabase/functions/reconcile-ad-rewards/index.ts`

```typescript
// 매 시간 실행 (Supabase Cron)
Deno.cron('Reconcile ad rewards', '0 * * * *', async () => {
  // 1. 최근 1시간 내 클라이언트 보상 지급 기록
  // 2. SSV 검증 기록과 비교
  // 3. 불일치 항목 처리:
  //    - SSV 있지만 클라이언트 없음 → 보상 지급
  //    - 클라이언트 있지만 SSV 없음 → 보상 회수 + 사용자 플래그
})
```

---

## 비용 및 성능

### Edge Function 비용
- Supabase Free Tier: 500K 요청/월
- 예상 사용량: 월 10K 광고 = 10K 요청
- **비용**: 무료 ✅

### 응답 시간
- Google SSV 콜백 → Edge Function: ~100-500ms
- 사용자는 클라이언트 측 즉시 보상으로 지연 느끼지 않음

---

## 마이그레이션 계획

### Phase 1: Soft Launch (1-2주)
- SSV 수신 및 로깅만 수행
- 클라이언트 로직은 PAID 기반 유지
- SSV 데이터 축적 및 신뢰성 검증

### Phase 2: Hybrid (2-4주)
- 클라이언트: 즉시 보상 지급
- 서버: SSV로 검증 및 Reconciliation
- 불일치 모니터링

### Phase 3: Full SSV (4주 후)
- 클라이언트는 임시 보상만 표시
- 서버 검증 완료 후 최종 보상 확정
- 부정 사용자 자동 차단

---

## 참고 자료

### Google AdMob 공식 문서
- [Server-side verification](https://support.google.com/admob/answer/9603226)
- [SSV Callbacks](https://developers.google.com/admob/android/rewarded-video-ssv)
- [Signature Verification](https://developers.google.com/admob/android/rewarded-video-ssv#verify_the_ssv_callback)

### React Native Google Mobile Ads
- [Server-side verification options](https://docs.page/invertase/react-native-google-mobile-ads/displaying-ads#server-side-verification)

### Supabase
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Cron Jobs](https://supabase.com/docs/guides/functions/schedule-functions)

---

## 체크리스트

### Phase 1: 서버 인프라
```
[ ] Supabase Edge Function 생성 (verify-rewarded-ad)
[ ] Database schema 마이그레이션 (rewarded_ad_verifications)
[ ] Google signature 검증 로직 구현
[ ] 보상 지급 로직 구현 (adType별)
[ ] Edge Function 배포 및 테스트
```

### Phase 2: 클라이언트 통합
```
[ ] useRewardedAd에 custom_data 추가
[ ] serverSideVerificationOptions 설정
[ ] 백그라운드 검증 확인 로직
[ ] Reconciliation UI (필요시)
```

### Phase 3: AdMob 설정
```
[ ] AdMob Console에 callback URL 등록
[ ] 각 광고 유닛에 SSV 활성화
[ ] Test Ad로 SSV 콜백 확인
```

### Phase 4: 테스트 및 모니터링
```
[ ] 개발 환경에서 E2E 테스트
[ ] TestFlight에서 실제 광고로 테스트
[ ] Soft Launch (로깅만)
[ ] Hybrid Mode (검증 + Reconciliation)
[ ] Full SSV Mode
```

---

**마지막 업데이트**: 2025-12-24
**작성자**: Claude Code
**우선순위**: 🟡 중요 (장기 계획, 4-6주 소요)
**현재 상태**: 📋 계획 수립 완료, 구현 대기 중
**선행 작업**: Build 114 (PAID 이벤트 기반) 안정화 확인 필요
