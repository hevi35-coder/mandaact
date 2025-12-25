# CURRENT_STATUS

**최종 업데이트**: 2025-12-25  
**상태**: iOS 1.1.0 TestFlight 준비 / AI 코칭 Phase 2 구현 진행

## Mobile (iOS)
- **App Store**: v1.0 승인/출시 ✅
- **현재 빌드**: v1.1.0 (build 120) 로컬 빌드 완료 ✅
- **다음 릴리즈**: v1.1.0 TestFlight 제출 및 QA 🔄
- **주의**: TestFlight/App Store 제출 시 `CFBundleVersion`(Expo `expo.ios.buildNumber`)는 항상 증가해야 함.

## 최근 반영된 변경(요약)
- (모바일) AI 코칭 Step 1–7 UI 구현(페르소나~최종 검토)
- (모바일) Plan 모달 + 활성/최소 실천 선택 + 투데이 최소모드 토글
- (백엔드) action_preferences 테이블 추가로 Plan 선택값 서버 동기화
- (모바일) AI 코칭 인프라: 세션 스토어, 리줌 카드, 코칭 플로우 스크린 연결
- (문서) AI 코칭 이행 문서 Phase 2–3 진행 사항 업데이트

## 바로 다음 해야 할 일(Release-Blocking)
- (iOS) v1.1.0 TestFlight 제출 및 실제 기기 테스트(로그인/홈/리포트/광고)
- (모바일) AI 코칭 Phase 2 (Steps 1–3) 구현

## 문서
- 로드맵: `docs/project/ROADMAP.md`
- TestFlight 제출: `docs/development/TESTFLIGHT_SUBMIT_GUIDE.md`
