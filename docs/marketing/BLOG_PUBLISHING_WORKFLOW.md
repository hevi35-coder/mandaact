# 🤖 Blog Automation: Operating Process

This document defines the standard workflow for creating and publishing blog content to **Dev.to** using the MandaAct automation system.

## 1. System Overview
*   **Draft File**: [`docs/marketing/DEVTO_CONTENT_DRAFTS.md`](file:///Users/jhsy/mandaact/docs/marketing/DEVTO_CONTENT_DRAFTS.md) (The single source of truth for the *next* post)
*   **Publishing Script**: [`scripts/publish_to_devto.js`](file:///Users/jhsy/mandaact/scripts/publish_to_devto.js) (Node.js script that uploads the draft)
*   **(Optional) Hashnode Script**: `scripts/publish_to_hashnode.js` (GraphQL `publishPost`, requires env vars)
*   **API Key**: Stored in `.env.local`

---

## 2. The Workflow (User <-> Agent)

### Step 1: Request a Draft
**User Command**: "블로그 초안 써줘. 주제는 [주제]이고, [핵심 내용]을 포함해줘."
**Agent Action**:
1.  Accesses `DEVTO_CONTENT_DRAFTS.md`.
2.  Writes a high-quality post in Markdown.
3.  Sets `published: false` (Draft mode).
4.  Updates Frontmatter (Title, Tags, Cover Image).

### Step 2: Review (Optional)
**User Command**: "초안 확인했어. 수정해줘" OR "승인"
**Agent Action**:
1.  Modifies the markdown file based on feedback.

### Step 3: Execute Upload
**User Command**: "드래프트 올려줘" (or "Upload draft")
**Agent Action**:
1.  Runs `node scripts/publish_to_devto.js`.
2.  (Optional) Runs `node scripts/publish_to_hashnode.js` to cross-post to Hashnode.
2.  Verifies the output (Success message + URL).
3.  Provides the **Preview URL** to the user.

### Step 4: Final Publish (User)
**User Action**:
1.  Click the link provided by the Agent.
2.  Check the preview on Dev.to.
3.  Click **[Publish]** button on the website.

---

## 3. Maintenance
*   **Image Assets**: If you need new images, ask the agent to "Generate screenshots" or put them in `apps/web/public/landing/` and reference the URL.
*   **API Key Rotation**: If the key fails, generate a new one at [Dev.to Settings](https://dev.to/settings/extensions) and update `.env.local`.
