# Development Guide

Guidelines and best practices for MandaAct development.

> 문서 인덱스: `docs/README.md`

## Project Structure

```
mandaact/
├── apps/
│   ├── web/               # React + Vite Web App
│   │   ├── src/
│   │   └── ...
│   └── mobile/            # React Native + Expo App
│       ├── src/
│       └── ...
├── packages/
│   └── shared/            # Shared logic (types, constants, utils)
├── supabase/
│   ├── migrations/        # Database migrations (SQL)
│   └── functions/         # Edge functions (serverless)
├── docs/                  # Documentation
└── ...
```

## Code Style

### TypeScript
- Use explicit types for function parameters and return values
- Avoid `any` - use `unknown` or proper types
- Use interfaces for object shapes, types for unions/intersections

```typescript
// Good
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

### React Components
- Use functional components with hooks
- Keep components small and focused (< 200 lines)
- Extract logic into custom hooks when complex
- Use TypeScript for props

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={variant}>
      {label}
    </button>
  );
}
```

### Naming Conventions
- Components: PascalCase (`MandalartGrid.tsx`)
- Hooks: camelCase with `use` prefix (`useMandalart.ts`)
- Utilities: camelCase (`formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Types/Interfaces: PascalCase (`MandalartData`)

## State Management

### Local State
Use `useState` for component-local state:
```typescript
const [isOpen, setIsOpen] = useState(false);
```

### Global State (Zustand)
For app-wide state (user, theme, etc.):
```typescript
// stores/useAuthStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### Server State (TanStack Query)
For API data fetching:
```typescript
import { useQuery } from '@tanstack/react-query';

function useMandalart(id: string) {
  return useQuery({
    queryKey: ['mandalart', id],
    queryFn: () => fetchMandalart(id),
  });
}
```

## API Integration

### Supabase Client
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Type-Safe Queries
```typescript
import { supabase } from '@/lib/supabase';
import type { Mandalart } from '@/types';

export async function getMandalart(id: string): Promise<Mandalart | null> {
  const { data, error } = await supabase
    .from('mandalarts')
    .select('*, sub_goals(*, actions(*))')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
```

## Component Development

### Folder Organization (Web & Mobile)
```
src/
├── components/            # UI Components
│   ├── ui/                # Base UI (shadcn/ui or NativeWind)
│   ├── mandalart/         # Feature components
│   └── ...
├── screens/               # Page/Screen components (Mobile)
├── pages/                 # Page components (Web)
├── hooks/                 # Custom Hooks
├── lib/                   # Utilities
└── ...
```

### Component Template
```typescript
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  // ... other props
}

export function MyComponent({ className }: MyComponentProps) {
  const [state, setState] = useState();

  return (
    <div className={cn('default-classes', className)}>
      {/* component JSX */}
    </div>
  );
}
```

### Testing Strategy

#### Unit Tests (Vitest)
- **Web**: `apps/web/src/**/*.test.tsx`
- **Shared**: `packages/shared/**/*.test.ts`
- Run: `pnpm test`

#### Mobile Tests
- Manual testing on iOS Simulator / Android Emulator
- See **[Testing Guide](../mobile/TESTING_GUIDE.md)** for detailed scenarios.

#### Manual Testing Checklist
- [ ] Mobile responsive (Web)
- [ ] Cross-browser (Chrome, Safari)
- [ ] iOS/Android Simulator check
- [ ] Offline behavior (PWA & Mobile)
- [ ] Error states & Loading states

## Git Workflow

### Branch Naming
- Feature: `feature/mandalart-grid`
- Bugfix: `fix/ocr-accuracy`
- Hotfix: `hotfix/auth-error`

### Commit Messages
Follow conventional commits:
```
feat: add mandalart grid editor
fix: resolve OCR parsing bug
docs: update setup guide
refactor: extract grid logic to hook
```

### PR Process
1. Create feature branch
2. Implement changes
3. Test locally
4. Create PR with description
5. Review and merge

## Performance

### Code Splitting
```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
```

### Image Optimization
- Compress images before upload
- Use WebP format when possible
- Lazy load images below the fold

### Bundle Size
```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer
```

## Debugging

### React DevTools
Install React DevTools browser extension for component inspection.

### Supabase Logs
Check Supabase dashboard > Logs for API errors.

### Network Tab
Use browser DevTools Network tab to debug API calls.

## Environment-Specific Code

```typescript
// Use Vite environment variables
const isDev = import.meta.env.DEV;
const apiUrl = import.meta.env.VITE_API_URL;

if (isDev) {
  console.log('Development mode');
}
```

## Deployment

### Pre-Deployment Checklist
- [ ] Run `pnpm build:web` or `pnpm build:mobile` successfully
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No ESLint errors (`pnpm lint`)
- [ ] Environment variables set (Vercel / EAS Secrets)

### Deploy Web (Vercel)
```bash
vercel --prod
```

### Deploy Mobile (EAS)
See **[Build Guide](./BUILD_GUIDE.md)** for detailed instructions.
```bash
eas build --platform all
```

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
