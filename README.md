# MandaAct

AI-powered Mandalart (9x9 goal framework) action tracker with personalized coaching.

## Overview

MandaAct helps users transform their Mandalart goals into daily actionable habits with:
- 📸 Dual input methods: Image upload (OCR) or manual template
- ✅ Daily action tracking with progress visualization
- 🤖 AI coaching chatbot for motivation and guidance
- 📊 Insights dashboard with completion analytics

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- TanStack Query (data fetching)
- Zustand (state management)
- React Router v6

### Backend
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Supabase Edge Functions (Deno)

### AI Services
- Google Cloud Vision API (OCR)
- Perplexity API (Coaching chatbot)

### Deployment
- Vercel (Frontend + PWA)
- Supabase (Backend)

## Project Structure

```
mandaact/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and helpers
│   ├── types/            # TypeScript type definitions
│   ├── styles/           # Global styles
│   └── main.tsx          # App entry point
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
├── public/               # Static assets
├── docs/                 # Documentation (organized by category)
│   ├── project/          # Project roadmap, improvements, PRD
│   ├── development/      # Setup, deployment, API guides
│   ├── guidelines/       # UI/UX patterns and best practices
│   ├── features/         # Feature-specific documentation
│   ├── troubleshooting/  # Debug guides and solutions
│   └── archive/          # Completed work and historical docs
└── claudedocs/           # Claude analysis documents
```

## Documentation

### 📘 Essential Guides
- **[Setup Guide](./docs/development/SETUP_GUIDE.md)** - Getting started with development
- **[Development Guide](./docs/development/DEVELOPMENT.md)** - Coding standards and best practices
- **[Deployment Guide](./docs/development/DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code AI assistant guide

### 📋 Project Management
- **[Roadmap](./docs/project/ROADMAP.md)** - Feature roadmap and timeline
- **[Improvements](./docs/project/IMPROVEMENTS.md)** - Feature improvement tracking
- **[PRD](./docs/project/PRD_mandaact.md)** - Product requirements document

### ⚙️ Features
- **[Badge System v5.0](./docs/features/BADGE_SYSTEM_V5_RENEWAL.md)** - Gamification and achievements
- **[XP System](./docs/features/XP_SYSTEM_PHASE2_COMPLETE.md)** - Experience points and leveling
- **[Notification System](./docs/features/NOTIFICATION_SYSTEM_PROGRESS.md)** - PWA push notifications
- **[Action Types](./docs/features/ACTION_TYPE_IMPROVEMENT_V2.md)** - Routine, mission, reference types

### 🔧 Troubleshooting
- **[Troubleshooting Guide](./docs/troubleshooting/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Signup Debug](./docs/troubleshooting/SIGNUP_DEBUG_GUIDE.md)** - Authentication debugging
- **[Cron Setup](./docs/troubleshooting/CRON_SETUP_GUIDE.md)** - Scheduled tasks configuration

## Getting Started

See **[Setup Guide](./docs/development/SETUP_GUIDE.md)** for detailed setup instructions.

### Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Run Supabase locally (optional)
npx supabase start
```

## Development

See **[Development Guide](./docs/development/DEVELOPMENT.md)** for coding standards, architecture patterns, and contribution guidelines.

## License

MIT
