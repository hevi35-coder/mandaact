# How to Generate App Store Screenshots (v1.1.0)

This guide explains how to use `generate_screenshots.py` to create the official App Store assets.

## 1. Prerequisites
- Python 3 installed
- Install Pillow: `pip install Pillow` (or `pip3 install Pillow`)
- Ensure you have the bold font: `apps/mobile/assets/fonts/Pretendard-Bold.otf`

## 2. Prepare Raw Assets
Take screenshots from the iOS Simulator (iPhone 16 Pro Max / iPad Pro 12.9").
Name them exactly as follows and place them in the correct folders:

### 🇺🇸 English
Folder: `docs/marketing/assets/raw/en/`
- `01_home.png`: **Action & Streak**
  - [ ] Progress bar must be > 80% full (Green/Blue).
  - [ ] Show a "Streak" (fire icon) active (e.g., 3 days).
  - [ ] At least one chip/section marked as completed.
- `02_modal.png`: **AI Magic Moment**
  - [ ] Type a simple goal (e.g., "Run 5km").
  - [ ] **Critical**: Capture the moment the AI bubble appears showing `[Routine | Weekly]`.
- `03_report.png`: **Visual Feedback**
  - [ ] Show the "Score" or "Graph" section of the report.
  - [ ] Ensure the "Generate" button is visible.
- `04_gamification.png`: **Progress & Badge**
  - [ ] Show a Level (e.g., Lv. 5) with high XP progress.
  - [ ] Show at least one colorful, unlocked badge.

### 🇰🇷 Korean
Folder: `docs/marketing/assets/raw/ko/`
- `01_home.png`: **성취감 강조**
  - [ ] 진행률 80% 이상, 스트릭(불꽃) 활성화 상태.
  - [ ] "오늘의 실천" 체크가 된 상태.
- `02_modal.png`: **AI 자동 완성**
  - [ ] "매일 스쿼트" 입력 중.
  - [ ] **필수**: AI 말풍선이 `[Routine | 매일]`을 제안하는 순간 포착.
- `03_report.png`: **전문성 강조**
  - [ ] 주간 리포트의 그래프/점수 화면.
- `04_gamification.png`: **레벨업/배지**
  - [ ] 레벨 5 이상, 배지 획득 화면.

## 3. Run the Script
From the project root:
```bash
python3 docs/marketing/generate_screenshots.py
```

## 4. Output
The final assets with titles, gradients, and rounded corners will be generated in:
- `docs/marketing/assets/final/en/`
- `docs/marketing/assets/final/ko/`

Upload these directly to App Store Connect.
