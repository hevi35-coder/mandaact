# 모바일 빌드 테스트 계획 (Mobile Build Test Plan)

> **작성일**: 2025-12-05
> **목적**: 스토어 배포 전 모바일 앱의 안정성 및 기능 검증을 위한 체계적인 테스트 계획

---

## 1. 테스트 개요

### 1.1 현재 상태
- **iOS 빌드**: ios 폴더 재생성 후 빌드 성공 (2025-12-05)
- **테스트 기기**: iPhone 17 Pro (시뮬레이터)
- **Expo SDK**: 52.0.0
- **React Native**: 0.76.1
- **NativeWind**: 4.1.23

### 1.2 테스트 목표
- [x] iOS 앱 빌드 및 실행 검증 ✅ (2025-12-05 완료)
- [ ] 핵심 기능 동작 확인
- [ ] 스토어 배포 가능 상태 검증
- [ ] 성능 및 안정성 확인

---

## 2. 사전 점검 체크리스트 (Pre-Test Checklist)

### 2.1 개발 환경 확인
| 항목 | 상태 | 비고 |
|------|------|------|
| Node.js v20.x | ✅ | v20.19.5 |
| pnpm v9.x | ✅ | v9.15.9 |
| Xcode 최신 버전 | ✅ | Xcode 26.1.1 |
| CocoaPods | ✅ | v1.16.2 |
| EAS CLI | ✅ | eas-cli/16.28.0 |

### 2.2 의존성 확인
| 항목 | 상태 | 비고 |
|------|------|------|
| `pnpm install` 완료 | ✅ | |
| `npx expo-doctor` 통과 | ⚠️ | 3개 경고 (버전 불일치, 락파일, Metro config) |
| TypeScript 타입 체크 | ✅ | 오류 수정 완료 |

### 2.3 환경 변수 확인
| 항목 | 상태 | 비고 |
|------|------|------|
| `.env` 파일 존재 | ✅ | |
| `EXPO_PUBLIC_SUPABASE_URL` 설정 | ✅ | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` 설정 | ✅ | |

### 2.4 백엔드 연결 확인
| 항목 | 상태 | 비고 |
|------|------|------|
| Supabase 프로젝트 활성화 | ⏳ | |
| Edge Functions 배포 상태 | ⏳ | |
| RLS 정책 활성화 | ⏳ | |

---

## 3. iOS 빌드 테스트

### 3.1 클린 빌드 절차

```bash
# 1. 캐시 및 빌드 폴더 정리
cd apps/mobile
rm -rf ios node_modules/.cache .expo

# 2. Metro 캐시 클리어
npx expo start --clear
# (Ctrl+C로 종료)

# 3. iOS 빌드 실행
npx expo run:ios --device "iPhone 17 Pro"
```

### 3.2 빌드 결과 기록 (2025-12-05 완료)

| 단계 | 예상 시간 | 실제 시간 | 상태 | 비고 |
|------|-----------|-----------|------|------|
| prebuild (ios 폴더 생성) | 30초 | ~30초 | ✅ | ios 폴더 재생성 완료 |
| pod install | 1-2분 | ~1분 | ✅ | CocoaPods 정상 설치 |
| Xcode 빌드 | 3-5분 | ~4분 | ✅ | 0 errors, 37 warnings |
| 시뮬레이터 설치 | 30초 | ~20초 | ✅ | iPhone 17 Pro |
| 앱 실행 | 10초 | ~10초 | ✅ | Metro Bundler 시작됨 |
| **총 소요 시간** | **5-8분** | **~6분** | ✅ | **빌드 성공** |

**빌드 상세 결과:**
- **빌드 버전**: Expo SDK 52.0.0, React Native 0.76.1
- **타겟 기기**: iPhone 17 Pro (ACFC9A8F-ADF9-4977-8015-C72D931D391B)
- **경고 사항**: 37개 경고 (대부분 deprecated API 및 script phase 관련)
- **Metro Bundler**: 포트 8081에서 실행 중

### 3.3 빌드 실패 시 대안

#### 문제 1: CocoaPods 에러
```bash
# 해결 방법 1: pod 캐시 정리
cd ios && pod deintegrate && pod cache clean --all
cd .. && npx expo run:ios

# 해결 방법 2: 완전 재설치
rm -rf ios
npx expo prebuild --clean
npx expo run:ios
```

#### 문제 2: Metro Bundler 연결 실패
```bash
# 해결 방법 1: 포트 점검
lsof -i :8081 | grep LISTEN | awk '{print $2}' | xargs kill -9

# 해결 방법 2: 호스트 지정
npx expo start --localhost --clear

# 해결 방법 3: CDP Inspector 비활성화 (Request timeout 오류 시)
EXPO_NO_INSPECTOR=1 REACT_NATIVE_PACKAGER_HOSTNAME=localhost npx expo start --localhost --clear

