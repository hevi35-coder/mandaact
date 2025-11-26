# Session: Metro Bundler pnpm Workspace Issue

**Date**: 2025-11-26
**Duration**: ~1 hour
**Focus**: Metro Bundler module resolution 문제 해결

## 🎯 목표
- Metro Bundler에서 QR 코드가 표시되지 않는 문제 해결
- iOS 시뮬레이터에서 앱 실행

## 🔍 문제 진단

### 증상
1. Metro Bundler는 실행되지만 QR 코드가 표시되지 않음
2. `Waiting on http://localhost:8081` 메시지만 표시
3. 번들 생성 시 모듈 해상도 에러 발생

### 근본 원인
```
Error: Unable to resolve module ./index from /Users/jhsy/mandaact/.:
```
- Metro가 워크스페이스 루트(`/Users/jhsy/mandaact/.`)에서 엔트리 포인트를 찾으려 함
- 실제 엔트리 포인트는 `/Users/jhsy/mandaact/apps/mobile/index.ts`에 위치
- **pnpm workspace + Expo + Metro의 알려진 호환성 문제**

## ❌ 시도한 해결책들

### 1. Metro Configuration 수정
- `apps/mobile/metro.config.js` 생성 및 수정
- `projectRoot`, `watchFolders`, `nodeModulesPaths` 설정
- `resolveRequest` 커스텀 함수 추가
- **결과**: 실패 - 여전히 같은 에러

### 2. 루트 리다이렉트 파일
- `/Users/jhsy/mandaact/index.js` 생성
- apps/mobile/index로 리다이렉트
- **결과**: Babel 플러그인 충돌 (`react-native-worklets/plugin` not found)

### 3. iOS Simulator 직접 빌드
```bash
npx expo run:ios
```
- Native 디렉토리 생성 및 CocoaPods 설치 성공
- **결과**: XcodeBuild 에러 65 - 컴파일 실패

### 4. 다양한 Metro 재시작 시도
- 워크스페이스 루트에서 실행
- apps/mobile 디렉토리에서 실행
- 캐시 클리어 (`--clear`)
- **결과**: 모두 동일한 모듈 해상도 에러

## ✅ 최종 해결책: Expo Go 사용

### Expo Go 앱 설정
```bash
# iOS App Store에서 Expo Go 앱 다운로드
# 터널 모드로 실행
npx expo start --tunnel --clear
```

### 장점
- 네이티브 빌드 불필요
- QR 코드 또는 URL로 즉시 실행 가능
- 개발 중 빠른 반복 작업 가능

## 📝 핵심 발견 사항

### pnpm Workspace + Expo 호환성
- **Expo SDK 52는 pnpm workspace를 완벽하게 지원하지 않음**
- Metro Bundler가 워크스페이스 구조를 제대로 이해하지 못함
- 엔트리 포인트 해상도가 워크스페이스 루트로 기본 설정됨

### QR 코드가 나타나지 않는 이유
- 번들 생성이 실패하면 QR 코드도 표시되지 않음
- Metro가 엔트리 포인트를 찾지 못하면 번들 생성 불가

## 🚀 권장 워크플로우

### 개발 환경
1. **Expo Go 사용** (권장)
   - 가장 빠르고 간단한 방법
   - 터널 모드로 네트워크 문제 우회 가능

2. **독립 프로젝트 분리** (대안)
   ```bash
   cp -r apps/mobile ~/mandaact-mobile-standalone
   cd ~/mandaact-mobile-standalone
   pnpm install
   npx expo start
   ```

3. **향후 개선 사항**
   - Expo SDK가 pnpm workspace를 완벽하게 지원할 때까지 대기
   - 또는 yarn workspace로 마이그레이션 고려

## 📚 참고 자료
- [Expo + pnpm workspace issue](https://github.com/expo/expo/issues)
- 이전 세션: `SESSION_2025-11-26_VERSION_FIX.md` (npm → pnpm 마이그레이션)

## 💡 교훈
1. 모든 툴체인이 pnpm workspace를 지원하는 것은 아님
2. 문제 해결 시 근본 원인 파악이 중요
3. 때로는 우회 방법(Expo Go)이 가장 효율적인 해결책
4. 호환성 문제는 문서화하여 팀과 공유 필요