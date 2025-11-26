# Session: Mobile App Metro & NativeWind Fix

**Date**: 2025-11-27
**Duration**: ~2 hours
**Focus**: pnpm workspace + Expo 호환성 문제 해결, NativeWind 스타일 적용

## 🎯 목표
- iOS 시뮬레이터에서 모바일 앱 실행
- NativeWind 스타일링 적용

## ✅ 해결한 문제들

### 1. Metro Bundler Entry Point Resolution

**문제**: Metro가 워크스페이스 루트(`/Users/jhsy/mandaact/.`)에서 `./index`를 찾으려 함
```
Error: Unable to resolve module ./index from /Users/jhsy/mandaact/.:
```

**원인**: pnpm workspace + Expo SDK 52 호환성 문제

**해결**: `metro.config.js`에 커스텀 리졸버 추가
```javascript
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix workspace root entry point resolution
  if (moduleName === './index' &&
      (context.originModulePath.endsWith('mandaact/.') ||
       context.originModulePath.endsWith('mandaact'))) {
    return {
      filePath: path.resolve(projectRoot, 'index.ts'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

### 2. Babel Worklets Plugin Missing

**문제**: `Cannot find module 'react-native-worklets/plugin'`

**해결**: `react-native-worklets` 패키지 설치
```bash
pnpm add -D react-native-worklets --filter mobile
```

### 3. NativeWind Styles Not Applied

**문제**: 앱 실행되지만 Tailwind CSS 스타일이 적용되지 않음 (plain text only)

**원인**: `metro.config.js`에 `withNativeWind` 래퍼 누락

**해결**: NativeWind 래퍼 추가
```javascript
const { withNativeWind } = require('nativewind/metro');
// ... config setup ...
module.exports = withNativeWind(config, { input: './global.css' });
```

## 📁 변경 파일

**수정**:
- `apps/mobile/metro.config.js` - 커스텀 리졸버 + withNativeWind 래퍼
- `apps/mobile/babel.config.js` - unstable_transformProfile 설정
- `apps/mobile/package.json` - react-native-worklets 추가
- `apps/mobile/tsconfig.json` - NativeWind 자동 업데이트 (nativewind-env.d.ts)

## 📊 결과

| 항목 | Before | After |
|------|--------|-------|
| Metro 시작 | ❌ Entry point 에러 | ✅ 정상 |
| Bundle 생성 | ❌ 실패 | ✅ 성공 |
| iOS 시뮬레이터 | ❌ 실행 불가 | ✅ 실행 가능 |
| NativeWind 스타일 | ❌ 미적용 | ✅ 적용됨 |

## 🎓 교훈

1. **pnpm workspace + Expo**: 알려진 호환성 문제, 커스텀 Metro 설정 필요
2. **NativeWind v4**: `withNativeWind` 래퍼가 필수
3. **reanimated 의존성**: worklets 플러그인이 별도로 필요할 수 있음

## 🔜 다음 단계

- [ ] 49개 테스트 항목 검증
- [ ] 웹앱과 모바일앱 UI 차이 평가
- [ ] PWA vs Native 앱 전략 결정
