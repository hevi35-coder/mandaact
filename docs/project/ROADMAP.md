# MandaAct 개발 로드맵 v3.15

> 문서 인덱스: `docs/README.md`

**최종 업데이트**: 2025-12-17 - Build 84(TestFlight 제출) + 웹앱 랜딩 페이지 모드(단기 대응) 반영
**현재 상태**: Phase 4 완료 ✅ | Phase 5 완료 ✅ | Phase 8 기본 완료 ✅ | Phase 9.1 iPad 완료 ✅ | Phase 9.2 i18n(추가 누수 정리 진행) ✅ | Phase 10.2 AdMob 완료 ✅ | **Phase 10.3 스토어 배포(심사 대기)** 🔄

---

## 📊 현재 프로젝트 상태

### ✅ 완료된 Phase
- **Phase 1-A**: Image OCR (이미지 업로드) ✅
- **Phase 1**: UX 개선 (4개) ✅
- **Phase 2**: 기능 확장 (4개) ✅
- **Phase 2-B**: UX 개선 후속 (8개) ✅
- **Phase 3-A**: 게임화 시스템 ✅
  - XP 시스템 Phase 1 & 2 (배율 + 로그 곡선)
  - 배지 시스템 (21개 배지, 자동 해제)
  - 스트릭 시스템 (프리즈 포함)
  - 월간 배지 자동 리셋 (Cron)
- **Phase 3-B**: 튜토리얼 시스템 ✅
- **Phase 3-C**: 리포트 시스템 ✅
  - 주간 실천 리포트 (AI 분석)
  - 목표 진단 리포트 (SMART 기준)
- **PWA 배포**: 프로덕션 환경 구축 완료 ✅
- **Mobile App**: React Native 개발 완료 ✅ (100%)
  - Sentry 에러 추적 통합 (@sentry/react-native)
  - PostHog Analytics 통합 (posthog-react-native)
  - Production Logger 시스템
  - 환경변수 검증
  - React.memo 최적화
  - 공유 XP 유틸리티

### 🎯 핵심 기능 현황
| 기능 영역 | 상태 | 설명 |
|---------|------|------|
| 만다라트 생성 | ✅ 완료 | 이미지 OCR, 텍스트 파싱, 수동 입력 (3가지 방식) |
| 액션 관리 | ✅ 완료 | CRUD, 타입 시스템 (루틴/미션/참고), AI 추천, 인라인 편집 |
| 일일 체크 | ✅ 완료 | 오늘의 실천, 날짜 선택, 어제까지 체크 |
| 통계/리포트 | ✅ 완료 | 대시보드, 진행률, 히트맵, 만다라트 필터 |
| 게임화 | ✅ 완료 | XP/레벨, 배지 21개, 스트릭, 월간 챌린지 |
| 리포트 | ✅ 완료 | 주간 실천 리포트, 목표 진단 (AI 분석) |
| 튜토리얼 | ✅ 완료 | 인터랙티브 온보딩 (7단계) |
| 알림 | ✅ 완료 | PWA 푸시 알림, 권한 관리 |
| 인증 | ✅ 완료 | 이메일/비밀번호 로그인 |
| PWA | ✅ 완료 | 설치 가능, 오프라인 지원, 모바일 최적화 |

---

## 🔥 Phase 10: 스토어 배포 준비 🔄 **진행 중**

> **우선순위**: 🔴 Critical
> **목표**: CI/CD → AdMob 광고 → 스토어 배포 순서로 진행
> **예상 기간**: 3-5일

### 10.1 CI/CD 파이프라인 ✅ **완료** (2025-12-06)

**목표**: 모든 PR에서 자동 품질 검증

**완료 사항**:
- ✅ GitHub Actions 워크플로우 생성 (`.github/workflows/ci.yml`)
  - ✅ pnpm 워크스페이스 지원 (pnpm/action-setup@v4)
  - ✅ `pnpm type-check` 자동 실행
  - ✅ `pnpm lint` 자동 실행
  - ✅ `pnpm test` 자동 실행
  - ✅ `pnpm build:web` 검증
- ✅ 빌드 아티팩트 업로드 (7일 보관)
- ✅ README에 빌드 상태 배지 추가
- [ ] PR 체크 설정 (main 브랜치 보호) - GitHub 설정에서 수동 설정 필요

---

### 10.2 AdMob 광고 연동 ✅ **완료** (2025-12-07)

**목표**: 유저 불편 최소화 + 세련된 수익화 모델 구축
**상세 전략 문서**: [`docs/features/ADMOB_INTEGRATION.md`](../features/ADMOB_INTEGRATION.md)

#### 10.2.1 AdMob SDK 통합 (Phase 1) ✅ **완료**
- [x] AdMob 계정 설정
  - [x] Google AdMob 계정 생성
  - [x] iOS 앱 등록 (`ca-app-pub-3170834290529005~1573851405`)
  - [x] 광고 단위 ID 발급 (배너 3개, 전면 3개, 보상형 4개)
  - [x] 테스트 Ad Unit ID 자동 적용 (`__DEV__` 환경)
- [x] `react-native-google-mobile-ads` v14.x 설치
- [x] iOS 네이티브 설정 (`app.json` - GADApplicationIdentifier)
- [x] **배너 광고 구현**: HomeScreen, MandalartListScreen, ReportsScreen 하단 (TodayScreen은 Clean Zone 정책으로 제거)
- [x] **신규 사용자 보호 정책 적용**: 0-3일 광고 없음, 4-7일 배너만

#### 10.2.2 보상형 광고 시스템 (Phase 2) ✅ **완료**
- [x] `useRewardedAd` 훅 구현 (광고 로드/표시/보상 처리)
- [x] **XP 2배 부스트** (1시간)
  - [x] `XPBoostButton` 컴포넌트 구현
  - [x] HomeScreen 배치 (ProfileCard와 StreakCard 사이)
  - [x] TodayScreen 배치 (ProgressCard 아래)
  - [x] `xp_multipliers` 테이블 연동

#### 10.2.3 추가 보상형 광고 (Phase 3) ✅ **완료** (2025-12-07)
- [x] `StreakFreezeButton` 컴포넌트 구현
- [x] `YesterdayCheckButton` 컴포넌트 구현
- [x] `ReportGenerateButton` 컴포넌트 구현
- [x] **StreakFreezeButton 화면 연동**: StreakCard 내 배치 (현재 정책/UX 이유로 비활성화)
- [x] **ReportGenerateButton 화면 연동**: ReportsScreen에 배치
- [x] ~~YesterdayCheckButton 화면 연동~~ → ❌ 미추진 (유저 경험 저하 + “어제 체크” 유도는 목표 관리 UX에 역효과 가능)
- [x] ~~어제 체크 삽입 로직 구현 (check_history에 어제 날짜로 삽입)~~ → ❌ 미추진 (위 결정에 따라 불필요)
- [ ] 스트릭 재계산 트리거 구현 - Backlog

#### 10.2.4 전면 광고 (Phase 4) ✅ **완료** (2025-12-07)
- [x] `useInterstitialAd` 훅 구현 (빈도 제한: 3시간 쿨다운, 일 2회)
- [x] 만다라트 생성 완료 시 전면 광고 트리거
- [x] 리포트 생성 완료 후 전면 광고 트리거
- [x] ~~레벨업 달성 시 전면 광고 트리거~~ → ❌ 비활성화 (사용자 경험 저하)

#### 10.2.5 정책 준수 UI ✅ **완료** (2025-12-07)
- [x] **Apple ATT**: iOS 14.5+ 추적 동의 요청 (`expo-tracking-transparency`)
- [x] BannerAd: ReportsScreen 하단에 추가
- [ ] **GDPR**: EU 유저 동의 배너 - EU 출시 계획 시 진행(현재 보류)
- [ ] **광고 라벨**: Google Play 정책 준수 - Android 출시 시 추가

#### 10.2.6 수익화 고도화 (Optimization) ✅ **완료** (2025-12-07)
- [x] **TodayScreen 배너 제거**: Clean Zone 정책 적용 (집중력 보호)
- [x] **Ad-Free Time (집중 모드)**: useAdFree 훅 + AdFreeButton 구현 (24시간 배너 제거)
- [x] **AdFreeButton 화면 배치**: SettingsScreen에 배치 ✅
- [ ] **Feedback Loop**: 배너 닫기 버튼(`x`) → Premium 유도 모달 (추후)

