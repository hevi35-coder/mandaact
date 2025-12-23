# AdMob Integration Guide

MandaAct 모바일 앱의 AdMob 광고 통합 가이드입니다.

> **최종 업데이트**: 2025-12-07
> **현재 빌드**: Build 37

## 개요

- **라이브러리**: `react-native-google-mobile-ads` v14.x
- **광고 유형**: Banner, Interstitial, Rewarded Ads
- **신규 사용자 보호**: 가입 후 3일간 광고 없음, 7일간 배너만
- **Ad-Free Time**: 보상형 광고 시청 시 24시간 배너 제거 (집중 모드)

---

## 운영/검증 체크 (광고가 안 뜰 때)

AdMob 콘솔에서 앱이 “Verify app” 상태이거나 광고가 24시간 이상 서빙되지 않으면 아래 문서를 우선 확인하세요.

- `docs/troubleshooting/ADMOB_APP_VERIFICATION.md`
  - App Store Connect의 `Marketing URL`(스토어 페이지의 Developer Website) 미설정으로 검증 실패하는 케이스
  - `app-ads.txt` 배포/반영 확인 커맨드
  - 앱 내부 “신규 사용자 보호(0~3일 광고 없음 / 7일 배너만)”로 인해 테스트 화면에서 광고가 안 보일 수 있는 케이스

## 구현 진행 현황

### ✅ Phase 1: 배너 광고 (완료)
| 항목 | 상태 | 비고 |
|------|------|------|
| SDK 초기화 | ✅ 완료 | App.tsx에 구현 |
| BannerAd 컴포넌트 | ✅ 완료 | 신규 사용자 보호 + Ad-Free 체크 |
| HomeScreen 배너 | ✅ 완료 | 화면 하단 |
| TodayScreen 배너 | ❌ 제거 | **Clean Zone** (집중력 보호) |
| MandalartListScreen 배너 | ✅ 완료 | 화면 하단 |
| ReportsScreen 배너 | ✅ 완료 | 화면 하단 |

### ✅ Phase 2: XP 부스트 보상형 광고 (완료)
| 항목 | 상태 | 비고 |
|------|------|------|
| useRewardedAd 훅 | ✅ 완료 | 보상형 광고 공통 훅 |
| XPBoostButton 컴포넌트 | ✅ 완료 | UI 가이드 반영 완료 |
| HomeScreen 연동 | ✅ 완료 | ProfileCard와 StreakCard 사이 |
| TodayScreen 연동 | ✅ 완료 | ProgressCard 아래 |
| XP 멀티플라이어 DB 연동 | ✅ 완료 | xp_multipliers 테이블 |

### ✅ Phase 3: 추가 보상형 광고 (완료)
| 항목 | 상태 | 비고 |
|------|------|------|
| StreakFreezeButton 컴포넌트 | ❌ 비활성화 | AdMob 정책 검토 후 비활성화 |
| YesterdayCheckButton 컴포넌트 | ❌ 비활성화 | AdMob 정책 검토 후 비활성화 |
| ReportGenerateButton 컴포넌트 | ✅ 완료 | UI 구현 완료 |
| AdFreeButton 컴포넌트 | ✅ 완료 | 24시간 배너 제거 (집중 모드) |
| **StreakFreezeButton 화면 연동** | ❌ 비활성화 | AdMob 정책 검토 후 비활성화 |
| **YesterdayCheckButton 화면 연동** | ❌ 비활성화 | AdMob 정책 검토 후 비활성화 |
| **ReportGenerateButton 화면 연동** | ✅ 완료 | ReportsScreen에 배치 |

### ✅ Phase 4: 전면 광고 (완료)
| 항목 | 상태 | 비고 |
|------|------|------|
| useInterstitialAd 훅 | ✅ 완료 | 빈도 제한 로직 포함 |
| 만다라트 생성 후 | ✅ 완료 | MandalartCreateScreen에서 연동 |
| 리포트 확인 후 | ✅ 완료 | ReportsScreen에서 연동 |
| 레벨업 달성 후 | ❌ 비활성화 | 사용자 경험 저해로 비활성화 결정 |

