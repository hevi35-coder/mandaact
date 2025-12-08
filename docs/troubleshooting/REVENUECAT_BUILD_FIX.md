# RevenueCat (react-native-purchases) iOS 빌드 이슈 해결 가이드

## 문제 상황
- 빌드 44 이후 `react-native-purchases` (^9.6.9) 추가됨
- EAS 로컬 빌드 실패
- 로그가 truncated되어 정확한 오류 확인 불가

## 참고 자료
- [RevenueCat Troubleshooting](https://www.revenuecat.com/docs/test-and-launch/debugging/troubleshooting-the-sdks)
- [RevenueCat React Native Installation](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Expo Build Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)
- [GitHub Issue #257](https://github.com/RevenueCat/react-native-purchases/issues/257)
- [PurchasesHybridCommon Issue](https://community.revenuecat.com/sdks-51/expo-react-native-unable-to-find-purchaseshybridcommon-4742)

---

## 해결 방안 목록

### 방법 1: iOS Deployment Target 확인 (최소 13.4)
**상태**: [ ] 시도 안함

RevenueCat SDK는 iOS 13.4 이상이 필요합니다.

```bash
# Podfile에서 확인
cat ios/Podfile | grep platform
```

**수정 방법**: `ios/Podfile`에서 `platform :ios, '13.4'` 이상으로 설정

---

### 방법 2: CocoaPods 클린 재설치
**상태**: [ ] 시도 안함

```bash
cd apps/mobile/ios
pod deintegrate
rm -rf Pods Podfile.lock
pod cache clean --all
pod install
```

---

### 방법 3: node_modules 및 패키지 재설치
**상태**: [ ] 시도 안함

```bash
cd apps/mobile
rm -rf node_modules
rm -rf ios
pnpm install
npx expo prebuild --platform ios --clean
```

---

### 방법 4: Swift 지원 확인
**상태**: [ ] 시도 안함

프로젝트에 Swift 파일이 없으면 빈 Swift 파일 추가 필요.
Expo prebuild가 자동으로 처리하지만, 확인 필요.

```bash
ls ios/MandaAct/*.swift
```

---

### 방법 5: BUILD_LIBRARY_FOR_DISTRIBUTION 설정 제외
**상태**: [ ] 시도 안함

`ios/Podfile`에 post_install hook 추가:

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    # RevenueCat targets 제외
    if ['RevenueCat', 'PurchasesHybridCommon', 'RNPurchases'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
      end
    end
  end
end
```

---

### 방법 6: 수동 xcodebuild로 상세 로그 확인
**상태**: [ ] 시도 안함

```bash
cd apps/mobile/ios
xcodebuild -workspace MandaAct.xcworkspace \
  -scheme MandaAct \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  archive \
  -archivePath ./build/MandaAct.xcarchive \
  2>&1 | tee build.log
```

---

### 방법 7: npx expo run:ios --configuration Release 로컬 테스트
**상태**: [ ] 시도 안함

EAS 빌드 전에 로컬에서 Release 빌드 테스트:

```bash
cd apps/mobile
npx expo run:ios --configuration Release --device
```

---

### 방법 8: react-native-purchases 버전 다운그레이드
**상태**: [ ] 시도 안함

최신 버전에 이슈가 있을 경우 안정 버전으로 다운그레이드:

```bash
pnpm remove react-native-purchases
pnpm add react-native-purchases@8.2.4
```

---

## 시도 기록

| 날짜 | 방법 | 결과 | 오류 내용 |
|------|------|------|-----------|
| 2025-12-08 | 방법 1: iOS Deployment Target | ✅ OK | 15.1 (≥13.4 충족) |
| 2025-12-08 | 방법 6: 수동 xcodebuild | ❌ 실패 | **코드 서명 오류** - "Signing requires a development team" |

---

## 실제 원인 발견

**RevenueCat이 문제가 아님!** 실제 원인은 **코드 서명 설정 누락**:

```
error: Signing for "MandaAct" requires a development team.
Select a development team in the Signing & Capabilities editor.
```

### 해결 방법: CODE_SIGN 설정 추가

수동 xcodebuild 시 코드 서명 설정 필요:

```bash
xcodebuild -workspace MandaAct.xcworkspace \
  -scheme MandaAct \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath ./build/MandaAct.xcarchive \
  CODE_SIGN_IDENTITY="iPhone Distribution" \
  DEVELOPMENT_TEAM="NRHYC97U5U" \
  CODE_SIGN_STYLE="Manual" \
  PROVISIONING_PROFILE_SPECIFIER="match AppStore com.mandaact.app" \
  archive
```

또는 EAS 로컬 빌드 사용 (credentials.json 자동 적용)

---

## 최종 해결 방법

(해결 시 여기에 기록)

