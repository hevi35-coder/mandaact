# 📸 App Store Screenshot Plan & Design Proposal

> **Date**: 2025-12-07
> **Goal**: Maximize conversion by visually telling the "Goal to Action" story.
> **Scope**: iPhone (6.5", 5.5"), iPad (12.9"), Android Phone, Android Tablet.
> **Languages**: English (US), Korean (KO).

---


## 0. Preparation: Hiding Ads (Critical)
> **Rule**: DO NOT include ads in App Store screenshots. They distract from the value and look unprofessional.

**How to get simplified screenshots:**
1.  **Use Test Build**: If ads aren't configured/filled in the test build, it's perfect.
2.  **Ad-Free Mode**: Activate "Ad-Free Time" in Settings > Focus Mode before taking screenshots.
3.  **Code Disable (Optional)**: Temporarily comment out `<BannerAd />` in `HomeScreen.tsx` if needed.

---

## 0.1 가독성 문제(현상/원인)

현재 스크린샷이 “작아서 잘 안 보이는” 문제는 템플릿보다 먼저 **raw 캡처 해상도**가 병목일 수 있습니다.
- `raw/en`이 저해상도(예: 537×1024)인 경우 확대 시 흐려져 가독성 개선의 한계가 큼

우선순위:
1) **공식 해상도로 raw 재캡처** (가독성 상한선 확보)
2) 템플릿/레이아웃(타이틀/여백/크롭) 튜닝

가이드: `docs/marketing/SCREENSHOT_CAPTURE_GUIDE.md`

---

## 0.2 2025 베스트 프랙티스(요약)

- 첫 1~3장은 검색 결과에도 노출될 수 있으니 “핵심 가치”가 바로 보이게 구성
- 한 장 = 한 베네핏(메시지를 욕심내지 않기)
- UI는 충분히 크게(복잡한 화면은 데이터/상태를 단순화해서 캡처)

참고:
- Apple Product Page: https://developer.apple.com/app-store/product-page/
- Apple Screenshot specs: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/

---
## 1. Storytelling Strategy (The "User Journey" Flow)

We will use a **5-Step Narrative** that guides the user from their "Big Goal" to "Daily Action" and finally "Achievement".

| # | Theme | Screen Focus | Goal |
|---|---|---|---|
| **1** | **Vision** | **Mandalart Detail (9x9 Grid)** | Hook the user with the core differentiator (the grid). |
| **2** | **Action** | **Today View (Checklist)** | Solve the pain point: "What do I do now?" |
| **3** | **Easy Input** | **Mandalart Create (AI OCR)** | Remove friction barrier. Show "Magic". |
| **4** | **Growth** | **Gamification (XP/Level)** | Show the "Fun" factor. |
| **5** | **Insight** | **Weekly Report (AI Analysis)** | Show the "Smart/Premium" value. |

---

## 2. Copy & Scene Specifications (EN / KR)

### 📱 Screen 1: The Vision (Hero Shot)
*   **Visual (iPhone)**: **Center 3x3 Grid** (Focus on the Core Goal). *Legibility is key on small screens.*
*   **Visual (iPad)**: **Full 9x9 Grid**. *Show off the scale of the plan.*
    *   *Center Text*: "Financial Freedom" (EN) / "경제적 자유" (KR).
*   **English Copy**:
    *   **Title**: Visualize Your Big Dreams
    *   **Subtitle**: Structure goals into a grid
*   **Korean Copy**:
    *   **Title**: 꿈을 현실로 그리는 지도
    *   **Subtitle**: 만다라트로 목표를 시각화하세요

### 📱 Screen 2: The Action (GTD Focus)
*   **Visual**: The 'Today View' screen showing a checklist.
    *   *Items*: "Read 30 mins", "Gym" (EN) / "독서 30분", "헬스장" (KR).
*   **English Copy**:
    *   **Title**: Don't Just Plan. Do.
    *   **Subtitle**: Goals turn into daily to-do lists
*   **Korean Copy**:
    *   **Title**: 계획만 세우지 말고, 실천하세요
    *   **Subtitle**: 목표가 자동으로 '오늘의 할 일'이 됩니다

### 📱 Screen 3: The Magic (AI OCR)
*   **Visual**: Split screen - Handwritten Note (Top) -> Digital App (Bottom).
*   **English Copy**:
    *   **Title**: Snap & Digitize Instantly
    *   **Subtitle**: AI converts handwriting to digital
*   **Korean Copy**:
    *   **Title**: 손글씨도 1초 만에 입력
    *   **Subtitle**: 사진만 찍으면 AI가 자동으로 인식해요

### 📱 Screen 4: The Reward (Gamification)
*   **Visual**: Level-up Modal and XP Streak fire.
*   **English Copy**:
    *   **Title**: Make Growth Addictive
    *   **Subtitle**: Earn XP, badges, and level up
*   **Korean Copy**:
    *   **Title**: 게임처럼 즐기는 자기계발
    *   **Subtitle**: 매일 XP를 모으고 레벨업하세요

### 📱 Screen 5: The Coach (AI Report)
*   **Visual**: 'Reports' screen showing a graph.
*   **English Copy**:
    *   **Title**: Smart Weekly Insights
    *   **Subtitle**: AI analyzes your habit patterns
*   **Korean Copy**:
    *   **Title**: AI가 분석하는 성장 리포트
    *   **Subtitle**: 데이터로 내 루틴을 점검받으세요

---

## 3. Device & Layout Guidelines

### 📱 iPhone (6.5" / 5.5") & Android Phone
*   **Orientation**: Portrait (Vertical).
*   **Layout**: Title at the top (large), Subtitle below it (medium), Device frame bottom-center.
*   **Background**: Continuous panoramic gradient or simple geometric shapes.
> **Note on Capture**: Simulator is preferred, but **Real Device (e.g., iPhone 14 Pro) mirroring** is acceptable. We will resize/frame it to fit App Store requirements (6.7" / 6.9"). Ensure the status bar is clean (use 'Focus Mode' or we will patch it).

### 📟 iPad (12.9") & Android Tablet
*   **Orientation**: Landscape (Horizontal) is often preferred for productivity apps, or Portrait if the app is strictly portrait. *MandaAct is PWA/Mobile-first, but iPad supports split view.*
*   **Recommendation**: Use **Portrait** orientation for iPad screenshots to match the phone experience, but show the **Sidebar** expanded if available, or simply center the device on a larger canvas.
*   **Content**: Show more "Dashboard" like views if possible.

---

## 4. Asset Generation Checklist

Total Images Required: 20 (5 Screens × 2 Devices × 2 Languages)

- [ ] **iPhone - English** (set of 5)
- [ ] **iPhone - Korean** (set of 5)
- [ ] **iPad - English** (set of 5)
- [ ] **iPad - Korean** (set of 5)
