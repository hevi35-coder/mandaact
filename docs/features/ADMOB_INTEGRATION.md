# AdMob Integration Guide

MandaAct 모바일 앱의 AdMob 광고 통합 가이드입니다.

## 개요

- **라이브러리**: `react-native-google-mobile-ads` v14.x
- **광고 유형**: Banner Ads (Anchored Adaptive), Rewarded Ads (예정)
- **신규 사용자 보호**: 가입 후 7일간 광고 미노출

## 광고 단위 (Ad Units)

### iOS
| 위치 | Ad Unit ID | 용도 |
|------|------------|------|
| 홈 배너 | `ca-app-pub-3170834290529005/9573851401` | 홈 화면 하단 |
| 투데이 배너 | `ca-app-pub-3170834290529005/9573851402` | 오늘의 실천 하단 |
| 리스트 배너 | `ca-app-pub-3170834290529005/9573851403` | 만다라트 목록 하단 |

### Android (예정)
| 위치 | Ad Unit ID | 용도 |
|------|------------|------|
| 홈 배너 | TBD | 홈 화면 하단 |
| 투데이 배너 | TBD | 오늘의 실천 하단 |
| 리스트 배너 | TBD | 만다라트 목록 하단 |

## 배너 사이즈

**ANCHORED_ADAPTIVE_BANNER** 사용 (권장)
- 화면 너비에 맞춰 최적 높이 자동 계산
- 일반적으로 50-90px (기기에 따라 다름)
- 고정 사이즈보다 수익률이 높음

### 사용 가능한 배너 사이즈
| 사이즈 | 크기 | 특징 |
|--------|------|------|
| `BANNER` | 320x50 | 표준 배너 |
| `LARGE_BANNER` | 320x100 | 큰 배너 |
| `MEDIUM_RECTANGLE` | 300x250 | 피드 중간용 |
| `ANCHORED_ADAPTIVE_BANNER` | 화면너비 x 자동 | **현재 사용** |

## 구현 파일

```
apps/mobile/
├── src/
│   ├── components/ads/
│   │   ├── BannerAd.tsx      # 배너 광고 컴포넌트
│   │   └── RewardedAd.tsx    # 리워드 광고 (예정)
│   └── lib/
│       └── ads.ts            # 광고 설정 및 헬퍼 함수
├── app.json                  # GADApplicationIdentifier 설정
└── App.tsx                   # SDK 초기화
```

## SDK 초기화

`App.tsx`에서 앱 시작 시 초기화:

```typescript
import mobileAds from 'react-native-google-mobile-ads'

// 앱 시작 시 SDK 초기화
mobileAds()
  .initialize()
  .then((adapterStatuses) => {
    console.log('[AdMob] SDK initialized', adapterStatuses)
  })
```

## BannerAd 컴포넌트 사용법

```tsx
import { BannerAd } from '@/components/ads/BannerAd'

// 페이지 하단에 배치
<BannerAd location="home" />
<BannerAd location="today" />
<BannerAd location="list" />
```

## 신규 사용자 보호 정책

`src/lib/ads.ts`의 `getNewUserAdRestriction()`:

| 기간 | 광고 정책 |
|------|-----------|
| 가입 후 0-7일 | 광고 없음 (`no_ads`) |
| 가입 후 8일+ | 모든 광고 표시 (`full_ads`) |

## 앱 설정

### app.json
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "GADApplicationIdentifier": "ca-app-pub-3170834290529005~1573851405",
        "SKAdNetworkItems": [
          { "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork" },
          // ... 기타 네트워크
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

## 테스트

### 개발 환경
- `__DEV__` 모드에서 자동으로 `TestIds.ADAPTIVE_BANNER` 사용
- 실제 광고 단위 대신 테스트 광고 표시

### TestFlight/실기기 테스트
1. EAS Build로 프로덕션 빌드 생성
2. App Store Connect에 업로드
3. TestFlight에서 설치 후 테스트
4. 실제 광고 노출 확인

### 시뮬레이터 제한
- iOS 시뮬레이터에서는 테스트 광고가 불안정할 수 있음
- 실기기 테스트 권장

## 트러블슈팅

### 광고가 표시되지 않는 경우
1. `GADApplicationIdentifier` 확인
2. Ad Unit ID 형식 확인 (`ca-app-pub-xxx/yyy`)
3. 네트워크 연결 확인
4. 신규 사용자 보호 기간 확인

### 크래시 발생 시
1. SDK 초기화 확인 (`mobileAds().initialize()`)
2. 환경변수가 빌드에 포함되었는지 확인
3. EAS Build 로그 확인

## 향후 계획

1. **Phase 2**: Rewarded Ads (리워드 광고)
   - 보상형 광고로 추가 XP 획득
   - 프리미엄 기능 임시 해제

2. **Phase 3**: Interstitial Ads (전면 광고)
   - 화면 전환 시 표시
   - 빈도 제한 적용

3. **Android 지원**
   - Android Ad Unit ID 생성
   - Google Play 배포

## 참고 링크

- [react-native-google-mobile-ads 문서](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob 콘솔](https://admob.google.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)
