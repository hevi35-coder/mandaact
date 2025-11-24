# MandaAct

AI-powered Mandalart (9x9 goal framework) action tracker with gamification, AI coaching, and comprehensive progress analytics.

## Overview

MandaAct transforms your Mandalart goals into actionable daily habits with a complete productivity ecosystem.

**Platform Availability**:
- 🌐 **Web PWA**: Production-ready progressive web app (Vercel)
- 📱 **React Native Mobile**: In development (Phase 3 - Navigation implementation)
  - Monorepo structure with shared business logic
  - React 18.3.1 + Expo SDK 52 + React Native 0.76.5

### Core Features
- 📸 **Triple Input Methods**: Image upload (OCR), text paste, or manual template entry
- ✅ **Smart Action Tracking**: 3 action types (루틴/미션/참고) with intelligent daily display logic
- 🎮 **Gamification System**: XP points, levels, badges, and streaks for motivation
- 🤖 **AI Coaching**: Personalized coaching via Perplexity API with context-aware responses
- 📊 **Analytics & Reports**: Weekly AI reports, goal diagnostics, and progress insights
- 🔔 **PWA Notifications**: Native push notifications for daily reminders
- 📱 **Progressive Web App**: Installable app with offline support
- 🎓 **Interactive Tutorial**: Step-by-step onboarding for new users

### Key Pages
- **홈 (Home)**: Dashboard with quick stats, recent activity, and action shortcuts
- **오늘의 실천 (Today)**: Daily checklist with type filters and achievement tracking
- **만다라트 관리 (Mandalart List)**: Create, view, and toggle multiple mandalarts
- **만다라트 상세 (Detail)**: 9x9 grid visualization with action management
- **리포트 (Reports)**: AI-generated weekly practice reports and goal diagnostics
- **튜토리얼 (Tutorial)**: Interactive guide for first-time users
- **알림 설정 (Notifications)**: Configure PWA push notification preferences

## Tech Stack

### Frontend
- **React 18** + **TypeScript** - Type-safe component architecture
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** + **shadcn/ui** - Utility-first styling with accessible components
- **TanStack Query** - Server state management and caching
- **Zustand** - Lightweight global state management
- **React Router v6** - Client-side routing
- **Framer Motion** - Smooth animations and transitions
- **date-fns** - Modern date manipulation library
- **React Markdown** - Markdown rendering for AI reports
- **dom-to-image-more** - Image export functionality

### Backend
- **Supabase** - Complete backend solution
  - **PostgreSQL** - Relational database with Row Level Security (RLS)
  - **Authentication** - Email/password auth with session management
  - **Storage** - Mandalart image storage with CDN
  - **Edge Functions (Deno)** - Serverless API endpoints
  - **Realtime** - Live data subscriptions

### AI & External Services
- **Google Cloud Vision API** - OCR for mandalart image recognition
- **Perplexity API** (`sonar` model) - AI coaching chatbot with context awareness

### Deployment & Monitoring
- **Vercel** - Frontend hosting with automatic deployments
- **Supabase Cloud** - Managed backend infrastructure
- **PWA Service Worker** - Offline support and push notifications

## Project Structure

**Monorepo Structure** (as of 2025-11-24):
```
mandaact/
├── apps/
│   ├── web/               # Web PWA (React 18.3.1)
│   │   ├── src/
│   │   │   ├── components/        # Reusable UI components
│   │   │   │   ├── stats/         # Statistics and progress components
│   │   │   │   ├── ui/            # shadcn/ui base components
│   │   │   │   └── ...            # Feature-specific components
│   │   │   ├── pages/             # Page components (9 routes)
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── lib/               # Utilities and helpers
│   │   │   │   ├── actionTypes.ts # Action type logic and display rules
│   │   │   │   ├── xpMultipliers.ts # XP calculation system
│   │   │   │   ├── stats.ts       # Badge and streak calculations
│   │   │   │   └── ...            # Other utilities
│   │   │   ├── store/             # Zustand global state
│   │   │   ├── types/             # TypeScript type definitions
│   │   │   ├── styles/            # Global styles and Tailwind config
│   │   │   └── main.tsx           # App entry point
│   │   ├── public/                # Static assets (icons, manifest, etc.)
│   │   ├── vite.config.ts         # Vite configuration
│   │   └── package.json           # Web app dependencies
│   └── mobile/            # React Native Mobile App (Phase 3 in progress)
│       ├── src/
│       │   ├── lib/
│       │   │   └── supabase-init.ts  # Supabase initialization
│       │   ├── navigation/        # React Navigation (planned)
│       │   └── screens/           # Screen components (planned)
│       ├── App.tsx                # App entry point
│       ├── app.json               # Expo configuration
│       └── package.json           # Mobile app dependencies (React 18.3.1 + Expo SDK 52)
├── packages/
│   └── shared/            # Shared code between web and mobile
│       ├── src/
│       │   ├── lib/
│       │   │   └── supabase.ts    # Supabase client setup
│       │   └── stores/
│       │       └── authStore.ts   # Zustand auth store
│       └── package.json           # React 18.3.1 peerDependency
├── supabase/
│   ├── migrations/        # Database schema migrations (35+ files)
│   └── functions/         # Edge functions
│       ├── ocr-mandalart/ # OCR processing (v4)
│       ├── chat/          # AI coaching (v17)
│       └── chat-v2/       # Experimental version
├── docs/                  # Comprehensive documentation
│   ├── project/           # Roadmap, improvements, PRD
│   ├── development/       # Setup, deployment, API guides
│   ├── guidelines/        # UI/UX patterns (empty state, cards, etc.)
│   ├── features/          # Feature docs (badges, XP, notifications, actions)
│   │   └── REACT_NATIVE_MIGRATION_V2.md  # RN migration plan
│   ├── migration/         # Migration roadmaps
│   ├── troubleshooting/   # Debug guides and solutions
│   └── archive/           # Historical documentation
│       ├── completed/     # Finished work documentation
│       ├── deprecated/    # Outdated documentation
│       └── sessions/      # Development session logs
├── package.json           # Monorepo workspace configuration
└── CLAUDE.md              # AI assistant development guide
```

