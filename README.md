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
├── claudedocs/           # Project documentation (PRD, etc.)
└── docs/                 # Developer documentation
```

## Getting Started

See [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for detailed setup instructions.

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

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for development guidelines.

## License

MIT
