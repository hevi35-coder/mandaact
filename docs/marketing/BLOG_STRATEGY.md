# 🗞️ Global Blog Platform Strategy for MandaAct

> **Goal**: Establish a blogging channel that effectively targets both **Korean** (Domestic) and **Global** (US/English) audiences simultaneously for MandaAct.

---

## 💡 Recommendation: "The Hybrid Strategy"

There is **no single platform** that automagically separates and grows both audiences perfectly.
However, considering MandaAct is a tech/productivity product, **Medium** is the strongest "all-in-one" contender, while a **Custom Blog** is best for long-term SEO.

### Top Recommendation: Medium.com (Publication)
*   **Why**: It is the *only* platform with a massive active user base in both the US (Global Tech/Productivity) and Korea (Devs/PMs/Designers).
*   **Strategy**: Create a **"MandaAct Team" Publication**.
    *   Post in English (Primary).
    *   Post in Korean (Translation).
    *   Use tags: `Productivity`, `Startup`, `GTD` (EN) / `생산성`, `스타트업`, `자기계발` (KR).

---

## ⚖️ Detailed Pros & Cons Comparison

### Option A: Medium (Integration Platform)
**Best for**: fast launch, community building, viral potential.

| Pros (장점) | Cons (단점) |
| :--- | :--- |
| **Instant Traffic**: Millions of users already searching for "Productivity". Your text is exposed to them immediately. | **Domain Authority**: SEO traffic goes to `medium.com`, not your website. |
| **Zero Maintenance**: No coding, no server, no design work. Just write. | **Paywall Friction**: Medium often tries to lock articles behind a paywall (even if you don't want to). |
| **Dual Market**: Active communities in both KR (Dev/Startup) and US (Tech/Self-improvement). | **Limited Customization**: You can't change the design to match your brand perfectly. |

### Option B: Custom Blog (Direct Integration)
**Best for**: long-term brand equity, SEO ownership, full control.

| Pros (장점) | Cons (단점) |
| :--- | :--- |
| **SEO Ownership**: All "backlinks" and traffic boost *your* domain authority (`mandaact.vercel.app`). | **High Effort**: You must code the layout, markdown parser, RSS feed, and SEO tags yourself. |
| **Brand Control**: Complete control over fonts, colors, and layout (100% matches your app). | **"Ghost Town" Risk**: If you don't promote it externally, *nobody* will find it initially. |
| **Conversion**: Easier to embed a "Download App" button directly in the post. | **Maintenance**: You have to fix bugs if the blog breaks. |

### Option C: Developer Platforms (Dev.to / Hashnode)
**Best for**: Free, API-First, Tech Audience.

| Platform | KR Support | API Status | Cost | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Dev.to** | ⭐⭐ (Tech only) | ✅ **Full (Create/Update)** | **Free** | Best for reach |
| **Hashnode** | ⭐ (English mostly) | ✅ **Full (GraphQL)** | **Free** | Best for custom domain |
| **Tistory** | ⭐⭐⭐⭐⭐ (General) | ❌ **Terminated (2024)** | Free | **API Broken (Avoid)** |

#### Why "Dev.to" is the best free alternative:
1.  **Totally Free**: Unlimited posts, no hidden fees.
2.  **Full API**: You can Create AND Update posts programmatically.
3.  **Audience**: Huge community of developers (your target for "Productivity Tools").
4.  **SEO**: Incredible domain authority for tech keywords.

---

## 🚀 Execution Plan (How to do it)

### Option A: The "Medium" Route (Recommended for Speed)
1.  Create a Medium Publication `MandaAct Blog`.
2.  Write the article in **English first** (Targeting Global).
3.  Use ChatGPT to translate/localize to Korean with a friendly tone.
4.  Publish **TWO separate posts**:
    *   Title: *How Ohtani used Mandalart...* (English)
    *   Title: *오타니는 어떻게 만다라트를 썼을까...* (Korean)
5.  Link them to each other at the top ("Read in Korean" / "Read in English").

### Option B: The "Custom Domain" Route (Recommended for Asset Building)
1.  Add a `/blog` section to your `apps/web` (Vite app).
2.  Use MDX files for content.
3.  Benefit: All traffic and "SEO Juice" goes to `mandaact.vercel.app`, not Medium.
4.  Downside: You have to build the UI, RSS feed, and SEO meta tags yourself.

---

## ✍️ Content Strategy (One Source, Multi-Use)

Don't write twice. **Write Once, Distribute Everywhere.**

1.  **Core Content**: Write a high-quality "Deep Dive" article (e.g., "The Psychology of 9x9 Grids").
2.  **Platform 1 (Global)**: Post to Medium (English) -> Share to Reddit / Hacker News.
3.  **Platform 2 (Korea)**: Translate -> Post to **Disquiet** (Maker Log) and **Medium** (Korean).
4.  **Social**: Summarize into a Twitter Thread (EN) and LinkedIn Post (KR).

## ✅ Action Item
*   If you want **speed and community exposure**: Go with **Medium**.
*   If you want **domain authority** and have dev time: Build **Custom Blog**.

Which direction do you prefer?
