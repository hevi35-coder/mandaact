# How to Generate App Store Screenshots (v1.1.0)

This guide explains how to use `generate_screenshots.py` to create the official App Store assets for multiple device sizes.

## 1. Prerequisites
- Python 3 installed
- Install Pillow: `pip install Pillow` (or `pip3 install Pillow`)
- Ensure you have the bold font: `apps/mobile/assets/fonts/Pretendard-Bold.otf`

## 2. Prepare Raw Assets
Take screenshots from the iOS Simulator. Name them exactly as follows and place them in the device-specific folders.

### 📁 Folder Structure
- **iPhone (6.7" Mandatory)**: `docs/marketing/assets/raw/iphone/[lang]/`
- **iPad (12.9" Mandatory)**: `docs/marketing/assets/raw/ipad/[lang]/`
*(Replace `[lang]` with `en` or `ko`)*

### 📸 Visual Checklist (Required for High Conversion)
Ensure each screenshot captures the following states:

1. `01_home.png`: **Action & Streak**
   - [ ] Progress bar must be > 80% full (Green/Blue).
   - [ ] Show a "Streak" (fire icon) active (e.g., 3 days).
   - [ ] At least one item marked as completed.

2. `02_modal.png`: **AI Magic Moment**
   - [ ] Type a simple goal (e.g., "Run 5km").
   - [ ] **Critical**: Capture the moment the AI bubble appears showing `[Routine | Weekly]`.

3. `03_report.png`: **Visual Feedback**
   - [ ] Show the "Grade/Score" or "Graph" section of the report.
   - [ ] Ensure the "Generate" button is visible.

4. `04_gamification.png`: **Progress & Badge**
   - [ ] Show a Level (e.g., Lv. 5) with high XP progress.
   - [ ] Show at least one colorful, unlocked badge.

## 3. Run the Script
From the project root:
```bash
python3 docs/marketing/generate_screenshots.py
```

## 4. Output
The final assets with titles, gradients, and rounded corners will be generated in:
- `docs/marketing/assets/final/[device_key]/[lang]/`

Upload these directly to App Store Connect.
