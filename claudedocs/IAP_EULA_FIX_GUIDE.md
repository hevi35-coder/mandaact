# IAP 구독 상품 EULA 링크 추가 가이드

**작성일**: 2025-12-23
**문제**: 구독 그룹 상품 "개발자의 조치가 필요함" 상태
**원인**: Terms of Use (EULA) 링크 누락
**해결 소요 시간**: 15분 (심사 승인: 1~3일)

---

## 문제 요약

Apple App Review 거부 사유:
```
Guideline 3.1.2 - Business - Payments - Subscriptions

We were unable to find the following required item(s) in your app's metadata:
– A functional link to the Terms of Use (EULA)
```

**핵심 원인**: 자동 갱신 구독 상품은 반드시 EULA 링크를 앱 메타데이터에 포함해야 함

**현재 상태**:
- ✅ Terms of Use 페이지 존재: https://mandaact.vercel.app/terms
- ✅ Privacy Policy 페이지 존재: https://mandaact.vercel.app/privacy
- ❌ App Store Connect 메타데이터에 링크 미등록
- ❌ 구독 상품 "개발자의 조치가 필요함" 상태

---

## 즉시 해결 방법 (15분)

### Step 1: App Store Connect에서 구독 상품 업데이트

#### 1.1 Subscription Group 설정