---

## 보상형 광고 기능 영향도 분석

### 1. XP 부스트 (✅ 연동 완료)
```
영향 범위:
├── user_gamification.xp_multipliers (2x 멀티플라이어 적용)
├── check_action 시 XP 계산 로직
└── HomeScreen, TodayScreen UI

구현 상태: ✅ 완료
- XPBoostButton이 HomeScreen, TodayScreen에 배치됨
- 광고 시청 → xp_multipliers 테이블에 1시간 2x 부스트 기록
- 체크 시 멀티플라이어 자동 적용
```

### 2. 스트릭 프리즈 (❌ 비활성화)
```
영향 범위:
├── user_gamification.streak_freeze_until (보호 기간 설정)
├── 스트릭 계산 로직 (streak_freeze_until 체크 필요)
└── StreakCard UI (프리즈 상태 표시)

구현 상태: ❌ 비활성화 (AdMob 정책 검토)
- ✅ StreakFreezeButton 컴포넌트 완료
- ✅ streak_freeze_until 필드 업데이트 로직 완료
- ❌ StreakCard 내 버튼 배치 - 비활성화
- 사유: AdMob 정책상 "광고 보상으로 핵심 게임 기능 우회"에 해당할 수 있음
```

### 3. 어제 체크 복구 (❌ 비활성화)
```
영향 범위:
├── check_history 테이블 (어제 날짜로 체크 삽입)
├── 스트릭 재계산
├── XP 지급 (어제 날짜 기준 적용)
└── TodayScreen 액션 셀 UI

구현 상태: ❌ 비활성화 (AdMob 정책 검토)
- ✅ YesterdayCheckButton 컴포넌트 완료
- ✅ useYesterdayCheck 훅 구현 (어제 날짜로 체크 삽입)
- ✅ useYesterdayMissed 훅 구현 (어제 미완료 액션 감지)
- ❌ TodayScreen 연동 - 비활성화
- 사유: AdMob 정책상 "과거 기록 조작" 기능에 대한 리스크
```

### 4. AI 리포트 생성 (✅ 연동 완료)
```
영향 범위:
├── generate-weekly-report Edge Function 호출
├── 리포트 저장 및 표시
└── ReportsScreen UI

구현 상태: ✅ 완료
- ✅ ReportGenerateButton 컴포넌트 완료
- ✅ ReportsScreen에 버튼 배치 완료
- ✅ 광고 시청 후 리포트 생성 트리거 연동 완료
```

### 5. Ad-Free Time 집중 모드 (✅ 연동 완료)
```
영향 범위:
├── AsyncStorage (ad_free_until 타임스탬프 저장)
├── BannerAd 컴포넌트 (Ad-Free 상태 체크)
└── TodayScreen (Clean Zone - 배너 광고 없음)

구현 상태: ✅ 완료
- ✅ useAdFree 훅 구현 (상태 관리, 활성화, 남은 시간)
- ✅ AdFreeButton 컴포넌트 완료 (보상형 광고 시청 → 24시간 배너 제거)
- ✅ BannerAd에 Ad-Free 체크 로직 추가
- ✅ TodayScreen Clean Zone 정책 적용 (배너 광고 제거)
```

---

## 다음 작업 우선순위

### ✅ 완료됨
1. ~~**StreakFreezeButton 연동**~~: ✅ StreakCard에 배치 완료
2. ~~**ReportGenerateButton 연동**~~: ✅ ReportsScreen에 배치 완료
3. ~~**전면 광고 연동**~~: ✅ 만다라트 생성, 리포트 생성 후 트리거 연동 완료
4. ~~**TodayScreen 배너 제거**~~: ✅ Clean Zone 정책 적용
5. ~~**Ad-Free Time 시스템**~~: ✅ useAdFree 훅 + AdFreeButton 구현