## Architecture Highlights

### Data Model
The Mandalart 9x9 grid is decomposed into a hierarchical structure:
- **Mandalart** (1) → **SubGoals** (8) → **Actions** (64 total, 8 per sub-goal)
- Database cascade: `mandalarts` → `sub_goals` → `actions` → `check_history`

### Action Type System
Actions are classified into 3 types with AI-powered suggestions:
- **루틴 (Routine)**: Recurring habits (daily/weekly/monthly)
- **미션 (Mission)**: Completion goals (once or periodic)
- **참고 (Reference)**: Reference/mindset items (not checkable)

Smart display logic shows only relevant actions based on frequency, completion status, and date ranges.

### Gamification
- **XP System**: Action-based experience points with level progression
- **Badges**: 50+ achievement badges across 7 categories
- **Streaks**: Daily practice streaks with freeze protection
- **Anti-Cheat**: Rate limiting and validation to prevent gaming the system

### State Management
- **Global State (Zustand)**: Authentication, user preferences
- **Server State (TanStack Query)**: Data fetching and caching
- **Local State (useState)**: Component-specific UI state

## Documentation

### 📘 Essential Guides
- **[Setup Guide](./docs/development/SETUP_GUIDE.md)** - Getting started with development
- **[Development Guide](./docs/development/DEVELOPMENT.md)** - Coding standards and best practices
- **[Deployment Guide](./docs/development/DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[API Spec](./docs/development/API_SPEC.md)** - Backend API documentation
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant development guide

### 📋 Project Management
- **[Roadmap](./docs/project/ROADMAP.md)** - Feature roadmap and timeline
- **[Improvements](./docs/project/IMPROVEMENTS.md)** - Feature improvement tracking (20 items)
- **[PRD](./docs/project/PRD_mandaact.md)** - Product requirements document

### ⚙️ Features
- **[Badge System v5.0](./docs/features/BADGE_SYSTEM_V5_RENEWAL.md)** - Gamification and achievements
- **[XP System Phase 2](./docs/features/XP_SYSTEM_PHASE2_COMPLETE.md)** - Experience points and leveling
- **[Notification System](./docs/features/NOTIFICATION_SYSTEM_PROGRESS.md)** - PWA push notifications
- **[Action Types v2](./docs/features/ACTION_TYPE_IMPROVEMENT_V2.md)** - Routine, mission, reference types

### 🎨 UI/UX Guidelines
- **[Empty State Pattern](./docs/guidelines/EMPTY_STATE_PATTERN.md)** - Consistent empty state design
- **[Card Component Guidelines](./docs/guidelines/CARD_COMPONENT_GUIDELINES.md)** - Card component patterns
- **[Animation Guide](./docs/guidelines/ANIMATION_GUIDE.md)** - Animation best practices
- **[Notification Guidelines](./docs/guidelines/NOTIFICATION_GUIDELINES.md)** - Notification UX patterns
- **[Modal Guidelines](./docs/guidelines/UI_MODAL_GUIDELINES.md)** - Modal dialog patterns

### 🔧 Troubleshooting
- **[Troubleshooting Guide](./docs/troubleshooting/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Signup Debug Guide](./docs/troubleshooting/SIGNUP_DEBUG_GUIDE.md)** - Authentication debugging
- **[Cron Setup Guide](./docs/troubleshooting/CRON_SETUP_GUIDE.md)** - Scheduled tasks configuration

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for backend)
- Google Cloud Platform account (for OCR)
- Perplexity API key (for AI coaching)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/hevi35-coder/mandaact.git
cd mandaact

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API keys:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY (Edge Function secrets)
# - PERPLEXITY_API_KEY (Edge Function secret)

