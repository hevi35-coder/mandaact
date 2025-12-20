# CURRENT_STATUS

**최종 업데이트**: 2025-12-20  
**상태**: iOS 1.0 출시(승인) 완료 / 1.0.1 패치 준비 및 스토어 운영 안정화

## Mobile (iOS)
- **App Store**: v1.0 승인/출시 ✅
- **다음 릴리즈**: v1.0.1 패치(테스트/제출 준비) 🔄
- **주의**: TestFlight/App Store 제출 시 `CFBundleVersion`(Expo `expo.ios.buildNumber`)는 항상 증가해야 함.

## 최근 반영된 변경(요약)
- (모바일) 닉네임 변경이 홈/설정에 즉시 반영되지 않는 문제 수정(신규 유저 케이스 포함)
- (모바일) 회원가입 UX 정리: “인증메일 발송” 오해 문구 제거 + 불필요한 confirm email 입력 제거
- (모바일) 구독 플랜 미노출 시 재시도/대체 조회(스토어 상품 목록)로 fallback 강화
- (웹) 랜딩 페이지 모드 전환 + `/terms`, `/privacy` 유지
- (문서) `docs/` 구조 정리 및 `AGENTS.md`/`CLAUDE.md` 최신화

## 바로 다음 해야 할 일(Release-Blocking)
- (iOS) v1.0.1 TestFlight 제출 및 실제 기기 테스트(구독/복원/로그인/닉네임)
- (iOS) App Store Connect 메타데이터 점검(EULA/Privacy/Support URL 등)

## 문서
- 로드맵: `docs/project/ROADMAP.md`
- TestFlight 제출: `docs/development/TESTFLIGHT_SUBMIT_GUIDE.md`
