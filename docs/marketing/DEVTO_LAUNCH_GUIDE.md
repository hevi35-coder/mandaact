# 👩‍💻 Dev.to Blog Launch & API Guide

**Dev.to** is a community of software developers. It matches MandaAct's target audience (Productivity/Tech) perfectly and offers a **free, powerful API**.

## 1. Account Setup
1.  Go to [dev.to](https://dev.to) and create an organization account (e.g., "MandaAct").
2.  **Profile**:
    *   **Name**: MandaAct Team
    *   **Bio**: Turning 9x9 Mandalart goals into daily GTD actions. ⚡️
    *   **Website**: `https://mandaact.vercel.app`

## 2. Get Your API Key
To use the API for publishing/updating:
1.  Go to **Settings** -> **Extensions**.
2.  Scroll to **"DEV Community API Keys"**.
3.  Enter a description (e.g., "MandaAct Auto-Publisher") and click **Generate API Key**.
4.  **Copy this key**. (You will need it for the script).

---

## 3. How to Auto-Publish (The Script)
I have prepared a script at `scripts/publish_to_devto.js`.

### Usage
```bash
# 1. Set your key
export DEVTO_API_KEY="your_api_key_here"

# 2. Run the script (Publishes the file 'docs/marketing/DEVTO_CONTENT_DRAFTS.md')
node scripts/publish_to_devto.js
```

### Features of the Script
*   **Publish**: Reads your Markdown file and uploads it.
*   **Update**: If you provide an `article_id`, it updates the existing post instead of creating a new one.
*   **Frontmatter**: Automatically handles tags and titles.

---

## 4. Content Strategy for Dev.to
Dev.to users hate "marketing fluff". They love "technical/problem-solving" stories.
*   **Good Title**: *How I built an AI OCR for 9x9 Grids using React Native*
*   **Bad Title**: *MandaAct is the best app ever!*

👉 **Next Step**: Check `DEVTO_CONTENT_DRAFTS.md` for your first post.