1. [App Store Connect](https://appstoreconnect.apple.com) 접속
2. **My Apps** → **MandaAct** 선택
3. **Features** 탭 → **In-App Purchases** → **Subscriptions**
4. **Subscription Group** (현재 1개 있을 것) 클릭
5. **Subscription Group Information** 섹션에서:
   - **Privacy Policy URL**: `https://mandaact.vercel.app/privacy` 입력
   - **저장** 클릭

#### 1.2 각 구독 상품 설정 (Monthly, Yearly)

**Monthly 상품 (com.mandaact.sub.premium.monthly)**:
1. Subscription Group 내에서 Monthly 상품 클릭
2. **App Store Information** 섹션 찾기
3. 다음 필드 입력:
   - **Privacy Policy URL**: `https://mandaact.vercel.app/privacy`
4. **저장** 클릭

**Yearly 상품 (com.mandaact.sub.premium.yearly)**:
1. Subscription Group 내에서 Yearly 상품 클릭
2. **App Store Information** 섹션 찾기
3. 다음 필드 입력:
   - **Privacy Policy URL**: `https://mandaact.vercel.app/privacy`
4. **저장** 클릭

#### 1.3 앱 정보에도 추가 (보조)

1. App Store Connect → **MandaAct** → **App Information**
2. **Support URL** 확인 (이미 설정되어 있을 것)
3. **Privacy Policy URL** 필드 확인:
   - 입력되어 있지 않으면: `https://mandaact.vercel.app/privacy` 입력
   - **저장**

---

### Step 2: Apple App Review 팀에 회신

1. App Store Connect → **MandaAct** 선택
2. 상단에 "개발자의 조치가 필요함" 또는 "Developer Action Required" 배너 확인
3. **View Details** 또는 **세부사항 보기** 클릭
4. **Reply in App Store Connect** 또는 **회신** 버튼 클릭
5. 다음 메시지 작성:

```
Subject: Terms of Use and Privacy Policy Links Added

Hello App Review Team,

Thank you for your feedback regarding the missing Terms of Use link for our auto-renewing subscriptions.

I have now added the required links to the subscription products and subscription group:

Terms of Use: https://mandaact.vercel.app/terms
Privacy Policy: https://mandaact.vercel.app/privacy

Changes made:
1. Added Privacy Policy URL to the Subscription Group
2. Added Privacy Policy URL to each subscription product (Monthly and Yearly)
3. Added Privacy Policy URL to the app's App Information section

Both pages are live and fully accessible. The Terms of Use page includes:
- Service agreement
- User rights and responsibilities
- Subscription terms and conditions
- Auto-renewal policy
- Cancellation policy

The Privacy Policy page includes:
- Data collection and usage
- User privacy rights
- Data retention policy

Could you please review the submission again? Please let me know if you need any additional information.

Thank you for your patience.

Best regards,
MandaAct Team
```

6. **Send** 또는 **전송** 클릭

---

### Step 3: 구독 상품 재제출 (필요시)

상태가 자동으로 "Pending Review"로 변경되지 않으면:

1. **In-App Purchases** → **Subscriptions**
2. 각 구독 상품(Monthly, Yearly) 상태 확인
3. **Submit for Review** 버튼이 보이면 클릭
4. 심사 대기

---

## 페이지 내용 확인

### Terms of Use (https://mandaact.vercel.app/terms)
✅ 페이지 존재 확인됨 (HTTP 200)
- 이용약관 한국어/영어 포함
- 구독 관련 조항 포함
- 자동 갱신 정책 명시
- 취소 정책 명시

### Privacy Policy (https://mandaact.vercel.app/privacy)
✅ 페이지 존재 확인됨 (HTTP 200)
- 개인정보처리방침 한국어/영어 포함
- 데이터 수집 및 사용 명시
- 사용자 권리 명시

---

## 예상 타임라인

| 단계 | 소요 시간 |
|------|----------|
| App Store Connect 링크 추가 | 5분 |
| Apple에 회신 메시지 작성/전송 | 5분 |
| 구독 상품 재제출 | 5분 |
| **총 작업 시간** | **15분** |
| Apple 심사 대기 | 1~3일 |
| 심사 승인 후 IAP 활성화 | 1~24시간 |
| **예상 총 소요 시간** | **2~4일** |

---

## 완료 체크리스트

### ✅ App Store Connect 설정
```
[ ] Subscription Group에 Privacy Policy URL 추가
[ ] Monthly 상품에 Privacy Policy URL 추가
[ ] Yearly 상품에 Privacy Policy URL 추가
[ ] App Information에 Privacy Policy URL 확인/추가
[ ] 모든 변경사항 저장 완료
```

### ✅ Apple 회신
```
[ ] App Review 메시지에 회신 작성
[ ] Terms/Privacy 링크 포함
[ ] 변경 내역 설명
[ ] 회신 전송 완료
```

### ✅ 재제출
```
[ ] 구독 상품 상태 "Pending Review"로 변경 확인
[ ] 필요시 "Submit for Review" 클릭
[ ] 심사 대기 상태 확인
```

---

## 심사 승인 후 확인사항

승인 이메일 수신 후:

1. **구독 상품 상태 확인**:
   - App Store Connect → In-App Purchases
   - 모든 상품 "Approved" 또는 "Ready to Submit" 상태

2. **Production 활성화 대기**:
   - 승인 후 1~24시간 소요
   - 이 시간 동안 IAP가 서버에 활성화됨

3. **테스트 확인**:
   - App Store에서 앱 다운로드 (TestFlight 아님)
   - Premium 화면에서 플랜 노출 확인
   - 플랜이 보이지 않으면 "다시 시도" 클릭

---

## 문제 해결 (Troubleshooting)

### Case 1: Apple이 링크를 찾지 못한다고 회신
**증상**: "We still cannot find the Terms of Use link"
**조치**:
1. 브라우저에서 직접 링크 접근 테스트
2. 페이지가 로드되는지 확인
3. 페이지 내용에 실제 Terms/Privacy 내용이 있는지 확인
4. 스크린샷 첨부하여 재회신

### Case 2: 링크는 추가했지만 상태가 변경되지 않음
**증상**: "개발자의 조치가 필요함" 상태 유지
**조치**:
1. 48시간 대기
2. Apple에 Follow-up 메시지 전송
3. App Store Connect 지원팀에 문의

### Case 3: 심사 승인 후에도 플랜이 노출되지 않음
**증상**: 승인되었지만 App Store 앱에서 플랜 없음
**조치**:
1. 승인 후 24시간 대기 (IAP 활성화 지연)
2. `claudedocs/IAP_PRODUCTION_ISSUE_TROUBLESHOOTING.md` 참조
3. RevenueCat 설정 확인

---

## 추가 개선사항 (선택사항)

### 페이지 SEO 개선
Terms/Privacy 페이지에 메타 태그 추가로 크롤러 인식 개선:

**파일**: `apps/web/src/pages/TermsOfServicePage.tsx`
```tsx
// 페이지 상단에 Helmet 추가
import { Helmet } from 'react-helmet-async'

export default function TermsOfServicePage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service - MandaAct</title>
        <meta name="description" content="MandaAct Terms of Service and Subscription Agreement" />
      </Helmet>
      {/* 기존 내용 */}
    </>
  )
}
```

**파일**: `apps/web/src/pages/PrivacyPolicyPage.tsx`
```tsx
import { Helmet } from 'react-helmet-async'

export default function PrivacyPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - MandaAct</title>
        <meta name="description" content="MandaAct Privacy Policy and Data Protection" />
      </Helmet>
      {/* 기존 내용 */}
    </>
  )
}
```

---

## 참고 자료

### Apple 공식 문서
- [Auto-Renewable Subscriptions Guidelines](https://developer.apple.com/app-store/subscriptions/)
- [App Store Review Guidelines 3.1.2](https://developer.apple.com/app-store/review/guidelines/#business)
- [Paid Applications Agreement Schedule 2, 3.8(b)](https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-20240610-English.pdf)

### 관련 문서
- 전체 IAP 문제 해결 가이드: `claudedocs/IAP_PRODUCTION_ISSUE_TROUBLESHOOTING.md`

---

## 진행 상황 기록

### 2025-12-23 - 문제 발견 및 해결 방안 수립
- ✅ 원인 파악: EULA 링크 누락
- ✅ Terms/Privacy 페이지 존재 확인 (HTTP 200)
- ✅ 해결 가이드 작성
- ⏳ **다음 단계**: App Store Connect에 링크 추가 및 Apple 회신

### 해결 후 업데이트 예정
```
[ ] App Store Connect 업데이트 완료 시각:
[ ] Apple 회신 전송 시각:
[ ] 심사 승인 시각:
[ ] IAP Production 활성화 확인 시각:
[ ] 문제 완전 해결 확인:
```

---

**마지막 업데이트**: 2025-12-23
**작성자**: Claude Code
**우선순위**: 🔴 긴급 (Production 서비스 영향)
