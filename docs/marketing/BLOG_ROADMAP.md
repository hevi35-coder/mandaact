# ✍️ Dev.to Weekly Blog Roadmap & Tracker

> **Objective**: Build authority as an "Indie Hacker" and drive traffic to MandaAct through consistent, high-quality technical content.
> **Frequency**: Weekly (Every Weekend)
> **Author Identity**: Personal (Indie Maker)

## 📅 Schedule & Status

| Week | Target Date | Topic / Title | Status | Link / Note |
| :--- | :--- | :--- | :--- | :--- |
| **Week 1** | 2025-12-21 | **Launch: I built an iOS app that turns Mandalart into GTD Actions** | ✅ **Published** | [View Post](https://dev.to/marcus_jh/i-built-an-ios-app-that-turns-mandalart-9x9-into-gtd-actions-v10-1586) |
| **Week 2** | 2026-01-04 | **Tech Deep Dive: How I built React Native OCR using Google Vision API** | 🟡 **Planned** | Focus on the "Magic Input" feature. Code snippets required. |
| **Week 3** | 2026-01-11 | **Gamification: Why I chose explicit 'Leveling' over subtle nudges** | ⚪ **Idea** | XP System & Badge architecture explanation. |
| **Week 4** | 2026-01-18 | **Retrospective: First Month Metrics (The harsh truth)** | ⚪ **Idea** | "Building in Public" style. Share downloads & retention data. |
| **Week 5** | 2026-01-25 | **Feature: How to implement IAP/Subscriptions in Expo (RevenueCat)** | ⚪ **Idea** | A generic guide for other indie hackers. |

---

## 📝 Content Strategy (Vibe Coding Series)

We create content that appeals to **Developers** and **Makers**. 
Key themes:
1.  **Vibe Coding**: How a non-pro developer uses AI to build real products.
2.  **React Native / Expo**: Practical implementation tips (`ocr`, `iap`, `gamification`).
3.  **Building in Public**: Transparent sharing of success and failure.

## 🛠 Operation Workflow

1.  **Wednesday**: Select topic for the week.
2.  **Thursday**: Request Draft ("이번주 주제는 OCR이야. 초안 써줘.").
    *   Agent updates `docs/marketing/DEVTO_CONTENT_DRAFTS.md`.
3.  **Saturday**: Review & Refine.
4.  **Sunday**: **Auto-Publish** via Script.
    ```bash
    node scripts/publish_to_devto.js
    ```
5.  **Monday**: Share link on Twitter/LinkedIn.