### 중간 (UX 개선)
1. ~~**AdFreeButton 화면 배치**~~: ✅ SettingsScreen "집중 모드" 섹션에 배치 완료
2. **Feedback Loop**: 배너 닫기 버튼(`x`) → Premium 유도 모달

### 낮음 (추후 진행)
4. Android Ad Unit ID 설정 및 테스트
5. 광고 분석 대시보드 연동
6. Premium 구독 시 광고 제거

## 광고 단위 (Ad Units)

### iOS App ID
```
ca-app-pub-3170834290529005~1573851405
```

### Banner Ads (배너 광고)
| 위치 | Ad Unit ID | 용도 |
|------|------------|------|
| 홈 하단 | `ca-app-pub-3170834290529005/2326142365` | 홈 화면 하단 |
| 투데이 하단 | `ca-app-pub-3170834290529005/9354585142` | 오늘의 실천 하단 |
| 리스트 하단 | `ca-app-pub-3170834290529005/5953739649` | 만다라트 목록 하단 |

### Interstitial Ads (전면 광고)
| 트리거 | Ad Unit ID | 상태 | 빈도 |
|--------|------------|------|------|
| 만다라트 생성 후 | `ca-app-pub-3170834290529005/5349543913` | ✅ 활성 | 3시간 쿨다운, 일 2회 |
| 리포트 확인 후 | `ca-app-pub-3170834290529005/4640657973` | ✅ 활성 | 3시간 쿨다운, 일 2회 |
| 레벨업 달성 후 | `ca-app-pub-3170834290529005/3662618222` | ❌ 비활성화 | 사용자 경험 저해 |

### Rewarded Ads (보상형 광고)
| 보상 | Ad Unit ID | 효과 |
|------|------------|------|
| 리포트 생성 | `ca-app-pub-3170834290529005/4293830156` | AI 리포트 무료 생성 |
| XP 부스트 | `ca-app-pub-3170834290529005/1462269794` | 1시간 2x XP |
| 스트릭 프리즈 | `ca-app-pub-3170834290529005/7921427436` | 1일 스트릭 보호 |
| 어제 체크 복구 | `ca-app-pub-3170834290529005/9592041258` | 어제 실천 체크 가능 |

## 구현 파일 구조

```
apps/mobile/
├── src/
│   ├── components/ads/
│   │   ├── index.ts                  # Export all components
│   │   ├── BannerAd.tsx              # 배너 광고 컴포넌트 (Ad-Free 체크 포함)
│   │   ├── XPBoostButton.tsx         # XP 부스트 버튼
│   │   ├── StreakFreezeButton.tsx    # 스트릭 보호 버튼
│   │   ├── YesterdayCheckButton.tsx  # 어제 체크 버튼
│   │   ├── ReportGenerateButton.tsx  # 리포트 생성 버튼
│   │   └── AdFreeButton.tsx          # Ad-Free 모드 활성화 버튼 (NEW)
│   ├── hooks/
│   │   ├── useRewardedAd.ts          # 보상형 광고 훅
│   │   ├── useInterstitialAd.ts      # 전면 광고 훅
│   │   └── useAdFree.ts              # Ad-Free 상태 관리 훅 (NEW)
│   └── lib/
│       └── ads.ts                    # 광고 설정, 헬퍼 함수, Ad-Free 시스템
├── app.json                          # GADApplicationIdentifier 설정
└── App.tsx                           # SDK 초기화
```

## 사용법

### 배너 광고
```tsx
import { BannerAd } from '@/components/ads'

// 페이지 하단에 배치
<BannerAd location="home" />
<BannerAd location="today" />
<BannerAd location="list" />
```

### XP 부스트 버튼
```tsx
import { XPBoostButton } from '@/components/ads'

<XPBoostButton
  onBoostActivated={() => {
    // XP 멀티플라이어 새로고침
  }}
/>
```

