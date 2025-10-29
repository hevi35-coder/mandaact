# Setup Guide

Complete guide to set up the MandaAct development environment.

## Prerequisites

- Node.js 18+ and npm
- Git
- A code editor (VS Code recommended)

## 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd mandaact

# Install dependencies
npm install
```

## 2. Supabase Setup

### Option A: Use Supabase Cloud (Recommended for MVP)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Go to Project Settings > API
4. Copy your project URL and anon key
5. Go to SQL Editor and run the migration:
   - Copy contents of `supabase/migrations/20251029000001_initial_schema.sql`
   - Paste and execute

### Option B: Run Supabase Locally

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db reset
```

## 3. Google Cloud Platform Setup (for Vision API)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Cloud Vision API:
   - Search for "Cloud Vision API" in the console
   - Click "Enable"
4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Create Service Account
   - Grant "Cloud Vision API User" role
   - Create a JSON key and download it
5. Copy credentials from the JSON file:
   - `client_email`
   - `private_key`
   - `project_id`

## 4. Perplexity API Setup

1. Go to [Perplexity API](https://www.perplexity.ai/settings/api)
2. Sign up or log in
3. Generate an API key
4. Copy the key

## 5. Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Fill in your credentials in `.env.local`:
```bash
# Supabase (from step 2)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Cloud Platform (from step 3)
GCP_PROJECT_ID=your-project-id
GCP_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Perplexity API (from step 4)
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx
```

**Important**:
- Keep `.env.local` private (already in `.gitignore`)
- For `GCP_PRIVATE_KEY`, keep the quotes and `\n` characters

## 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 7. Verify Setup

Test checklist:
- [ ] Dev server runs without errors
- [ ] Can access the app in browser
- [ ] No console errors about missing environment variables
- [ ] (After implementing auth) Can sign up/login
- [ ] (After implementing upload) Can upload images

## Troubleshooting

### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection errors
- Check `.env.local` has correct URL and key
- Verify project is active in Supabase dashboard
- Check network/firewall settings

### TypeScript errors
```bash
# Check types
npm run type-check
```

### Vite build errors
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## Next Steps

- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development guidelines
- Check [API_SPEC.md](./API_SPEC.md) for API documentation
- See the PRD in `claudedocs/PRD_mandaact.md` for feature specifications
