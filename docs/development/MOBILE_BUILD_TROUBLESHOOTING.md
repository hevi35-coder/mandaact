# MandaAct Mobile Build Troubleshooting Log

## 개요

2025-12-05 iOS 개발 빌드 시 Expo Dev Client 스플래시 화면에서 멈추는 문제 트러블슈팅 기록

## 환경

- **Expo SDK**: 52
- **React Native**: 0.76.1
- **NativeWind**: 4.1.23
- **테스트 기기**: iPhone 17 Pro (iOS 26.1 Simulator)
- **빌드 타입**: Development (expo-dev-client)

## 문제 발생 경과

### Phase 1: 초기 문제 - Bridgeless Mode TypeError

**증상:**
- 앱 스플래시 화면에서 멈춤
- JavaScript 에러: `(NOBRIDGE) ERROR TypeError: property is not writable`

**원인 분석:**
- NativeWind v4 + `react-native-css-interop`이 React Native 0.76의 Bridgeless 모드와 호환되지 않음
- Expo SDK 52의 기본 설정이 `newArchEnabled: true` (New Architecture / Bridgeless 모드 활성화)

**시도한 해결책:**
1. NativeWind 비활성화 (`babel.config.js`, `metro.config.js`)
2. `newArchEnabled: false`로 변경 (`app.json`)

### Phase 2: 빌드 성공 후 Dev Client 스플래시 멈춤

**증상:**
- iOS 네이티브 빌드 성공 (0 errors, 4-6 warnings)
- Metro 번들러 정상 연결
- JavaScript 번들 로드 성공 (`iOS Bundled 505ms apps/mobile/index.ts (1036 modules)`)
- **BUT**: Expo Dev Client 스플래시 화면(파란 배경 + 동심원 그리드)에서 멈춤
- React 컴포넌트 마운트 로그 (`[APP] Component mounted`) 출력 없음

**원인 추정:**
- iOS 네이티브 프로젝트가 이전 설정(`newArchEnabled: true`)으로 빌드되어 있음
- 설정 변경 후 CocoaPods 재설치가 필요함

### Phase 3: 클린 빌드 시도 (현재 진행 중)

**수행한 작업:**
```bash
# iOS 폴더 및 캐시 완전 삭제
rm -rf ios .expo node_modules/.cache

# 새로운 iOS 네이티브 프로젝트 생성 + 빌드
npx expo run:ios --device "iPhone 17 Pro"
```

**현재 상태:** 클린 빌드 진행 중
- Prebuild 완료
- CocoaPods 설치 완료
- Xcode 컴파일 진행 중 (React-Fabric 등)

## 설정 변경 내역

### app.json
```json
{
  "expo": {
    "newArchEnabled": false  // true → false로 변경
  }
}
```

### babel.config.js
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
    // NativeWind 비활성화됨
  };
};
```

### metro.config.js
```javascript
// NOTE: NativeWind temporarily disabled for RN 0.76 bridgeless mode compatibility testing
// const { withNativeWind } = require('nativewind/metro');
// module.exports = withNativeWind(config, { input: './global.css' });
module.exports = config;  // NativeWind 없이 내보내기
```

### ios/Podfile.properties.json (생성됨)
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "newArchEnabled": "false"
}
```

### App.tsx (테스트용 최소화)
```tsx
// 최소화된 테스트 앱 - Alert 없이 상태 표시
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function App() {
  const [mounted, setMounted] = useState(false)
  const [timestamp, setTimestamp] = useState('')

  useEffect(() => {
    console.log('[APP] Component mounted successfully!')
    setMounted(true)
    setTimestamp(new Date().toLocaleTimeString())
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MandaAct</Text>
      <Text style={styles.subtitle}>Build without New Architecture</Text>
      <Text style={styles.status}>Status: {mounted ? 'RUNNING' : 'Loading...'}</Text>
      {timestamp ? <Text style={styles.time}>Started: {timestamp}</Text> : null}
    </View>
  )
}
```