### 스트릭 프리즈 버튼
```tsx
import { StreakFreezeButton } from '@/components/ads'

<StreakFreezeButton
  onFreezeActivated={() => {
    // 스트릭 상태 새로고침
  }}
/>
```

### 어제 체크 버튼
```tsx
import { YesterdayCheckButton } from '@/components/ads'

// TodayScreen에서 어제 미완료 액션에 표시
<YesterdayCheckButton
  actionId={action.id}
  actionTitle={action.title}
  onCheckCompleted={() => {
    // 어제 체크 완료 → 스트릭/XP 새로고침
  }}
/>
```

### Ad-Free 버튼 (집중 모드)
```tsx
import { AdFreeButton } from '@/components/ads'

<AdFreeButton
  onActivated={() => {
    // Ad-Free 상태 새로고침 (BannerAd 자동 숨김)
  }}
/>
```

### 어제 미완료 액션 감지 훅
```tsx
import { useYesterdayMissed } from '@/hooks/useActions'

// TodayScreen에서 오늘 날짜인 경우에만 사용
const { data: yesterdayMissedIds, refetch } = useYesterdayMissed(
  isToday ? user?.id : undefined,
  timezone
)

// yesterdayMissedIds: Set<string> - 어제 체크하지 못한 액션 ID 세트
// 액션 셀에서 사용:
const showYesterdayButton = yesterdayMissedIds?.has(action.id)
```

### Ad-Free 상태 훅
```tsx
import { useAdFree } from '@/hooks'

const { isAdFree, remainingTimeFormatted, activate, refresh } = useAdFree()

// isAdFree: boolean - 현재 Ad-Free 활성화 여부
// remainingTimeFormatted: string - "23시간 45분" 형태
// activate: () => Promise<Date> - Ad-Free 활성화 (24시간)
// refresh: () => Promise<void> - 상태 새로고침
```

### 전면 광고 (Interstitial)
```tsx
import { useInterstitialAd } from '@/hooks'

const { isLoaded, show } = useInterstitialAd({
  adType: 'INTERSTITIAL_AFTER_CREATE',
  onAdClosed: () => {
    // 광고 닫힌 후 처리
  },
})

// 만다라트 생성 완료 후
if (isLoaded) {
  await show()
}
```

## 신규 사용자 보호 정책

| 기간 | 광고 정책 |
|------|-----------|
| 가입 후 0-3일 | 모든 광고 없음 (`no_ads`) |
| 가입 후 4-7일 | 배너만 표시 (`banner_only`) |
| 가입 후 8일+ | 모든 광고 표시 (`full`) |

```typescript
import { getNewUserAdRestriction } from '@/lib/ads'

const restriction = getNewUserAdRestriction(user.created_at)
// 'no_ads' | 'banner_only' | 'full'
```

## 전면 광고 빈도 제한

- 쿨다운: **3시간** (동일 유형 광고 간) - 보수적 정책
- 일일 한도: **2회** - 보수적 정책
- 신규 유저: **7일간** 전면 광고 미표시 (가입 후 3일 광고 없음, 3~7일 배너만)

```typescript
import { canShowInterstitial, markInterstitialShown } from '@/lib/ads'

if (canShowInterstitial()) {
  await interstitialAd.show()
  markInterstitialShown()
}
```

## SDK 초기화

`App.tsx`에서 앱 시작 시 초기화:

```typescript
import mobileAds from 'react-native-google-mobile-ads'

useEffect(() => {
  mobileAds()
    .initialize()
    .then((adapterStatuses) => {
      console.log('[AdMob] SDK initialized', adapterStatuses)
    })
}, [])
```

## 테스트

### 개발 환경
- `__DEV__` 모드에서 자동으로 테스트 광고 ID 사용
- 실제 광고 단위 대신 Google 공식 테스트 광고 표시

