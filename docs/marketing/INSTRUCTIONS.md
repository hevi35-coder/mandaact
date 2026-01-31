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
- `01_home.png`: Home screen showing "Today" view with progress.
- `02_modal.png`: Action Input Modal showing AI suggestions (Routine/Weekly).
- `03_report.png`: Report screen showing the "First Report Free" button.
- `04_gamification.png`: Profile or Badge screen showing levels/badges.

### 🇰🇷 Korean
Folder: `docs/marketing/assets/raw/ko/`
- `01_home.png`: "오늘의 실천" 화면.
- `02_modal.png`: AI 추천(루틴/매일 등)이 떠있는 입력 모달 화면.
- `03_report.png`: "리포트 생성(무료)" 버튼이 보이는 화면.
- `04_gamification.png`: 배지 또는 레벨 화면.

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
