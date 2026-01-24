# Simulator Setup Guide

이 문서는 MandaAct 모바일 앱 개발을 위한 시뮬레이터(iOS) 및 에뮬레이터(Android) 환경을 시행착오 없이 빠르게 구성하기 위한 가이드입니다.

## 1. 사전 요구사항 (Prerequisites)

- **Node.js**: v18 이상
- **패키지 매니저**: pnpm (9.x 이상 권장)
- **Xcode**: 최신 버전 (iOS 시뮬레이터용, macOS 전용)
- **Android Studio**: 최신 버전 (Android 에뮬레이터용)
- **CocoaPods**: iOS 네이티브 모듈 설치용 (`brew install cocoapods`)

## 2. 초기 환경 설정

### 2.1 의존성 설치
프로젝트 루트 디렉토리에서 전체 패키지를 설치합니다.
```bash
pnpm install
```

### 2.2 환경 변수 설정
`apps/mobile` 디렉토리에 `.env` 파일을 구성해야 합니다.
```bash
cd apps/mobile
cp .env.example .env
```
`.env` 파일에 필요한 Supabase 및 외부 서비스 키를 입력합니다. (필요 시 팀 내 공유된 값을 사용하세요.)

## 3. 시뮬레이터 실행 방법

### 3.1 iOS 시뮬레이터 (권장)
가장 안정적이고 빠른 실행 방법입니다.

1. **시뮬레이터 준비**: Xcode를 열고 `Open Developer Tool > Simulator`를 선택하여 시뮬레이터를 미리 실행해두면 빌드 속도가 빨라집니다.
2. **앱 실행**:
   ```bash
   # 루트 디렉토리에서
   pnpm ios
   
   # 또는 apps/mobile 디렉토리에서
   npx expo run:ios
   ```
   *참고: `run:ios`는 네이티브 빌드를 포함하므로 첫 실행 시 시간이 다소 소요될 수 있습니다.*

### 3.2 Android 에뮬레이터
1. **에뮬레이터 준비**: Android Studio의 `Device Manager`에서 가상 기기(AVD)를 생성하고 실행합니다.
2. **앱 실행**:
   ```bash
   # 루트 디렉토리에서
   pnpm android
   
   # 또는 apps/mobile 디렉토리에서
   npx expo run:android
   ```

## 4. 효율적인 개발을 위한 팁

- **Metro 번들러**: 앱이 실행되면 터미널에 Metro 번들러가 나타납니다.
  - `r`: 앱 새로고침 (Reload)
  - `m`: 개발자 메뉴 열기 (Dev Menu)
  - `j`: 디버거 연결 (Debugger)
- **로그 확인**: 에이전트 환경에서는 `run_command`로 명령을 실행한 뒤 `command_status`를 통해 `LOG` 출력을 모니터링할 수 있습니다.

## 5. 문제 해결 (Troubleshooting)

### 5.1 빌드 오류 시 캐시 삭제
```bash
# Metro 캐시 초기화 및 재시작
npx expo start --clear
```

### 5.2 iOS Pod 관련 문제
```bash
cd apps/mobile/ios
rm -rf Pods
rm Podfile.lock
pod install --repo-update
```

### 5.3 포트 충돌 (8081)
이미 8081 포트가 사용 중인 경우:
```bash
lsof -i :8081
kill -9 <PID>
```

---
**관련 문서**:
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 전체 프로젝트 설정
- [BUILD_GUIDE.md](./BUILD_GUIDE.md) - 상세 빌드 가이드
- [TESTING_GUIDE.md](../mobile/TESTING_GUIDE.md) - 모바일 테스트 시나리오
