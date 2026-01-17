# Setup Guide

Complete guide to set up the MandaAct development environment.

> 문서 인덱스: `docs/README.md`

## Prerequisites

- Node.js 18+
- pnpm (Package Manager)
- Git
- A code editor (VS Code recommended)
- Expo Go app (for mobile testing)

## 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd mandaact

# Install dependencies (using pnpm workspace)
pnpm install
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

### Web App (`apps/web/.env.local`)
1. Copy the example environment file:
```bash
cp .env.example apps/web/.env.local
```

2. Fill in your credentials:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Mobile App (`apps/mobile/.env`)
1. Create `.env` file in `apps/mobile`:
```bash
cp apps/mobile/.env.example apps/mobile/.env
```

2. Fill in credentials (must start with `EXPO_PUBLIC_`):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Edge Functions (Supabase)
Set secrets via CLI:
```bash
npx supabase secrets set GCP_PROJECT_ID=...
npx supabase secrets set GCP_CLIENT_EMAIL=...
npx supabase secrets set GCP_PRIVATE_KEY=...
npx supabase secrets set PERPLEXITY_API_KEY=...
```

## 6. Run Development Server

### Web App
```bash
pnpm dev:web
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Mobile App
```bash
pnpm dev:mobile
```
Scan the QR code with Expo Go (Android) or Camera (iOS).

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

- Read **[DEVELOPMENT.md](./DEVELOPMENT.md)** for coding guidelines
- Check **[SIMULATOR_SETUP_GUIDE.md](./SIMULATOR_SETUP_GUIDE.md)** for simulator/emulator setup
- Check **[BUILD_GUIDE.md](./BUILD_GUIDE.md)** for mobile build instructions
- See **[PRD](../project/PRD_mandaact.md)** for feature specifications
- Review **[UI_GUIDELINES.md](../guidelines/UI_GUIDELINES.md)** for design patterns
