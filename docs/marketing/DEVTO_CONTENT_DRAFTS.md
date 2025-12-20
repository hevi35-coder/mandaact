---
title: I built an iOS app that turns Mandalart (9x9) into GTD Actions
published: false
description: Turning Ohtani Shohei's famous goal-setting method into a digital action plan using React Native + OCR.
tags: productivity, reactnative, showdev, indiehackers
cover_image: https://mandaact.vercel.app/landing/en/01_vision.png
canonical_url: https://mandaact.vercel.app
---

# The Problem with 9x9 Grids

You know the **Mandalart**? It's the famous 9x9 grid method used by Ohtani Shohei.
It's amazing for **visualization**. You write your core goal in the center, and 64 sub-actions around it.

But there's a problem. **It stays on the paper.**
I realized that while Mandalart is great for *planning*, it sucks for *execution*. 
You can't carry a huge A3 paper everywhere. And looking at 81 boxes every morning is overwhelming.

# The Solution: "MandaAct"

So I decided to build an app that bridges the gap between **Mandalart (Planning)** and **GTD (Execution)**.

## Key Algo

1.  **Digitization (The Pain Point)**: Typing 81 boxes is painful. So I built an **OCR scanner**.
    *   You take a photo of your handwritten grid.
    *   The app detects the 3x3 structure using Open CV / AI.
    *   It converts it into digital blocks instantly.
2.  **The "Focus" Filter**:
    *   Instead of showing 81 things, the app asks: *"What is the ONE thing you can do today?"*
    *   It filters the grid and presents a simple To-Do list.

# Tech Stack

*   **Frontend**: React Native (Expo)
*   **Backend**: Supabase
*   **AI**: Google Vision API (for OCR)

# Try it out

I just launched it on the App Store. I'd love to get feedback from fellow devs on the UX.
Is the OCR fast enough? Is the "Daily View" intuitive?

👉 [Download on App Store](https://apps.apple.com/mx/app/mandaact-turn-goal-into-action/id6756198473)
👉 [Web Landing Page](https://mandaact.vercel.app)