### TestFlight/실기기 테스트
1. EAS Build로 프로덕션 빌드 생성
2. App Store Connect에 업로드
3. TestFlight에서 설치 후 테스트
4. 실제 광고 노출 확인

### 테스트 Ad Unit IDs (자동 적용)
```
Banner: ca-app-pub-3940256099942544/2934735716
Interstitial: ca-app-pub-3940256099942544/4411468910
Rewarded: ca-app-pub-3940256099942544/1712485313
```

## 앱 설정

### app.json
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "GADApplicationIdentifier": "ca-app-pub-3170834290529005~1573851405",
        "SKAdNetworkItems": [
          { "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork" }
        ]
      }
    },
    "plugins": [
      ["react-native-google-mobile-ads", {
        "iosAppId": "ca-app-pub-3170834290529005~1573851405"
      }]
    ]
  }
}
```

## 트러블슈팅

### 광고가 표시되지 않는 경우
1. `GADApplicationIdentifier` 확인
2. Ad Unit ID 형식 확인 (`ca-app-pub-xxx/yyy`)
3. 네트워크 연결 확인
4. 신규 사용자 보호 기간 확인 (가입 후 7일)

### 크래시 발생 시
1. SDK 초기화 확인 (`mobileAds().initialize()`)
2. 환경변수가 빌드에 포함되었는지 확인
3. EAS Build 로그 확인

### 보상이 지급되지 않는 경우
1. `onRewardEarned` 콜백 확인
2. 광고 시청 완료 여부 확인 (중간에 닫으면 보상 없음)
3. 네트워크 연결 확인

## UI/UX 가이드라인

### XP 부스트 버튼
- 위치: HomeScreen (프로필 카드와 스트릭 카드 사이), TodayScreen (진행률 카드 아래)
- 스타일: 앱의 카드 디자인과 일치하는 흰색 배경
- 아이콘: 번개 아이콘 (Zap), 노란색 배경

### 전면 광고 트리거
- 만다라트 생성 완료 후 ✅
- AI 리포트 확인 후 ✅
- ~~레벨업 달성 시~~ ❌ (비활성화 - 사용자 경험 저해)

## 향후 계획 (Roadmap)

### ✅ Phase 3 완료 (보상형 광고 화면 연동)
- [x] ~~StreakFreezeButton → StreakCard 내 배치~~ ❌ 비활성화 (AdMob 정책)
- [x] ~~YesterdayCheckButton → TodayScreen 어제 미완료 액션에 표시~~ ❌ 비활성화 (AdMob 정책)
- [x] ReportGenerateButton → ReportsScreen에 배치
- [x] ~~useYesterdayCheck 훅~~ ❌ 비활성화 (AdMob 정책)

### ✅ Phase 4 완료 (전면 광고 연동)
- [x] MandalartCreateFlow 완료 → 전면 광고 트리거
- [x] ReportsScreen 상세 닫기 → 전면 광고 트리거
- [x] ~~레벨업 감지 → 전면 광고 트리거~~ → **비활성화** (사용자 경험 저해)

### ✅ Phase 10.2.6 완료 (수익화 고도화)
- [x] TodayScreen 배너 제거 → Clean Zone 정책 적용
- [x] Ad-Free Time 시스템 → useAdFree 훅 + AdFreeButton 구현
- [x] AdFreeButton 화면 배치 → SettingsScreen "집중 모드" 섹션
- [ ] Feedback Loop → 배너 닫기 버튼(`x`) → Premium 유도 모달

### Phase 5: Android 및 확장
- [ ] Android 광고 Unit ID 추가
- [ ] 광고 분석 대시보드 연동
- [ ] A/B 테스트 (광고 위치, 빈도)
- [ ] Premium 구독 시 광고 제거

## 참고 링크

- [react-native-google-mobile-ads 문서](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob 콘솔](https://admob.google.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)
