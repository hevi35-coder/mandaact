# 설정 화면 개선 작업 (TODO)

작성일: 2025-11-29

## 1. 피드백 보내기 기능 개선

### 현재 문제
- `mailto:` 링크가 Expo Go 환경에서 동작하지 않음
- "이메일로 보내기" 버튼을 눌러도 반응 없음

### 대안 옵션
| 옵션 | 장점 | 단점 |
|------|------|------|
| `expo-mail-composer` | Expo 공식 지원, 빌드 후 안정적 | Expo Go에서 제한적 |
| Google Forms | 쉬운 설정, 응답 관리 용이 | 외부 서비스 의존 |
| 카카오톡 오픈채팅 | 한국 사용자 친숙 | 카카오 계정 필요 |
| 앱 내 피드백 폼 | 완전한 제어, Supabase 저장 | 개발 필요 |
| Discord/Slack | 커뮤니티 형성 가능 | 앱 설치 필요 |

### 추천 구현
1. **단기**: Google Forms 링크로 WebBrowser 열기
2. **장기**: 앱 내 피드백 폼 + Supabase 저장

---

## 2. 앱 평가하기 링크 업데이트

### 현재 상태
- iOS: `https://apps.apple.com/app/mandaact/id000000000` (플레이스홀더)
- Android: `https://play.google.com/store/apps/details?id=com.mandaact` (플레이스홀더)

### 필요 작업
- [ ] App Store 등록 후 실제 앱 ID로 교체
- [ ] Play Store 등록 후 실제 패키지명 확인

### 코드 위치
`apps/mobile/src/screens/SettingsScreen.tsx` - `handleRateApp` 함수 (라인 221-236)

---

## 3. 앱 정보 화면 개선

### 현재 내용
- 앱 이름: MandaAct
- 버전: 2.32.18
- 플랫폼: React Native + Expo
- 저작권: © 2025 MandaAct

### 추가 권장 항목
- [ ] 개발자/팀 정보
- [ ] 문의 이메일: support@mandaact.com
- [ ] 공식 웹사이트: https://mandaact.com
- [ ] 오픈소스 라이선스 (사용된 주요 라이브러리)
- [ ] 업데이트 내역 / 변경 로그

### 구현 방안
1. **간단**: Alert 모달 내용 확장
2. **권장**: 별도 "앱 정보" 화면으로 분리 (스크롤 가능)

---

## 4. 개인정보처리방침 대응

### 현재 상태
- 링크: `https://mandaact.com/privacy` (존재하지 않음)

### 필수 포함 내용
1. **수집하는 개인정보 항목**
   - 이메일 주소 (회원가입)
   - 닉네임 (선택)
   - 기기 정보 (푸시 알림용)

2. **수집 목적**
   - 회원 식별 및 서비스 제공
   - 목표 달성 현황 저장 및 분석
   - 푸시 알림 발송

3. **보관 기간**
   - 회원 탈퇴 시까지
   - 또는 법령에 따른 보관 기간

4. **제3자 제공**
   - Supabase (데이터베이스)
   - Google Cloud Vision API (이미지 OCR)
   - Perplexity API (AI 리포트)
   - Expo (푸시 알림)

5. **사용자 권리**
   - 개인정보 열람, 수정, 삭제 요청
   - 계정 삭제 요청

### 구현 방안
| 옵션 | 장점 | 단점 |
|------|------|------|
| Notion 페이지 | 빠른 작성, 쉬운 수정 | 외부 서비스 의존 |
| GitHub Pages | 무료, 버전 관리 | 설정 필요 |
| Vercel 호스팅 | 기존 인프라 활용 | 웹앱과 함께 배포 |
| 앱 내 WebView | 외부 의존 없음 | 업데이트 시 앱 배포 필요 |

### 추천
1. **단기**: Notion 공개 페이지로 빠르게 작성
2. **장기**: mandaact.com/privacy 경로에 정적 페이지 배포

---

## 우선순위

| 순위 | 항목 | 긴급도 | 이유 |
|------|------|--------|------|
| 1 | 개인정보처리방침 | 높음 | 스토어 심사 필수 |
| 2 | 피드백 보내기 | 중간 | 사용자 소통 채널 |
| 3 | 앱 평가하기 | 낮음 | 스토어 등록 후 |
| 4 | 앱 정보 | 낮음 | UX 개선 |

---

## 관련 파일
- `apps/mobile/src/screens/SettingsScreen.tsx`
- `apps/web/src/pages/privacy.tsx` (생성 필요)
