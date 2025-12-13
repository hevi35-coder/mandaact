# Mobile Build Analysis (통합됨)

이 분석 문서는 `docs/development/MOBILE_BUILD_GUIDE.md`로 통합되었습니다.

- 통합 문서: `docs/development/MOBILE_BUILD_GUIDE.md`
- 인덱스: `docs/README.md`

**실행 내용**:
1. `apps/mobile/package.json` 내 문제가 되는 의존성 버전 강제 하향 조정
   - `expo-splash-screen`: `^31.0.11` -> `~0.29.24`
   - `expo-font`: `^14.0.0` -> `~13.0.4`
   - `expo-localization`: `^17.0.7` -> `~16.0.1`
   - `react-native`: `0.76.9` (patch 버전 일치)
   - 기타 관련 패키지 버전 조정

2. **클린 빌드 수행**:
   - `ios` 폴더 삭제 및 재생성 (`prebuild`)
   - `pod install` 완료
   - `Xcode build` 성공 (0 errors)

### Plan B: 라이브러리 대체 및 최소화 (Plan B Applied)
앱 실행 단계에서 발생하는 런타임 오류들을 수정했습니다.

**실행 내용**:
1. **Sentry 비활성화**: `apps/mobile/src/lib/sentry.ts`를 Mock 구현체로 대체하고 패키지 제거.
2. **Polyfill 추가**: `react-native-url-polyfill`, `react-native-get-random-values` 설치 및 `index.ts`에 Import. (Mono-repo 환경에 맞는 pnpm 설치 명령어 사용)

---

## 3. Plan C: 대안적 접근 (Fallback)
(Plan A 및 Plan B 성공으로 인해 생략)

---

## 4. 요약 및 권장사항

1. **버전 고정**: 향후 `pnpm update` 등을 실행할 때 `package.json`의 버전이 Expo SDK 52 범위를 벗어나지 않도록 주의해야 합니다. 가능하다면 `catalog:` 프로토콜을 적극 활용하십시오.
2. **Sentry 재연동**: 추후 운영 배포 시에는 Sentry 버전을 최신(`^7.x` or `^6.x` working version)으로 맞추고, `pnpm` 호환성을 검증한 뒤 재설치해야 합니다. 현재는 기능 테스트를 위해 비활성화 해두었습니다.
3. **패키지 관리**: 반드시 `pnpm` 명령어를 사용하여 패키지를 설치해야 합니다. (`npm install` 금지)