# 해결 방법 4: 올바른 번들 ID 확인 및 실행
# 시뮬레이터에 여러 앱이 설치된 경우 번들 ID 확인
xcrun simctl listapps booted | grep -E "CFBundleIdentifier" | grep -E "mandaact|mobile"
# 올바른 앱 실행
xcrun simctl launch booted com.mandaact.app
```

#### 문제 3: Native Module 오류
```bash
# 해결 방법: node_modules 재설치
rm -rf node_modules ios android
pnpm install
npx expo prebuild --clean
npx expo run:ios
```

#### 문제 4: "property is not writable" 오류
```bash
# 해결 방법: ios 폴더 완전 재생성
rm -rf ios
npx expo run:ios --device "iPhone 17 Pro"
```

---

## 4. 기능 테스트 시나리오

### 4.1 인증 기능
| 테스트 항목 | 예상 결과 | 실제 결과 | 상태 |
|-------------|-----------|-----------|------|
| 앱 시작 화면 로딩 | 스플래시 → 로그인 화면 | | ⏳ |
| 회원가입 | 성공 후 홈 이동 | | ⏳ |
| 로그인 | 성공 후 홈 이동 | | ⏳ |
| 로그아웃 | 로그인 화면 이동 | | ⏳ |
| 자동 로그인 유지 | 앱 재시작 시 로그인 상태 | | ⏳ |

### 4.2 만다라트 기능
| 테스트 항목 | 예상 결과 | 실제 결과 | 상태 |
|-------------|-----------|-----------|------|
| 만다라트 목록 조회 | 기존 데이터 표시 | | ⏳ |
| 새 만다라트 생성 (수동) | 입력 폼 표시 및 저장 | | ⏳ |
| 이미지 OCR | 카메라/갤러리 → 분석 | | ⏳ |
| 텍스트 파싱 | 붙여넣기 → 구조화 | | ⏳ |
| 만다라트 수정 | 변경 사항 저장 | | ⏳ |
| 만다라트 삭제 | 확인 후 삭제 | | ⏳ |

### 4.3 오늘의 실천
| 테스트 항목 | 예상 결과 | 실제 결과 | 상태 |
|-------------|-----------|-----------|------|
| 오늘 할 액션 표시 | 타입별 필터링 표시 | | ⏳ |
| 액션 체크 | XP 획득, 애니메이션 | | ⏳ |
| 체크 취소 | XP 차감 | | ⏳ |
| 진행률 표시 | 실시간 업데이트 | | ⏳ |

### 4.4 게이미피케이션
| 테스트 항목 | 예상 결과 | 실제 결과 | 상태 |
|-------------|-----------|-----------|------|
| XP 획득 | 체크 시 XP 증가 | | ⏳ |
| 레벨업 | 레벨업 알림 표시 | | ⏳ |
| 뱃지 획득 | 조건 충족 시 뱃지 획득 | | ⏳ |
| 스트릭 유지 | 연속 실천일 증가 | | ⏳ |

### 4.5 리포트 기능
| 테스트 항목 | 예상 결과 | 실제 결과 | 상태 |
|-------------|-----------|-----------|------|
| 주간 리포트 조회 | 통계 및 AI 분석 표시 | | ⏳ |
| 목표 진단 | AI 진단 결과 표시 | | ⏳ |

### 4.6 설정 및 기타
| 테스트 항목 | 예상 결과 | 실제 결과 | 상태 |
|-------------|-----------|-----------|------|
| 알림 설정 | 푸시 알림 권한 요청 | | ⏳ |
| 언어 변경 | 한국어/영어 전환 | | ⏳ |
| 프로필 확인 | 사용자 정보 표시 | | ⏳ |

---

## 5. 성능 테스트

### 5.1 로딩 시간
| 항목 | 기준 | 측정값 | 상태 |
|------|------|--------|------|
| 앱 시작 (Cold Start) | < 3초 | | ⏳ |
| 화면 전환 | < 300ms | | ⏳ |
| 데이터 로딩 | < 2초 | | ⏳ |

### 5.2 메모리 사용
| 항목 | 기준 | 측정값 | 상태 |
|------|------|--------|------|
| 초기 메모리 | < 150MB | | ⏳ |
| 활성 사용 시 | < 300MB | | ⏳ |

---

## 6. 테스트 진행 상황

### 6.1 진행 로그

| 날짜 | 시간 | 작업 | 결과 | 비고 |
|------|------|------|------|------|
| 2025-12-05 | 00:15 | iOS 빌드 성공 확인 | ✅ | ios 폴더 재생성 후 성공 |
| 2025-12-05 | 00:30 | 테스트 계획 수립 | ✅ | 본 문서 작성 |
| 2025-12-05 | 01:00 | TypeScript 타입 체크 | ✅ | 9개 오류 수정 완료 |
| 2025-12-05 | 01:30 | iOS 클린 빌드 실행 | ✅ | 0 errors, 37 warnings |
| 2025-12-05 | 01:55 | 앱 시뮬레이터 설치 | ✅ | iPhone 17 Pro 실행 확인 |
| 2025-12-05 | 13:40 | localhost 빌드 재실행 | ✅ | Metro 연결 성공, 13636 모듈 번들링 완료 |
| 2025-12-05 | 14:02 | Metro 연결 트러블슈팅 | ✅ | CDP Inspector 타임아웃 해결 |
| 2025-12-05 | 14:05 | 앱 실행 확인 | ✅ | MandaAct 앱 Metro 연결 성공 |

### 6.2 발견된 이슈

| ID | 심각도 | 설명 | 상태 | 해결 방법 |
|----|--------|------|------|-----------|
| TS-001 | Medium | `trackEvent` 내부 함수 export 문제 | ✅ 해결 | `lib/index.ts`에서 export 제거 |
| TS-002 | High | `runOCRFlowFromUri` 함수 시그니처 불일치 | ✅ 해결 | `user.id` 파라미터 추가 |
| TS-003 | Medium | OCRResult → MandalartData 타입 변환 누락 | ✅ 해결 | title 필드 매핑 추가 |
| TS-004 | Medium | Modal handler 함수 시그니처 불일치 | ✅ 해결 | PreviewStep.tsx 핸들러 수정 |
| TS-005 | Low | StreakCardProps Date 타입 optional 누락 | ✅ 해결 | `?` optional 추가 |
| BUILD-001 | Info | Expo 버전 경고 | ⚠️ 관찰 | expo@52.0.47, react-native@0.76.9 권장 |
| BUILD-002 | Info | Script phase 경고 (37개) | ⚠️ 관찰 | deprecated API 관련, 기능 영향 없음 |
| NET-001 | Medium | Metro 연결 실패 (외부 IP) | ✅ 해결 | `REACT_NATIVE_PACKAGER_HOSTNAME=localhost` 설정 |
| NET-002 | High | Metro "Request timeout" 크래시 | ✅ 해결 | `EXPO_NO_INSPECTOR=1` 환경변수 + 올바른 번들 ID 사용 |
| APP-001 | Medium | 스플래시 화면에서 앱 로딩 지연 | 🔄 조사중 | 번들 다운로드 100% 완료, 앱 초기화 지연 |

---

## 7. 대안 및 폴백 계획

### 7.1 로컬 빌드 실패 시
1. **EAS Cloud Build 사용**
   ```bash
   eas build --profile development --platform ios
   ```
   - 장점: 로컬 환경 문제 회피
   - 단점: 빌드 대기 시간 (10-20분)

2. **Expo Go 사용 (제한적)**
   ```bash
   npx expo start
   ```
   - 장점: 즉시 테스트 가능
   - 단점: 네이티브 모듈 미지원

### 7.2 시뮬레이터 문제 시
1. **실제 기기 테스트**
   - Apple Developer 계정 필요
   - 기기 등록 후 빌드

2. **다른 시뮬레이터 버전 사용**
   ```bash
   xcrun simctl list devices
   npx expo run:ios --device "iPhone 15 Pro"
   ```

### 7.3 네트워크/백엔드 문제 시
1. **Mock 데이터로 테스트**
   - TanStack Query의 mock provider 활용

2. **로컬 Supabase 실행**
   ```bash
   npx supabase start
   ```

---

## 8. 스토어 배포 전 최종 체크리스트

### 8.1 빌드 설정
- [ ] `app.json` 버전 업데이트 (version, buildNumber)
- [ ] 아이콘 및 스플래시 이미지 확인
- [ ] 권한 설명 문구 검토 (한국어)

### 8.2 기능 완성도
- [ ] 모든 핵심 기능 정상 동작
- [ ] 크래시 없음
- [ ] 에러 핸들링 완료

### 8.3 성능
- [ ] 앱 시작 시간 3초 이내
- [ ] 메모리 누수 없음
- [ ] 배터리 과다 소모 없음

### 8.4 보안
- [ ] 민감 정보 하드코딩 없음
- [ ] API 키 환경 변수 처리
- [ ] RLS 정책 검증

---

## 9. 관련 문서

- **[BUILD_GUIDE.md](./BUILD_GUIDE.md)**: 빌드 가이드 상세
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**: 배포 가이드
- **[VERSION_POLICY.md](./VERSION_POLICY.md)**: 버전 정책
- **[ROADMAP.md](../project/ROADMAP.md)**: 프로젝트 로드맵

---

**마지막 업데이트**: 2025-12-05 13:45

---

## 10. 수정된 파일 목록 (TypeScript 오류 수정)

| 파일 | 수정 내용 |
|------|-----------|
| `apps/mobile/src/lib/index.ts` | `trackEvent` export 제거 (내부 함수) |
| `apps/mobile/src/components/MandalartCreate/ImageInputStep.tsx` | `useAuthStore` import 추가, `user.id` 파라미터 전달 |
| `apps/mobile/src/components/MandalartCreate/TextInputStep.tsx` | OCRResult → MandalartData 타입 변환 로직 추가 |
| `apps/mobile/src/components/MandalartCreate/PreviewStep.tsx` | `handleCoreGoalSave`, `handleSubGoalSave` 핸들러 시그니처 수정 |
| `apps/mobile/src/components/Home/types.ts` | `lastCheckDate`, `longestStreakDate` optional 타입 지정 |