#### 기존 시스템 영향도 (필수 확인)
> 작업 전 [`ADMOB_MONETIZATION_STRATEGY.md` 섹션 11](../features/ADMOB_MONETIZATION_STRATEGY.md#11-기존-시스템-영향도-분석) 참조

| 시스템 | 영향받는 파일 | 변경 내용 |
|--------|-------------|----------|
| **XP 시스템** | `xpMultipliers.ts`, `stats.ts` | `ad_boost` 배율 추가 |
| **스트릭** | `stats.ts`, `streak-warning/` | 프리즈 획득 경로 추가 |
| **리포트** | `generate-report/`, `ReportsPage.tsx` | 사용량 제한 + 광고 옵션 |
| **푸시 알림** | `streak-warning/`, `comeback-notification/` | 광고 CTA 포함 |

**예상 소요**: 4일 (Phase 1-5)

---

### 10.3 스토어 배포 🔄 **진행 중** (2025-12-10~)

**목표**: iOS App Store + Android Google Play 동시 배포

**작업 목록**:
- [x] EAS Build 설정
  - [x] `eas.json` 설정 (production 프로필)
  - [x] iOS 인증서/프로비저닝 설정
  - [ ] Android 키스토어 생성
- [x] 앱 메타데이터 준비 ✅ **완료** (2025-12-08)
  - [x] 앱 이름, 부제목
  - [x] 앱 설명 (한국어/영어)
  - [x] 키워드
  - [x] 카테고리 선택 (생산성)
  - [x] 개인정보처리방침 URL
- [x] 앱 스크린샷 ✅ **완료** (2025-12-08)
  - [x] iPhone 6.7" (1284x2778) - 영어/한국어 각 5장
  - [ ] iPad Pro 12.9" (추후)
  - [ ] Android Phone (추후)
  - [ ] Android Tablet (추후)
- [ ] iOS App Store 제출 🔄 **심사 진행/대기**
  - [x] App Store Connect 앱 생성
  - [x] TestFlight 베타 테스트 (Build 53 반려 → Build 80 업로드)
  - [x] App Store Connect 메타데이터 입력 (가격, 연령등급, 개인정보)
  - [x] Build 53 심사 제출 → **반려** (2025-12-10)
  - [x] Build 80 TestFlight 업로드 ✅ (2025-12-13)
  - [x] Build 80 심사 제출 ✅ (2025-12-13)
  - [ ] App Review 결과 대기 🔄 (App Store Connect에서 확인)
- [ ] Android Google Play 제출 (추후 진행)
  - [ ] Google Play Console 앱 생성
  - [ ] 내부 테스트 트랙
  - [ ] 프로덕션 출시

#### Build 53 심사 반려 사유 및 대응 (2025-12-10~11)

**반려 사유 1: Guideline 4.0 - Design (권한 요청 언어 불일치)** ✅ **완료**
- 문제: 앱 Primary Language가 English인데 권한 요청 문구가 한국어
- 대응: ✅ 완료 (2025-12-10)
  - `app.json` infoPlist 권한 설명 영어로 변경
  - expo-image-picker, expo-media-library, expo-tracking-transparency 플러그인 권한 영어로 변경
  - Android 알림 채널 이름/설명 영어로 변경 (`notificationService.ts`)
  - buildNumber: 53 → 54

**반려 사유 2: Guideline 3.1.2 - Business (구독 정보 누락)** ⚠️ **부분 완료**
- 문제: 자동 갱신 구독 앱에서 필수 정보 누락
  - 앱 바이너리: Terms of Use (EULA) 링크 누락
  - 앱 메타데이터: EULA 링크 누락
- 대응: ✅ 완료 (2025-12-10)
  - ✅ SubscriptionScreen에 Terms of Use (Apple 표준 EULA) 링크 추가
  - ✅ SubscriptionScreen에 Privacy Policy 링크 추가
  - ✅ 구독 자동 갱신 안내 문구 보강 (i18n)
  - [ ] App Store Connect 메타데이터(App Description)에 EULA 링크 추가 (수동 작업 필요)
    - 가이드: `docs/development/APP_REVIEW_FIX_PLAN_2025-12-15.md`

**반려 사유 3: Guideline 2.1 - Performance (Plans not displayed)** 🔄 **재발(2025-12-15)**
- 문제: iPad Air (5th generation) / iPadOS 26.0.1에서 인앱 구매 상품(플랜)이 표시되지 않음
- 원인 후보: Offering 패키지 미노출/네트워크/환경 차이 등으로 `Offerings.current.availablePackages`가 비는 케이스
- 대응: 진행 중
  - ✅ App Store Connect IAP 상품 메타데이터/현지화/가격/상태 정리 (월간/연간 "Ready to Submit")
  - ✅ RevenueCat Products/Offerings/Packages/Entitlement 설정 완료 (default offering current)
  - ✅ 구매 복원 자동화 추가 (`syncPurchases()` → 필요 시 `restorePurchases()`) + iPad 동작 검증 완료
  - ✅ (코드) Offerings 패키지 미노출 시 StoreKit `getProducts()`로 플랜 노출 fallback + Retry 버튼 추가
    - 상세: `docs/development/APP_REVIEW_FIX_PLAN_2025-12-15.md`

**반려 사유 4: Guideline 5.1.1(v) - Data Collection (계정 삭제 기능 누락)** ✅ **완료**
- 문제: 계정 생성을 지원하지만 계정 삭제 기능이 없음
- 대응: ✅ 완료 (2025-12-11)
  - ✅ Supabase RPC 함수 `delete_user_account()` 생성 (마이그레이션)
  - ✅ SettingsScreen에 "계정 삭제" 버튼 추가
  - ✅ 계정 삭제 확인 다이얼로그 구현
  - ✅ 계정 삭제 시 모든 연관 데이터 CASCADE 삭제
  - ✅ i18n 번역 추가 (영어/한국어)

**Build 80 변경사항 요약**:
- ✅ 권한 요청 문구 영어로 통일
- ✅ 구독 화면에 Terms of Use 및 Privacy Policy 링크 추가
- ✅ 계정 삭제 기능 구현
- ✅ 인앱 구매 후 크래시(Rendered fewer hooks) 수정 + 문서화: `docs/troubleshooting/IAP_PURCHASE_CRASH_RENDERED_FEWER_HOOKS.md`
- ✅ 세부목표 타입 설정 UI/번역 누수 추가 정리 + 리포트 Empty State 개선
- ✅ IAP 상품/RevenueCat 설정 완료 + iPad 플랜 노출 문제 해소
- ✅ 자동 구매 복원(restore) 자동화 + iPad 동작 검증 완료 (로그 관측은 필요 시)

**다음 단계**:
1. App Review 결과 확인 및 필요 시 즉시 대응
2. (필요 시) Build 81+ 재빌드/재제출 (심사 피드백 반영)

**예상 소요**: 심사 제출 후 1-3일 (Apple 심사 기간)

---

### 10.3.5 웹앱 단기 대응: "랜딩 페이지 모드" 전환 🔴 **즉시**

**목표**: 웹에서의 무료 우회(수익 누수) 및 레거시 UX 혼란을 차단하고, 스토어 심사/정책 요건(약관/개인정보 URL)을 안정적으로 유지한다.  
**전략 문서**: `docs/strategy/WEB_APP_STRATEGY.md`

**작업 항목 (단기만 우선 진행)**:
- [x] `/terms`, `/privacy` 페이지 유지(스토어 심사 URL) + 링크 최신화
- [x] 웹앱 주요 기능 경로 차단(로그인/대시보드/기능 페이지 접근 시 `/`로 리다이렉트)
- [x] 메인(`/`)을 소개/지원 중심 랜딩 페이지로 전환 (Support 이메일, Terms/Privacy 링크 포함)
- [ ] Vercel 배포 반영 및 동작 점검 (리다이렉트/SEO/캐시)

**장기 대응(보류)**:
- [ ] "프리미엄 컴패니언" 모델(웹 프리미엄 전용) 설계/구현은 추후 진행 예정

---

### 10.4 Premium 구독 시스템 🔄 **코드 구현 완료, 설정 대기**

**목표**: 무료/유료 모델로 지속 가능한 수익 구조 확립
**상세 전략**: [`PREMIUM_PRICING_PLAN.md`](../features/PREMIUM_PRICING_PLAN.md)

#### 10.4.1 무료 vs Premium 기능 비교
| 기능 | 무료 | Premium |
|------|------|---------|
| 만다라트 | 3개 | 무제한 |
| AI 리포트 | 주 1회 (or 광고) | 무제한 |
| 광고 | 배너 + 전면 | 없음 |
| XP 부스트 | 광고 시청 | 매일 1회 무료 |

#### 10.4.2 가격 전략 (확정)
| 옵션 | KRW | USD | 비고 |
|------|-----|-----|------|
| 월간 구독 | ₩4,400 | $3.99 | 기본 요금 |
| 연간 구독 | ₩33,000 | $29.99 | 38% 할인 |

#### 10.4.3 구현 작업 목록
- [x] DB 마이그레이션 준비 ✅
  - [x] `user_subscriptions` 테이블 스키마 (`20251207000001_add_user_subscriptions.sql`)
  - [x] 프로덕션 DB에 마이그레이션 실행 (`npx supabase db push`) ✅ (2025-12-13)
- [x] IAP SDK 통합 ✅
  - [x] `react-native-purchases` v9.6.9 설치
  - [x] RevenueCat 초기화 코드 (`initializeRevenueCat`)
  - [x] **App Store Connect IAP 상품 등록/현지화/가격/상태 완료** (월간/연간 "Ready to Submit") ✅ (2025-12-13)
  - [x] **RevenueCat 대시보드 설정 완료** (Products, Offerings, Packages, Entitlement) ✅ (2025-12-13)
- [x] 구독 상태 관리 ✅
  - [x] `useSubscription` 훅 구현 (350줄)
  - [x] `SubscriptionContext` 전역 상태
  - [x] `SubscriptionScreen` UI 완성 (498줄)
- [x] Premium 기능 분기 처리 ✅
- [x] MandalartListScreen: 만다라트 개수 제한 체크
- [x] SettingsScreen: 구독 상태 표시
  - [x] BannerAd: isPremium 시 광고 숨김 ✅ (실제 적용 확인 완료)

#### 10.4.4 남은 작업 (외부 설정)
1. **App Store Connect**
   - [x] IAP 상품 생성 (Auto-Renewable Subscription)
   - [x] Product ID: `com.mandaact.sub.premium.monthly`, `com.mandaact.sub.premium.yearly`
   - [x] 가격 설정 (KRW ₩4,400 / $3.99)
2. **RevenueCat Dashboard**
   - [x] Products 추가 (App Store Connect 연동)
   - [x] Offering 생성 및 Current로 설정
   - [x] Entitlement "premium" 생성
3. **Supabase**
   - [x] `npx supabase db push` 실행 (user_subscriptions 테이블) ✅ (2025-12-13)

#### 10.4.5 추후 개선 사항 (Backlog)
- [x] **자동 구매 복원**: 앱 시작/로그인 시 자동으로 `syncPurchases()` → 필요 시 `restorePurchases()` (세션/시간 쿨다운 적용) ✅ (2025-12-13)
  - 동작 검증: iPad에서 동일 계정 로그인 시 자동으로 Premium 전환 확인
  - 로그 관측(콘솔) 보강은 필요 시만 진행

**예상 소요**: 0.5일 (외부 설정만 남음)

---

### 진행 순서 (최적화됨)

```
Phase 10.1: CI/CD 파이프라인 ✅ 완료
    └→ 이후 모든 작업의 품질 보장

Phase 10.2: AdMob 광고 연동 ✅ 완료
    ├→ Phase 1: SDK + 배너 ✅ 완료
    ├→ Phase 2: XP 부스트 보상형 광고 ✅ 완료
    ├→ Phase 3: 추가 보상형 광고 ✅ 완료 (StreakFreeze, ReportGenerate)
    ├→ Phase 4: 전면 광고 ✅ 완료 (레벨업 광고 비활성화)
    └→ Phase 5: 정책 준수 UI ✅ 완료 (ATT)

Phase 10.3: 스토어 배포 (1-2일)
    ├→ 광고 포함된 최종 버전으로 첫 심사
    └→ 정책 준수 상태로 심사 (리젝 위험 감소)

Phase 10.4: Premium 구독 (3일) - 출시 후 진행 가능
    ├→ Phase 6: IAP 연동 (2일)
    └→ Phase 7: 기능 분기 처리 (1일)
```

**현재 상태** (Build 80):
- ✅ 배너 광고 3개 화면 적용 (Home, List, Reports) - TodayScreen Clean Zone
- ✅ XP 부스트 버튼 2개 화면 적용 (Home, Today) - 활성 만다라트 없으면 숨김
- ✅ 보상형 광고 구현/연동 완료 (ReportGenerate) - StreakFreeze는 정책/UX 이유로 비활성화
- ✅ 전면 광고 트리거 연동 완료 (만다라트 생성, 리포트 생성)
- ✅ 레벨업 전면 광고 비활성화 (사용자 경험 우선)
- ✅ ATT 권한 요청 팝업 타이밍 수정
- ✅ Ad-Free Time 시스템 구현 (useAdFree 훅, AdFreeButton 컴포넌트)
- ✅ TodayScreen Clean Zone 정책 적용 (배너 광고 제거)
- ✅ iPad XP Boost 버튼 위치 수정 (ProfileCard 아래로 이동)
- ✅ Supabase RLS 정책 수정 (user_subscriptions INSERT/UPDATE 허용)
- ✅ 구독 시스템 코드 구현 완료 (useSubscription, SubscriptionScreen)
- ✅ Premium 광고 숨김 분기 “실제 적용” 확인
- ✅ 자동 구매 복원(restore) 자동화 + iPad 동작 검증 완료

**이점**:
- ✅ 첫 심사에 완전한 버전 제출 (재심사 불필요)
- ✅ CI/CD로 품질 자동 검증
- ✅ 출시 첫날부터 광고 수익 발생
- ✅ GDPR/ATT 사전 구현으로 리젝 방지
- ✅ Premium 구독은 출시 후 추가 가능 (긴급하지 않음)

---

## 🚀 Phase 4: 코드 품질 & 안정성 ✅ **100% 완료** (2025-11-25)

**목표**: 프로덕션 품질 확보 및 유지보수성 향상
**기간**: 1-2주
**완료일**: 2025-11-25

### 4.1 TypeScript & ESLint 정리 ✅ **100% 완료** (2025-11-29 업데이트)

**최종 상황**:
- ✅ TypeScript: 0 errors (완벽)
- ✅ ESLint 경고: 43개 → 7개로 감소 (84% 개선)
- ✅ any 타입: 모두 제거 (프로젝트 전체 0개)
- ✅ Unused variables 모두 제거
- ✅ ESLint 설정 개선: `varsIgnorePattern: '^_'` 추가
- ⚠️ 남은 경고 7개 (모두 무시 가능):
  - 4개: shadcn/ui 라이브러리 코드 (react-refresh)
  - 2개: 테스트 유틸 export * (react-refresh)
  - 1개: SubGoalModal useEffect (의도적 설계)

**작업 목록**:
- [x] ESLint 경고 제거 (React Hook 의존성, unused variables)
- [x] `any` 타입 제거 (Edge Functions 포함)
- [x] Supabase QueryBuilder 타입 정의
- [x] SupabaseAuthError 타입 정의

**우선순위**: 🔴 Critical - ✅ 완료

---

### 4.2 성능 최적화 ✅ **100% 완료** (2025-11-25)

**완료 사항**:
- ✅ 번들 크기 분석: rollup-plugin-visualizer로 상세 분석
- ✅ 불필요한 의존성 제거: html2canvas, dom-to-image-more (6개 패키지)
- ✅ Code splitting 확인: 이미 모든 페이지 lazy loading 적용됨
- ✅ Tree shaking 검증: 활성화 확인
- ✅ 빌드 최적화: CSS 코드 분할, 소스맵 비활성화
- ✅ 번들 크기: 1.18MB (gzipped ~350KB)
- ✅ React.memo 적용: 9개 주요 컴포넌트 (Navigation 추가)
- ✅ TanStack Query 캐싱: staleTime 5분, gcTime 10분, refetchOnWindowFocus false
- ✅ 이미지 최적화 분석: 3개 아이콘만 존재 (이미 최적화됨)

**작업 목록**:
- [x] 번들 크기 분석 및 최적화 (1.33MB → 1.18MB)
  - [x] Code splitting (React.lazy) - 이미 적용됨
  - [x] Tree shaking 검증 - 활성화됨
  - [x] 중복 의존성 제거 - 6개 패키지 제거
- [x] 이미지 최적화 (WebP, lazy loading) - 필요 없음 (아이콘 3개만 존재)
- [x] TanStack Query 캐싱 전략 개선 - 이미 최적화됨
- [x] React.memo 적용 (불필요한 re-render 방지) - 9개 컴포넌트 적용
- [x] `performanceUtils.ts` 단위 테스트 작성

**측정 결과** (2025-11-22):
- ✅ Lighthouse Performance Score: **88점** (목표 90 근접)
- ⚠️ First Contentful Paint: 2.49초 (시뮬레이션) / **100ms** (실제) ✅
- ✅ Time to Interactive: 3.47초 (시뮬레이션) / **816ms** (실제) ✅
- ✅ Total Blocking Time: 0ms
- ✅ Cumulative Layout Shift: 0

**우선순위**: 🟡 Important

---

### 4.3 에러 핸들링 개선 ✅ **완료** (2025-11-22)

**완료 사항**:
- Edge Function 에러 응답 표준화 유틸리티 (`_shared/errorResponse.ts`)
- 2개 Edge Function 리팩토링 (generate-report, parse-mandalart-text)
- 표준화된 에러 코드 및 타입 시스템
- withErrorHandler 래퍼 함수 구현

**작업 목록**:
- [x] 전역 에러 바운더리 추가
- [x] Edge Function 에러 응답 표준화
- [x] 사용자 친화적 에러 메시지 (한글)
- [x] 에러 추적 시스템 검토 (Sentry 추천, 나중에 설정 가능)

**우선순위**: 🟡 Important - ✅ 완료

---

### 4.4 테스트 추가 ✅ **100% 완료** (2025-11-25)

**최종 결과**:
- ✅ **192개 테스트 통과** (이전 170개에서 +13%)
- ✅ **0개 실패** (이전 25개 실패 100% 해결)
- ⏭️ 5개 skip (타이밍 이슈)
- ✅ **15/15 테스트 파일 통과** (100%)

**완료 사항**:
- ✅ @testing-library/dom 의존성 설치
- ✅ 테스트 유틸리티 생성: `src/test/utils.tsx` (QueryClientProvider + BrowserRouter)
- ✅ HomePage 테스트 수정: 11개 테스트 모두 통과
- ✅ TodayChecklistPage 테스트 수정: 8개 테스트 통과
- ✅ MandalartDetailPage 테스트 수정: 6개 테스트 통과
- ✅ Navigation 테스트: 10개 테스트 모두 통과 (이전 7개 실패 해결)
- ✅ ESLint 설정 개선: 테스트 파일에서 any 타입 허용

**작업 목록**:
- [x] Vitest 설정 (단위 테스트)
- [x] 핵심 로직 테스트:
  - [x] `actionTypes.ts` (타입 추천, shouldShowToday) - 73/73 통과
  - [x] `stats.ts` (통계 계산) - 6/6 통과
  - [x] `reportParser.ts` (리포트 파싱) - 5/5 통과
  - [x] `xpMultipliers.ts` (XP 배율 계산) - 14/14 통과
- [x] 컴포넌트 테스트 (React Testing Library)
  - [x] `ErrorBoundary` - 4/4 통과
  - [x] `Navigation` - 10/10 통과
  - [x] `HomePage` - 11/11 통과 (skip 2개)
  - [x] `TodayChecklistPage` - 8/8 통과 (skip 1개)
  - [x] `MandalartDetailPage` - 6/6 통과
  - [x] `UserProfileCard` - 8/8 통과
  - [x] `MandalartGrid` - 14/14 통과
  - [x] `ActionTypeSelector` - 6/6 통과
  - [x] `ReportsPage` - 4/4 통과
- [ ] E2E 테스트 (Playwright) - 추후 Phase 8에서 고려
  - 만다라트 생성 플로우
  - 체크 플로우
  - 배지 해제 플로우

**우선순위**: 🟢 Recommended - ✅ 완료

---

## 📱 Mobile App: React Native 개발 ✅ **100% 완료** (2025-11-27)

**목표**: 네이티브 모바일 앱으로 사용자 경험 향상
**기술 스택**: React Native + Expo + NativeWind

### 완료된 기능 ✅

**스크린 (12개)**:
- ✅ HomeScreen - 대시보드, XP/레벨, 스트릭
- ✅ TodayScreen - 일일 체크리스트, 만다라트별 그룹화
- ✅ MandalartListScreen - 만다라트 관리, 활성화 토글
- ✅ MandalartCreateScreen - 3가지 입력 방식 (OCR/텍스트/수동)
- ✅ MandalartDetailScreen - 9x9 그리드, 이미지 내보내기, 액션 인라인 편집
- ✅ StatsScreen - 히트맵, 통계, 게임화 정보
- ✅ ReportsScreen - 주간 리포트, 목표 진단
- ✅ BadgeScreen - 21개 배지, 진행률
- ✅ TutorialScreen - 7단계 온보딩
- ✅ SettingsScreen - 설정, 알림 시간 선택, 로그아웃
- ✅ LoginScreen - 이메일/비밀번호 인증, 비밀번호 재설정
- ✅ LoadingScreen - 초기 로딩

**훅 (6개)**:
- ✅ useMandalarts - 만다라트 CRUD
- ✅ useActions - 액션 체크, 조회, 수정
- ✅ useStats - 통계, 게임화
- ✅ useBadges - 배지 시스템
- ✅ useReports - AI 리포트
- ✅ useNotifications - 푸시 알림 관리

**서비스 (3개)**:
- ✅ ocrService - 이미지 OCR
- ✅ exportService - 이미지 캡처/저장
- ✅ notificationService - 푸시 알림 스케줄링

**코드 품질**:
- ✅ ErrorBoundary 컴포넌트
- ✅ Toast 알림 시스템
- ✅ Skeleton 로딩
- ✅ EmptyState 컴포넌트
- ✅ errorHandling 유틸리티 (한글화 완료)
- ✅ ActionEditModal 컴포넌트
- ✅ Sentry 에러 추적 (logger.ts)
- ✅ Production Logger 시스템 (console → logger 교체)
- ✅ 환경변수 검증 (env.ts)
- ✅ React.memo 최적화 (ActionListItem)
- ✅ 공유 XP 유틸리티 (@mandaact/shared)

### 완료된 작업 ✅

#### Mobile-1: 푸시 알림 시스템 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] Expo Notifications 설정
- [x] 권한 요청 플로우
- [x] 시간 선택 UI (TimePicker Modal)
- [x] 백그라운드 스케줄링

#### Mobile-2: 액션 인라인 편집 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] MandalartDetailScreen 편집 모드
- [x] ActionEditModal 컴포넌트
- [x] 액션 타입 변경 UI (루틴/미션/참고)
- [x] frequency/cycle 수정

#### Mobile-3: 에러 메시지 한글화 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] 인증 에러 메시지 번역 (20+ 메시지)
- [x] API 에러 메시지 번역
- [x] 사용자 친화적 메시지

#### Mobile-4: 비밀번호 재설정 ✅ **완료** (2025-11-26)
**작업 목록**:
- [x] LoginScreen에 "비밀번호를 잊으셨나요?" 링크
- [x] Supabase 비밀번호 재설정 연동
- [x] 성공/실패 피드백 (Modal UI)

### Web vs Mobile 비교

| 기능 | Web | Mobile | 상태 |
|------|-----|--------|------|
| 만다라트 CRUD | ✅ | ✅ | 동등 |
| 3가지 입력 방식 | ✅ | ✅ | 동등 |
| 일일 체크 | ✅ | ✅ | 동등 |
| 게임화 (XP/배지) | ✅ | ✅ | 동등 |
| AI 리포트 | ✅ | ✅ | 동등 |
| 튜토리얼 | ✅ | ✅ | 동등 |
| 알림 시스템 | ✅ | ✅ | 동등 |
| 액션 편집 | ✅ | ✅ | 동등 |
| 비밀번호 재설정 | ✅ | ✅ | 동등 |

**상태**: ✅ 완료 - Web과 기능 동등성 달성 + 프로덕션 품질 확보

### 남은 작업 (Optional)
- [x] Sentry 프로젝트 생성 및 DSN 발급
- [x] EAS Build 기본 설정 (스토어 배포용)
- [ ] 실제 기기 테스트 (49개 테스트 항목)

---

## 🎨 Phase 5: UX 디테일 개선 ✅ **완료** (2025-11-30)

**목표**: 사용자 경험 마지막 다듬기
**기간**: 1주
**완료일**: 2025-11-30

### 5.1 만다라트 상세 페이지 개선 ✅ **완료**
**완료 사항**:
- ✅ 핵심 목표 시각적 강조: `CenterGoalCell` 그라디언트 배경 (Blue → Purple → Pink)
- ✅ "핵심목표" 라벨 연하게 처리: 그라디언트로 시각 구분 (라벨 불필요)
- ✅ 9x9 그리드 모바일 반응형 최적화: `cellSize` 동적 계산, 3x3 확장 뷰
- ⚠️ 셀 호버 시 툴팁: 모바일 터치 기반이라 불필요 (탭하면 전체 표시)

**우선순위**: 🟢 Recommended - ✅ 완료

---

### 5.2 아이콘 & UI 정리 ✅ **완료**
**완료 사항**:
- ✅ 목표 우측 불필요한 아이콘 제거 확인
- ✅ 액션 타입 아이콘 일관성: `RotateCw`(루틴), `Target`(미션), `Lightbulb`(참고)
- ✅ 색상 팔레트 통일: Tailwind + NativeWind 일관된 색상
- ✅ 로딩 스피너/스켈레톤 UI: `Skeleton` 컴포넌트, `ActivityIndicator`

**우선순위**: 🟢 Recommended - ✅ 완료

---

### 5.3 접힘/펼침 사용자 설정 ⏸️ **보류**
**상태**: 현재 UX로 충분하여 보류
- ⏸️ LocalStorage에 섹션 상태 저장
- ⏸️ "전체 펼치기/접기" 버튼 추가
- ⏸️ 설정 페이지에서 기본값 변경 가능

**우선순위**: 🟢 Nice-to-have - ⏸️ 보류 (필요 시 추가)

---

### 5.4 빈 상태 (Empty State) 개선 ✅ **완료**
**완료 사항**:
- ✅ 만다라트 없을 때: `EmptyMandalarts` (아이콘 + 설명 + CTA 버튼)
- ✅ 체크 항목 없을 때: `EmptyTodayActions` (격려 메시지 포함)
- ✅ 통계 데이터 없을 때: EmptyState 시스템 구축 완료

**우선순위**: 🟢 Nice-to-have - ✅ 완료

---

## 📋 추후 과제 (Backlog)

### B1. 인앱결제 (수익화)
**목표**: 지속 가능한 수익 모델 구축
**비즈니스 모델**:
- **무료 버전**: AdMob 광고 포함
- **유료 버전**: 광고 제거 (월간 구독 또는 일회성 구매)

**현황**: Phase 10.2(AdMob) / Phase 10.3~10.4(IAP/구독)로 이관되어 대부분 구현/진행 중

**남은 작업 (Backlog/Release 모두 포함)**:
- [x] App Store Connect IAP 상품 등록/현지화/가격/상태 완료 (월간/연간) ✅ (2025-12-13)
- [x] RevenueCat Products/Offerings/Packages/Entitlement 설정 완료 ✅ (2025-12-13)
- [x] Supabase `user_subscriptions` 프로덕션 마이그레이션 실행 (`npx supabase db push`) ✅ (2025-12-13)
- [x] Premium 사용자 광고 숨김 분기 적용 (`BannerAd` 등) ✅ (실제 적용 확인 완료)
- [x] 자동 구매 복원(restore) 자동화 (앱 시작/로그인 시) ✅ (iPad 동작 검증 완료)
- [ ] Android 광고 라벨 (Google Play 정책)
- [ ] GDPR 동의 배너 (EU 출시 시)
- [ ] 광고 성과 추적/대시보드 운영(AdMob/Vercel/PostHog)
  - [x] PostHog: 유료/복원/프리미엄 전환 이벤트 추가 및 샌드박스 결제 검증 ✅ (Build 82)
  - [ ] 광고/푸시 이벤트 대시보드 세팅: 앱 배포 후 실제 데이터 유입 시 진행

**우선순위**: 🟡 Important

---

### B2. 타입 추천 로직 고도화
**목표**: AI 기반 실천 항목 타입 추천 정확도 향상
**현재 상태**: 규칙 기반 키워드 매칭 (`src/lib/actionTypes.ts`)

**작업 목록**:
- [ ] 사용자 피드백 데이터 수집
  - 추천 수락/거부 로깅
  - 타입 변경 패턴 분석
- [ ] ML 모델 도입 검토
  - 텍스트 분류 모델 (한국어 NLP)
  - Edge Function에서 추론 또는 사전 학습
- [ ] 프롬프트 튜닝 (단기)
  - 기존 규칙 개선
  - 컨텍스트 기반 추천 (세부목표 고려)
- [ ] 신뢰도 임계값 조정
  - 낮은 신뢰도 시 사용자 선택 유도

**우선순위**: 🟢 Recommended

---

### B3. 리포트 생성 토큰 효율성 제고
**목표**: AI 리포트 생성 비용 최적화
**현재 상태**: ✅ 1차 최적화 적용(요약 입력 + 안전 캐싱 + 모델 전환), 품질/비용 튜닝은 운영 데이터 기반으로 추가 진행
**상세 문서**: `docs/features/REPORT_COST_OPTIMIZATION.md`

**작업 목록**:
- [x] 프롬프트/입력 압축(요약 입력)
  - 불필요한 컨텍스트 제거(깊은 join/`select *` 제거)
  - 메타데이터 `data_snapshot` 대신 `input_summary` 저장
  - 스케줄 진단 리포트의 “세부목표/실천항목 전체 나열” 제거(토큰 절감)
- [x] 응답 길이 제한
  - `max_tokens` 기본값 2000 → 900으로 축소(환경변수로 조정)
- [x] 안전 캐싱 전략(해시 기반)
  - `cache_key + input_hash(SHA-256)`가 모두 일치할 때만 재사용(오탐 방지)
  - `prompt_version`으로 프롬프트 변경 시 캐시 자동 무효화
  - 스케줄 생성 시, 동일 입력의 기존 리포트가 있으면 복사해 비용 절감
- [x] 모델 선택/폴백(운영 전환)
  - report_type별 `MODEL_PRIMARY/MODEL_FALLBACK` 환경변수 지원
  - primary 결과가 JSON 검증 실패 시 fallback 1회 재시도
- [ ] 품질 vs 비용 튜닝(운영 데이터 기반)
  - 캐시 히트율/재시도율/모델별 품질 모니터링
  - 저가 모델 우선 + 실패 시 고가 모델 폴백 운영
- [ ] 주간 범위 표준화(타임존 기반 “지난 주” 고정)
  - 캐시 효율 개선 + 사용자 체감 일관성 확보

**우선순위**: 🟢 Recommended

---

### B4. 번역 품질 개선
**목표**: 자연스러운 다국어 사용자 경험
**현재 상태**: AI 번역 기반 한국어/영어 지원

**작업 목록**:
- [ ] 영어 번역 네이티브 검수
  - 어색한 표현 수정
  - 문화적 맥락 반영
- [ ] 일본어 지원 추가 (5-6시간)
  - `ja.json` 번역 파일 생성
  - Edge Function/SQL 메시지 추가
  - 일본어 폰트 대응
- [ ] 번역 키 일관성 검토
  - 중복 키 제거
  - 네이밍 컨벤션 통일
- [ ] 컨텍스트 주석 추가
  - 번역자를 위한 힌트
  - 글자 수 제한 명시

**우선순위**: 🟢 Recommended

---

### B5. 커뮤니티 기능 추가
**목표**: 사용자 간 동기부여 및 리텐션 향상

**작업 목록**:
- [ ] 만다라트 공유 기능
  - 이미지 생성 + SNS 공유 (카카오톡, 트위터)
  - 공개/비공개 설정
- [ ] 리더보드
  - 주간/월간 XP 랭킹 (익명 옵션)
  - 선택 참여 방식
- [ ] 친구 초대 시스템
  - 초대 링크 생성
  - 초대 보상 (XP 보너스)
- [ ] 커뮤니티 피드 (장기)
  - 실천 인증 게시
  - 좋아요/응원 기능
  - 신고/차단 시스템

**우선순위**: 🟢 Future

---

## 🎮 Phase 6: 게임화 고도화 (선택사항, 우선순위: 낮음)

**목표**: 배지 시스템 확장 및 새로운 동기부여 요소 추가
**기간**: 1-2주

### 6.1 배지 시스템 v5.0 적용
**현재 상태**: v5.0 기획 완료, 미구현

**작업 목록**:
- [ ] 스토리 중심 배지 리뉴얼 (25개)
  - 🔥 스트릭 배지 7개 (3일 → 150일)
  - 💯 볼륨 배지 7개 (50회 → 5000회)
  - 🏆 월간 챌린지 4개
  - 🌙 시크릿 배지 3개
  - ⭐ 특별 배지 4개
- [ ] 감정 곡선 기반 XP 재조정
- [ ] 시크릿 배지 힌트 시스템
- [ ] 배지 스토리 UI 개선

**참고 문서**: `docs/features/BADGE_SYSTEM_V5_RENEWAL.md`

**우선순위**: 🟢 Optional

---

### 6.2 리더보드 & 소셜 기능
**작업 목록**:
- [ ] 주간/월간 리더보드 (선택 참여)
- [ ] 만다라트 공유 기능 (이미지 생성)
- [ ] SNS 공유 버튼 (카카오톡, 트위터)
- [ ] 친구 초대 시스템

**우선순위**: 🟢 Future

---

### 6.3 퀴즈 기능
**작업 목록**:
- [ ] 주간 복습 퀴즈 생성 (AI)
- [ ] "당신의 목표는?" 객관식 퀴즈
- [ ] 정답 시 격려 메시지
- [ ] 퀴즈 결과 통계

**우선순위**: 🟢 Future

---

## 🤖 Phase 7: AI 재설계 (선택사항, 우선순위: 낮음)

**목표**: AI 기능 재도입 (사용자 피드백 기반 결정)
**기간**: 2-3주

### 옵션 A: 간소화된 AI 도우미
**컨셉**: 전체 만다라트 생성이 아닌, 보조 기능으로만 활용

**기능**:
- [ ] AI 실천 항목 제안 (세부 목표 입력 시)
  - "운동" 입력 → "매일 30분 걷기", "주 3회 근력 운동" 제안
  - Perplexity API 사용, 3개 제안, 사용자 선택
- [ ] AI 동기부여 메시지 생성 (주간 리포트)
  - 실천율 데이터 → 개인화된 격려 메시지
  - 이메일 or 앱 내 알림

**장점**:
- 가볍고 빠른 구현
- 부담 없는 사용자 경험
- 비용 효율적 (프롬프트당 $0.002)

**비용 추정**: $5-10/month (100 DAU 기준)

**우선순위**: 🟢 Optional

---

### 옵션 B: 풀스택 AI 코칭 재구현
**컨셉**: 채팅 기반 만다라트 생성 재도입 (처음부터 재설계)

**설계 원칙**:
1. **단순화**: 4단계 → 2-3단계로 축소
2. **선택사항**: 수동 입력의 "추가 옵션"으로 제공
3. **빠른 완료**: 5분 이내 생성 목표

**작업 목록**:
- [ ] 새 프롬프트 전략 설계
- [ ] UI 재설계 (간소화된 플로우)
- [ ] Edge Function 재구현
- [ ] 베타 테스트 + 피드백 수집

**우선순위**: 🟡 Consider Later (사용자 피드백 후 결정)

---

## 📱 Phase 9: 플랫폼 확장 & 수익화 (우선순위: 중간)

**목표**: 플랫폼 확장 및 지속 가능한 수익 모델 구축
**기간**: 4-6주

### 9.1 iPad 지원 (유니버셜 앱) ✅ **완료** (2025-11-30)
**목표**: iPad에서 최적화된 레이아웃으로 사용자 경험 향상

**완료 사항**:
- ✅ iPad 전용 레이아웃 설계
  - `useResponsive` 훅: 디바이스 타입, 브레이크포인트, 레이아웃 값 제공
  - `ResponsiveContainer`, `ResponsiveGrid`, `ResponsiveRow` 컴포넌트
  - HomeScreen: iPad에서 2열 카드 레이아웃
  - MandalartDetailScreen: iPad에서 더 큰 그리드 셀, 중앙 정렬
- ✅ 반응형 브레이크포인트 추가
  - phone: < 768px (iPhone)
  - tablet: >= 768px (iPad)
  - tabletLarge: >= 1024px (iPad Pro 12.9")
  - `contentMaxWidth`: 태블릿에서 콘텐츠 폭 제한 (700px/900px)
- ✅ 멀티태스킹 지원
  - `supportsTablet: true` 활성화
  - `requireFullScreen: false` 설정 (Split View, Slide Over 지원)
- ✅ app.json 설정 업데이트

**작업 목록**:
- [x] iPad 전용 레이아웃 설계
- [x] 반응형 브레이크포인트 추가
- [x] 멀티태스킹 지원
- [x] iPad 시뮬레이터 테스트 (시뮬레이터 6종 사용 가능)

**우선순위**: 🟡 Important - ✅ 완료

---

### 9.2 글로벌 대응 (i18n) ✅ **완료** (2025-11-30)
**목표**: 한국어 + 영어 다국어 지원 (일본어는 추후 과제)

**완료 사항**:
- ✅ i18n 라이브러리 설정
  - `react-i18next` + `expo-localization`
  - 언어 감지 및 전환 로직 구현
- ✅ 번역 파일 구조 설계
  - `apps/mobile/src/i18n/locales/ko.json` (833줄)
  - `apps/mobile/src/i18n/locales/en.json` (833줄)
- ✅ UI 텍스트 추출 및 키 변환
  - 모든 하드코딩된 한국어 텍스트 → 번역 키
  - 12개 스크린 모두 i18n 적용
- ✅ 언어 설정 UI
  - 로그인 화면에 언어 선택 드롭다운 추가
  - 설정 화면에 언어 선택 추가
  - AsyncStorage에 언어 선택 저장
- ✅ 타임존 글로벌 지원
  - 사용자 타임존 자동 감지 및 저장
  - TodayScreen: 사용자 타임존 기준 날짜 계산
  - 스트릭 계산: 사용자 타임존 기반
  - 설정 화면에 타임존 선택 UI
- ✅ 푸시 알림 메시지 i18n
  - 4개 Edge Function 업데이트 (ko/en 메시지)
  - SQL Functions 업데이트 (ko/en 메시지)
  - AI 리포트 생성 언어 대응

**남은 작업 (추후 과제)**:
- [ ] 일본어 번역 파일 추가 (`ja.json`)
- [ ] Edge Function/SQL에 일본어 메시지 추가
- [ ] 일본어 폰트 대응

**우선순위**: 🟡 Important - ✅ 완료

---

### 9.3 AdMob 광고 연동 ✅ **완료 (Phase 10.2로 통합)**
**목표**: 지속 가능한 수익 모델 구축

**완료 범위**: SDK/배너/전면/보상형/ATT/Clean Zone/Ad-Free Time
**남은 작업**: GDPR 동의 배너(EU), Android 광고 라벨, 광고 성과 추적/최적화, 광고 제거(구독) 설정 마무리

**참고**: 상세 체크리스트는 Phase 10.2 / Phase 10.4 섹션을 기준으로 유지

---

## 🌐 Phase 8: 운영 & 모니터링 강화 (우선순위: 높음)

**목표**: 프로덕션 환경 안정화 및 데이터 기반 의사결정
**기간**: 1주

### 8.1 모니터링 & 분석 ✅ **완료** (2025-11-30)

**완료 사항**:
- ✅ **Web App**: Sentry + PostHog 연동 완료
- ✅ **Mobile App**: Sentry + PostHog 연동 완료 (2025-11-30)
  - `@sentry/react-native` 설치 및 설정
  - `posthog-react-native` 설치 및 설정
  - 핵심 이벤트 추적 함수 구현 (13개)

**구현된 이벤트 추적**:
- ✅ `app_opened` - 앱 실행
- ✅ `user_logged_in` / `user_signed_up` - 인증
- ✅ `mandalart_created` - 만다라트 생성
- ✅ `action_checked` - 액션 체크
- ✅ `badge_unlocked` - 배지 획득
- ✅ `level_up` - 레벨 업
- ✅ `tutorial_completed` - 튜토리얼 완료
- ✅ `notification_clicked` - 알림 클릭
- ✅ `weekly_report_generated` - 주간 리포트
- ✅ `goal_diagnosis_viewed` - 목표 진단

**추가 과제 (선택)**:
- [x] Mobile 핵심 화면에 이벤트 연결 (Login/Today/Tutorial/Create/Reports)
- [ ] Web 이벤트 추적 연결/정의 점검 (필요 시 화면별 보강)
- [ ] Vercel Analytics 상세 분석
- [ ] 사용자 행동 퍼널 분석 대시보드 구성

**우선순위**: 🟡 Important - ✅ 완료

---

### 8.2 CI/CD 파이프라인 개선 🔄 **기본 완료 (Phase 10.1로 통합)**
**작업 목록**:
- [x] GitHub Actions 설정
  - `pnpm type-check` 자동 실행
  - `pnpm lint` 자동 실행
  - `pnpm test` 자동 실행
  - `pnpm build:web` 검증
- [ ] PR 프리뷰 배포 활성화
- [ ] E2E 자동 테스트(Playwright) 통합 (추후)

**우선순위**: 🟡 Important - 🔄 진행 중

---

### 8.3 백업 & 복구 전략 ✅ **완료** (2025-11-30)
**완료 사항**:
- ✅ 백업 & 복구 전략 문서 작성 (`docs/operations/BACKUP_RECOVERY_STRATEGY.md`)
- ✅ Supabase 자동 백업 설정 가이드
- ✅ 데이터 복구 프로시저 문서화 (전체/특정 테이블/특정 사용자)
- ✅ 마이그레이션 롤백 절차 정의
- ✅ RLS 정책 검증 스크립트 (`scripts/verify_rls_policies.sql`)
- ✅ 재해 복구 계획 (DRP) 수립

**작업 목록**:
- [x] Supabase 자동 백업 설정 가이드
- [x] 데이터 복구 프로시저 문서화
- [x] 마이그레이션 롤백 테스트 절차
- [x] RLS 정책 검증 스크립트

**우선순위**: 🟡 Important - ✅ 완료

---

## 📊 성공 지표 (KPIs)

### 단기 목표 (배포 후 1개월)
| 지표 | 목표 | 현재 |
|-----|------|------|
| 회원가입 전환율 | > 50% | 측정 중 |
| 온보딩 완료율 (만다라트 생성) | > 70% | 측정 중 |
| 튜토리얼 완료율 | > 60% | 측정 중 |
| DAU / MAU (Stickiness) | > 30% | 측정 중 |
| 주간 평균 체크 수 | > 10 | 측정 중 |
| 7일 리텐션 | > 40% | 측정 중 |

### 중기 목표 (3개월)
| 지표 | 목표 |
|-----|------|
| MAU | 500+ |
| DAU / MAU | > 50% |
| 주간 평균 체크 수 | > 20 |
| 배지 획득 평균 개수 | > 5 |
| NPS | > 50 |

---

## 🗓️ 타임라인 요약

```
Week 1-2  | Phase 4: 코드 품질 & 안정성     [🔴 Critical] ✅ 완료
          ├─ TypeScript/ESLint 정리
          ├─ 성능 최적화
          └─ 에러 핸들링 개선

Week 3    | Phase 8: 모니터링 강화          [🟡 Important]
          ├─ 이벤트 추적 설정
          ├─ CI/CD 파이프라인
          └─ 백업 전략

Week 4    | Phase 5: UX 디테일 개선         [🟢 Recommended]
          ├─ 만다라트 상세 페이지
          ├─ 아이콘 정리
          └─ 빈 상태 개선

Week 5-6  | Phase 9.1: iPad 지원           [🟡 Important]
          ├─ iPad 전용 레이아웃
          ├─ 반응형 브레이크포인트
          └─ 멀티태스킹 지원

Week 7-8  | Phase 9.2: 글로벌 대응 (i18n)   [✅ 완료]
          ├─ i18n 라이브러리 설정 ✅
          ├─ 한국어/영어 번역 완료 ✅
          └─ 타임존/푸시알림 i18n ✅

Week 9-10 | Phase 10.2: AdMob 광고         [✅ 완료]
          ├─ 배너/전면/보상형 + 정책 UI
          └─ Ad-Free Time + Clean Zone

Week 11   | Phase 10.3: 스토어 배포        [🔴 Critical] 🔄
          ├─ iOS 리젝 대응 및 재제출 (Build 79)
          └─ IAP/RevenueCat 외부 설정
```

---

## 📚 관련 문서 (Related Documents)

### 개발 가이드
- **[BUILD_GUIDE.md](../development/BUILD_GUIDE.md)**: 모바일 빌드 및 트러블슈팅
- **[VERSION_POLICY.md](../development/VERSION_POLICY.md)**: 의존성 버전 관리 정책
- **[DEPLOYMENT_GUIDE.md](../development/DEPLOYMENT_GUIDE.md)**: 웹/모바일 배포 가이드

### 기능 문서
- **[XP_SYSTEM_PHASE2_COMPLETE.md](../features/XP_SYSTEM_PHASE2_COMPLETE.md)**: XP 시스템 구현 상세
- **[BADGE_SYSTEM_V5_RENEWAL.md](../features/BADGE_SYSTEM_V5_RENEWAL.md)**: 배지 시스템 v5.0 기획
- **[GLOBAL_SUPPORT_ENHANCEMENT.md](../features/GLOBAL_SUPPORT_ENHANCEMENT.md)**: i18n 구현 상세

### UI/UX 가이드라인
- **[UI_GUIDELINES.md](../guidelines/UI_GUIDELINES.md)**: 웹/모바일 UI 패턴
- **[ANIMATION_GUIDE.md](../guidelines/ANIMATION_GUIDE.md)**: 애니메이션 베스트 프랙티스

---

## 🎯 즉시 착수 가능한 작업 (Quick Wins)

**오늘/내일 할 수 있는 작업**:

1. **App Store Connect EULA 링크 추가** (10분, 수동)
2. **App Store Connect IAP 메타데이터 완료** (월간/연간: 이름/설명/가격/상태) (30-60분)
3. **RevenueCat Offerings/Packages/Entitlement 점검** (30분)
4. **Android 키스토어 생성 + EAS 연동** (30분)
5. **Premium 광고 숨김 분기 적용** (30-60분)

---

## 📝 의사결정 필요 사항

### 우선순위 결정
- [ ] **배지 v5.0 적용 여부**: 현재 21개 → 25개로 확장
- [ ] **AI 재도입 여부**: 옵션 A (간소화) vs 옵션 B (풀스택) vs 없음
- [ ] **소셜 기능 추가**: 리더보드, 공유 기능 필요성
- [ ] **테스트 커버리지**: 핵심만 vs 전체 커버리지

### 기술 결정
- [x] **에러 추적 도구**: Sentry (Web + Mobile)
- [x] **분석 도구**: PostHog (Web + Mobile)
- [ ] **모니터링**: Vercel Analytics 운영 강화 vs 추가 도구 도입

---

## 📈 프로젝트 현황

### 구현 완료 기능
✅ **코어 기능** (100%)
- 만다라트 생성 (이미지/텍스트/수동)
- 액션 타입 시스템 (루틴/미션/참고)
- 일일 체크 & 히스토리
- 통계 & 대시보드

✅ **게임화** (100%)
- XP/레벨 시스템 (하이브리드 로그 곡선)
- XP 배율 시스템 (주말, 복귀, 마일스톤, 완벽한 주)
- 배지 21개 (자동 해제)
- 스트릭 시스템 (프리즈 포함)
- 월간 배지 자동 리셋 (Cron)

✅ **리포트** (100%)
- 주간 실천 리포트 (AI 분석)
- 목표 진단 리포트 (SMART 기준)

✅ **온보딩** (100%)
- 인터랙티브 튜토리얼 (7단계)
- 샘플 데이터 제공

✅ **PWA** (100%)
- 설치 가능
- 오프라인 지원
- 푸시 알림
- 모바일 최적화

### 기술 부채
🟢 **낮은 수준** (해결 완료)
- ✅ TypeScript `any` 타입: Web/Mobile 모두 0개 (완전 제거)
- ✅ 에러 추적 시스템: Web/Mobile 모두 Sentry 연동 완료
- ✅ Analytics: Web/Mobile 모두 PostHog 연동 완료
- ✅ Mobile 이벤트 연결: 핵심 화면에 추적 이벤트 연결 완료
  - LoginScreen (login, signup, identify)
  - TodayScreen (action_checked, badge_unlocked)
  - TutorialScreen (tutorial_completed)
  - MandalartCreateScreen (mandalart_created)
  - ReportsScreen (weekly_report_generated, goal_diagnosis_viewed)
- ⚠️ 테스트 커버리지: Web 192개 테스트 (Mobile 테스트 없음)

---

## 🔄 로드맵 업데이트 기준

이 로드맵은 다음 상황에서 업데이트됩니다:
- Phase 완료 시
- 사용자 피드백 수집 후
- 기술적 제약 발견 시
- 비즈니스 우선순위 변경 시

**다음 리뷰**: Phase 10 완료 후

---

## 🎉 주요 성과

### 현재 진행 중 (2025-12-13)
🔄 **Phase 10.3 스토어 배포 진행 중**
  - ✅ App Store 스크린샷 완료 (영어/한국어 각 5장, 1284x2778)
  - ✅ 앱 메타데이터 입력 완료 (이름, 설명, 키워드)
  - ✅ Build 53 제출 → 반려, Build 79 업로드/제출 완료
  - 🔄 App Store Connect: EULA 링크/IAP 메타데이터/RevenueCat 설정 진행
  - 🔄 App Review 결과 대기

### 이전 완료 (2025-12-07)
✅ **Phase 10.2 AdMob 광고 연동 완료**
  - ✅ AdMob SDK 통합 및 배너 광고 (Phase 1 완료)
  - ✅ XP 부스트 보상형 광고 (Phase 2 완료)
  - ✅ 추가 보상형 광고 화면 연동 완료 (Phase 3 완료)
    - ReportGenerateButton: ReportsScreen에 배치
    - ❌ StreakFreezeButton: 정책/UX 이유로 비활성화
    - ⏸️ YesterdayCheckButton: 연동/백엔드 미완료 + 정책/UX 재검토 필요
  - ✅ 전면 광고 트리거 연동 완료 (Phase 4 완료)
    - 만다라트 생성 완료 시, 리포트 생성 완료 시
    - ❌ 레벨업 전면 광고 비활성화 (사용자 경험 저하)
  - ✅ ATT 권한 요청 팝업 타이밍 수정 (Phase 5 완료)
  - ✅ TodayScreen Clean Zone 적용 (배너 광고 제거)
  - ✅ Ad-Free Time 시스템 구현 (useAdFree 훅, AdFreeButton 컴포넌트)

### 이전 진행 (2025-12-06)
✅ **Phase 10.1 CI/CD 파이프라인 완료**
  - GitHub Actions 워크플로우 생성
  - TypeScript, ESLint, 테스트 자동 실행
  - 빌드 아티팩트 업로드

### 이전 진행 (2025-12-05)
✅ **모바일 빌드 복구 완료**
  - iOS 빌드 성공 (expo-doctor 17/17 통과)
  - NativeWind 스타일링 복구 완료
  - Build 14-17 TestFlight 배포

### 최근 완료 (2025-11-30)
✅ **Phase 9.2 글로벌 대응 (i18n) 완료**
  - i18n 라이브러리 설정 (react-i18next + expo-localization)
  - 한국어/영어 번역 파일 (각 833줄)
  - 12개 스크린 모두 i18n 적용
  - 로그인 화면 언어 선택 드롭다운
  - 설정 화면 언어/타임존 선택 UI
  - 타임존 글로벌 지원 (TodayScreen, 스트릭 계산)
  - 푸시 알림 메시지 i18n (4개 Edge Function, SQL Functions)
  - AI 리포트 생성 언어 대응
✅ **Phase 5 UX 디테일 개선 완료**
  - 만다라트 상세 페이지: 그라디언트 핵심 목표, 반응형 그리드
  - 아이콘 & UI 정리: 일관된 타입 아이콘, 색상 팔레트
  - Empty State 시스템: 각 화면별 빈 상태 컴포넌트
✅ **Phase 8 운영 & 모니터링 완료**
  - Sentry/PostHog 연동 (Web + Mobile)
  - CI/CD 파이프라인 구축 (GitHub Actions)
  - 백업 & 복구 전략 문서화
  - RLS 정책 검증 스크립트 작성
✅ Mobile App Sentry/PostHog 연동 완료
✅ `@sentry/react-native` 에러 추적 설정
✅ `posthog-react-native` Analytics 설정
✅ 13개 이벤트 추적 함수 구현
✅ logger.ts 통합 (Sentry + PostHog 초기화)
✅ 타입 에러 수정 (MandalartExportGrid, SubGoalModal)
✅ 기술 부채 해결: Mobile `any` 타입 완전 제거 (useStats.ts)
✅ Mobile 핵심 화면에 PostHog 이벤트 연결 완료
  - LoginScreen, TodayScreen, TutorialScreen
  - MandalartCreateScreen, ReportsScreen
✅ 백업 & 복구 전략 (`docs/operations/BACKUP_RECOVERY_STRATEGY.md`)
✅ RLS 정책 검증 스크립트 (`scripts/verify_rls_policies.sql`)

### 이전 완료 (2025-11-29)
✅ 코드 리팩토링 - Web 린트 경고 대폭 감소 (30개 → 7개)
✅ shared 패키지 린트 완료 (0 에러, 0 경고)
✅ ESLint 설정 개선 (varsIgnorePattern 추가)
✅ 미사용 import/변수 정리 (12개 파일)

### 이전 완료 (2025-11-27)
✅ Mobile App 코드 품질 개선 완료 (100%)
✅ Sentry 에러 추적 통합 (@sentry/react-native)
✅ Production Logger 시스템 (console.log → logger)
✅ 환경변수 검증 유틸리티 (env.ts)
✅ React.memo 최적화 (ActionListItem 컴포넌트)
✅ 공유 XP 유틸리티 (@mandaact/shared/xpUtils)
✅ EAS Build 배포 가이드 문서화

### 이전 완료 (2025-11-26)
✅ React Native 모바일 앱 기능 완성
✅ 12개 스크린, 6개 훅, 3개 서비스 구현
✅ Mobile-1: 푸시 알림 시스템 (useNotifications 훅, 시간 선택 UI)
✅ Mobile-2: 액션 인라인 편집 (ActionEditModal 컴포넌트)
✅ Mobile-3: 에러 메시지 한글화 (20+ 메시지 번역)
✅ Mobile-4: 비밀번호 재설정 (LoginScreen 통합)
✅ Vercel 배포 설정 수정 (npm workspaces)
✅ 코드 품질 컴포넌트 추가 (ErrorBoundary, Toast, Skeleton)

### 이전 완료 (2025-11-14)
✅ PWA 프로덕션 배포 완료
✅ 모바일 라우팅 수정 (vercel.json)
✅ 브랜드 로고 적용 (PWA manifest)
✅ 자동 리다이렉트 로직 구현

### Phase 3 게임화 시스템 (2025-11-10~12)
✅ XP 시스템 Phase 1 & 2 (레벨 진행 속도 67% 개선)
✅ 배지 시스템 완전 자동화 (토스트 알림, NEW 인디케이터)
✅ 월간 배지 자동 리셋 (Cron)
✅ 스트릭 계산 버그 수정 (KST 타임존 지원)

### Phase 2 기능 확장 (2025-11-01~08)
✅ 만다라트 활성화/비활성화
✅ 날짜 선택 기능 (어제까지 체크 허용)
✅ 알림 권한 안내
✅ 통계 만다라트 필터

---

**문서 버전**: 3.14
**최종 수정**: 2025-12-11
**작성자**: Development Team
