# Screenshot Mode & Value Manipulation Guide

이 문서는 고품질 앱스토어 마케팅 에셋을 촬영하기 위해 구현된 **스크린샷 모드(Screenshot Mode)**와 **시뮬레이터 상태바 조작** 방법을 다룹니다.

---

## 1. 스크린샷 모드 활성화 (값 조작)

앱 내부의 스트릭(Streak), 레벨(Level), 경험치(XP) 등의 수치를 마케팅에 적합한 "성공적인 계정" 상태로 즉시 변경할 수 있습니다.

### 설정 방법
1. `apps/mobile/src/lib/config.ts` 파일을 엽니다.
2. `IS_SCREENSHOT_MODE` 변수를 `true`로 변경합니다.
3. 앱이 리로드되면 아래의 가짜 데이터가 적용됩니다.

### 커스텀 필드 수정
`SCREENSHOT_DATA` 객체 내부의 값을 원하는 대로 수정하여 스크린샷에 반영할 수 있습니다.

```typescript
// apps/mobile/src/lib/config.ts
export const SCREENSHOT_DATA = {
    currentStreak: 127,      // 현재 스트릭 (예: 127일)
    longestStreak: 152,      // 최고 기록
    level: 15,               // 레벨
    xpProgress: 0.85,        // 레벨업 게이지 (0.0 ~ 1.0)
    nickname: 'ASO_Expert',  // 닉네임
    lastCheckDate: new Date().toISOString(),
};
```

---

## 2. 시뮬레이터 상태바 청소 (Clean Status Bar)

애플의 공식 스크린샷처럼 시간을 **9:41**로 고정하고, 배터리를 100%로 설정하며, 통신사 로고 등을 깔끔하게 정리하는 명령입니다.

### 실행 방법 (터미널)
시뮬레이터가 실행 중인 상태에서 터미널에 다음 명령어를 복사하여 입력하세요.

```bash
# 상태바를 9:41 시간과 100% 배터리로 고정
xcrun simctl status_bar booted override \
  --time "9:41" \
  --batteryState charged \
  --batteryLevel 100 \
  --dataNetwork wifi \
  --wifiMode active \
  --wifiBars 3
```

### 원래대로 복구하기
촬영이 끝난 후 아래 명령어를 입력하면 현재 시간으로 돌아옵니다.
```bash
xcrun simctl status_bar booted clear
```

---

## 3. 애플 심사 위원용 로그인 (Backdoor) 관리

심사 제출 시 입력한 `review@mandaact.com` 계정이 실제로 작동하도록 설정하는 방법입니다.

### Supabase 설정
1. [Supabase Dashboard](https://supabase.com/dashboard)에 접속합니다.
2. **Authentication > Users** 메뉴로 이동합니다.
3. **Add User > Create new user**를 클릭합니다.
4. 아래 정보를 입력하여 계정을 생성합니다.
   - Email: `review@mandaact.com`
   - Password: `Review2025!`
5. **Auto-confirm User**를 체크하거나, 생성 후 이메일 인증을 수동으로 'Confirmed' 처리합니다.

### 앱 심사 정보 (App Store Review Notes) 통합 정리
심사 제출 시 **[앱 심사 정보 > 메모]** 칸에 아래 내용을 그대로 복사해서 넣으시면 됩니다. 기존의 테스트 시나리오와 비밀 로그인 방법을 하나로 합쳐 심사 위원이 길을 잃지 않게 최적화했습니다.

---

**MandaAct is a goal-tracking app that uses the Mandalart (9x9 grid) methodology to help users turn their big visions into actionable daily habits.**

**[How to Login for Review]**
Since the app primarily uses social logins, we have provided a hidden entry point for the review credentials:
1. Open the app to the initial Login screen.
2. **Tap the "MandaAct" branding logo** at the top of the screen exactly **10 times consecutively**.
3. A "Reviewer Mode" alert will appear, and a hidden **"Reviewer Login"** button will be revealed at the bottom.
4. Tap the button to sign in using the provided credentials (review@mandaact.com).

**[Test Instructions]**
1. Log in using the hidden reviewer backdoor described above.
2. Create a new Mandalart either by using **"Manual Input"** or by generating one via **"AI Suggestions"** for a chosen goal.
3. Track daily habits and check off actions in the **"Today"** tab.
4. View progress insights and comprehensive AI coaching reports in the **"Reports"** tab.

**[Notes]**
- AI capabilities: Features like coaching and goal suggestions require an active internet connection.
- Premium features: Can be tested and verified using an Apple Sandbox tester account.

**Please contact support@unwrittenbd.com if you have any questions or require further assistance during the review process.**

---

---

## 4. 최종 체크리스트
- [ ] `IS_SCREENSHOT_MODE`가 `true`인가?
- [ ] 시뮬레이터 시간이 `9:41`인가?
- [ ] 다크 모드/라이트 모드가 의도한 대로 설정되었는가?
- [ ] **중요**: 촬영 완료 후 `IS_SCREENSHOT_MODE`를 다시 `false`로 돌려놓았는가?
