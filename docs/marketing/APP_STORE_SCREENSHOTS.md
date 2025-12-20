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

## 0.1 2025 트렌드/베스트 프랙티스(가독성 중심)

스크린샷은 “세련됨”보다 먼저 **가독성**이 확보되어야 전환이 나옵니다. 특히 Apple 가이드 상 **첫 1~3장이 검색 결과에 노출**될 수 있으므로, 첫 장부터 “이 앱이 뭔지/왜 필요한지”가 5초 내 전달되어야 합니다.

참고:
- Apple Product Page: https://developer.apple.com/app-store/product-page/
- SplitMetrics(ASO): https://splitmetrics.com/blog/app-store-screenshots/

핵심 원칙:
- **한 장 = 한 메시지**: 각 이미지에서 하나의 메인 베네핏만 강조
- **UI 확대**: 상태바/탭바 등 “핵심이 아닌 영역” 비중을 줄이고, 핵심 콘텐츠를 크롭/확대
- **스토리 구성**: 가치(왜) → 실행(어떻게) → 차별점 → 보상/동기 → 인사이트
- **현지화**: 언어별 카피 길이에 따라 템플릿이 깨지지 않도록 레이아웃/줄바꿈을 템플릿화
- **과한 합성 지양**: 앱 UI 캡처 기반(사람이 기기를 들고 있는 사진 등은 피하기)

---

## 0.2 현재 스크린샷 문제(가독성)

- UI가 상대적으로 작게 보여 “무엇을 하는 앱인지”가 한눈에 안 들어옴
- 일부 raw 스크린샷은 해상도가 낮아, 확대 시 선명도가 떨어질 수 있음(가독성 상한선)

개선 방향(우선순위):
1) **템플릿에서 UI를 더 크게**(여백/타이틀 영역 최적화)
2) **핵심 영역 크롭/줌**(상/하단 바 비중 축소)
3) (권장) App Store 기준 해상도로 raw 재캡처 후 재생성

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