# Run development server
npm run dev
# Access at http://localhost:5173

# Optional: Run Supabase locally
npx supabase start
# Apply migrations
npx supabase db push
```

### Development Commands

```bash
# Monorepo Commands
npm run web              # Start web app dev server
npm run mobile           # Start mobile app (Expo)

# Web App Development
cd apps/web
npm run dev              # Start Vite dev server with HMR
npm run type-check       # TypeScript type checking (no emit)
npm run lint             # ESLint code quality check
npm run build            # Production build
npm run preview          # Preview production build locally

# Mobile App Development (React Native)
cd apps/mobile
npm start                # Start Expo dev server
npm run android          # Run on Android device/emulator
npm run ios              # Run on iOS device/simulator

# Shared Package
cd packages/shared
npm run build            # Build TypeScript to dist/
npm run dev              # Watch mode for development

# Supabase Backend
npx supabase start       # Start local Supabase (Docker required)
npx supabase status      # Check Supabase container status
npx supabase db push     # Push migrations to remote database
npx supabase functions deploy ocr-mandalart  # Deploy OCR function
npx supabase functions deploy chat           # Deploy chat function
npx supabase functions logs chat --tail      # View function logs
npx supabase secrets set KEY=value           # Set Edge Function secrets
```

## Key Features Explained

### 1. Triple Input Methods
Choose from three ways to create your Mandalart:

**A. Image Upload (OCR)**
- Upload a photo of your Mandalart template
- System automatically extracts center goal and 8 sub-goals
- Position-based parsing using Google Cloud Vision API

**B. Text Paste**
- Copy/paste structured text from existing templates
- Automatic parsing of tab-separated or formatted text
- Quick import from spreadsheets or documents

**C. Manual Entry**
- Build your Mandalart from scratch using the interactive grid
- Click cells to add goals and actions one by one
- Full customization and flexibility

**Tech**: Google Cloud Vision API (OCR), custom text parsing, interactive UI

### 2. Action Type Intelligence
Each action is automatically classified using keyword analysis:
- "매일 운동" → Routine (daily frequency)
- "책 1권 완독" → Mission (completion goal)
- "긍정적 마인드" → Reference (mindset reminder)

Users can override AI suggestions and customize display rules.

### 3. Gamification
- **XP Multipliers**: First check bonus, streak bonus, completion multipliers
- **Badge System**: 7 categories (practice, completion, consistency, achievement, special, streak, analysis)
- **Level Progression**: Exponential XP requirements with visual level indicators
- **Streak System**: Daily practice streaks with freeze days for missed days

### 4. AI Coaching
Context-aware chatbot that analyzes:
- Recent mandalart data
- Check history and patterns
- User-specific goals and progress

Provides personalized motivation, suggestions, and accountability.

### 5. Weekly Reports
AI-generated reports analyzing:
- **Practice Report**: Check patterns, trends, and improvement suggestions
- **Goal Diagnosis**: Mandalart structure analysis and SMART goal compliance

## Development

See **[Development Guide](./docs/development/DEVELOPMENT.md)** for:
- Coding standards and conventions
- Component architecture patterns
- State management best practices
- Testing strategies
- Contribution guidelines

### Code Quality Tools
- **TypeScript**: Strict type checking for reliability
- **ESLint**: Code quality and consistency enforcement
- **Prettier** (via ESLint): Automatic code formatting
- **Tailwind CSS**: Utility-first styling with design system

## Deployment

Frontend (Vercel):
1. Connect GitHub repository to Vercel
2. Auto-deploys on push to `main` branch
3. Environment variables configured in Vercel dashboard

Backend (Supabase):
1. Migrations: `npx supabase db push`
2. Edge Functions: `npx supabase functions deploy <name>`
3. Secrets: `npx supabase secrets set KEY=value`

See **[Deployment Guide](./docs/development/DEPLOYMENT_GUIDE.md)** for detailed instructions.

## Contributing

1. Check the **[Improvements](./docs/project/IMPROVEMENTS.md)** list for current priorities
2. Follow the **[Development Guide](./docs/development/DEVELOPMENT.md)** for coding standards
3. Create feature branches: `feature/your-feature-name`
4. Write meaningful commit messages
5. Ensure all type checks and lints pass before committing

## License

MIT

## Links

- **Live App**: [https://mandaact.vercel.app](https://mandaact.vercel.app)
- **GitHub**: [https://github.com/hevi35-coder/mandaact](https://github.com/hevi35-coder/mandaact)
- **Documentation**: See `docs/` directory for comprehensive guides

---

**Built with ❤️ using React, TypeScript, Supabase, and AI**