## 알려진 이슈

### NativeWind v4 + React Native 0.76 Bridgeless Mode 비호환

**문제:**
- NativeWind v4는 `react-native-css-interop`을 사용
- 이 라이브러리가 RN 0.76의 Bridgeless 모드와 충돌
- GitHub Issue: 추적 필요

**해결 방안:**
1. **단기**: `newArchEnabled: false`로 Old Architecture 사용
2. **중기**: NativeWind 호환 버전 출시 대기
3. **장기**: NativeWind 없이 StyleSheet만 사용 고려

## 현재 진행 상황 (2025-12-05 15:50 KST)

### Phase 4: iOS 26.1 시뮬레이터 호환성 문제 발견

**클린 빌드 결과:**
```
✔ Created native directory (./ios)
✔ Finished prebuild
✔ Installed CocoaPods
✔ Build Succeeded (0 errors, 6 warnings)
✔ iOS Bundled 466ms apps/mobile/index.ts (1151 modules)
```

**문제 지속:**
- 빌드 완전 성공 ✅
- JavaScript 번들 로드 성공 ✅
- Metro 연결 정상 ✅
- **BUT**: 여전히 Expo Dev Client 스플래시 화면에서 멈춤 ❌
- React 컴포넌트 마운트 로그 (`[APP] Component mounted`) 출력 없음 ❌

**추가 시도:**
1. 앱 삭제 후 재설치 → 실패
2. 딥링크로 localhost Metro URL 직접 전달 → 실패
3. 앱 재시작 여러번 시도 → 실패

**새로운 원인 발견:**
- **Xcode 26 베타 + iOS 26.1 시뮬레이터** 사용 중
- iPhone 17 Pro (iOS 26.1) - 이것은 **미출시 베타 버전**
- Expo SDK 52 + expo-dev-client가 iOS 26.1과 호환되지 않는 것으로 추정
- 현재 사용 가능한 모든 시뮬레이터가 iOS 26.1 (Xcode 26 베타만 설치됨)

### iOS 26.1 호환성 문제

**환경:**
- Xcode: 26 베타 (16.x가 아닌 26.x)
- 시뮬레이터: iPhone 17 Pro, iPhone 17, iPhone Air 등 (모두 iOS 26.1)
- iOS 18.x 이하 시뮬레이터 없음

**증상:**
- 빌드/번들 모두 정상
- expo-dev-client 스플래시에서 React 앱으로 전환 안 됨
- JavaScript 실행은 되지만 네이티브 브릿지 연결 문제 추정

## 권장 해결 방안

### 단기 (즉시 적용 가능)
1. **Xcode 16.x (정식 버전) 설치 및 사용**
   - iOS 18.x 시뮬레이터 사용
   - `/Applications/Xcode.app` 외에 `/Applications/Xcode-16.app` 설치
   - `sudo xcode-select -s /Applications/Xcode-16.app` 로 전환

2. **실제 iOS 기기로 테스트**
   - iOS 17.x 또는 18.x 기기 연결
   - 시뮬레이터 대신 실제 기기 사용

### 중기
1. **Expo SDK 53 출시 대기**
   - iOS 26 지원 포함 예정

2. **expo-dev-client 업데이트 확인**
   - iOS 26.1 호환 버전 출시 시 업그레이드

## 다음 단계

1. [x] 클린 빌드 완료
2. [x] 빌드 성공 확인
3. [x] iOS 26.1 호환성 문제 발견
4. [ ] **Xcode 16.x 정식 버전 설치 권장**
5. [ ] iOS 18.x 시뮬레이터에서 테스트
6. [ ] 또는 실제 iOS 기기로 테스트

## 참고 자료

- [Expo SDK 52 Release Notes](https://expo.dev/changelog/2024/11-12-sdk-52)
- [React Native 0.76 Changelog](https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture)
- [NativeWind v4 Migration Guide](https://www.nativewind.dev/v4/getting-started/migration)
