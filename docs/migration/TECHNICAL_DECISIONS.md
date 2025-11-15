# MandaAct React Native Migration: Technical Decisions Document

**Date**: 2025-11-15
**Version**: 1.0
**Status**: Decision Phase

---

## Executive Summary

This document outlines critical technical decisions for the MandaAct React Native migration, providing detailed comparisons, recommendations, and rationale for each choice point.

---

## 1. Framework Selection

### Decision: Expo Managed Workflow

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Expo Managed** | • Zero native setup required<br>• Cloud builds (EAS)<br>• OTA updates<br>• Faster development (75%)<br>• New Architecture by default<br>• Unified development experience | • Some native modules limited<br>• Larger app size (+5-10MB)<br>• Less control over native code | **9/10** |
| **Expo Bare** | • More native control<br>• Can add any native module<br>• Still use Expo SDK<br>• EAS Build support | • Requires native setup<br>• More complex maintenance<br>• Loses some Expo benefits | **7/10** |
| **React Native CLI** | • Full control<br>• Smallest app size<br>• Direct native access<br>• No framework limitations | • Complex setup<br>• Slower development<br>• Manual configuration<br>• No OTA updates | **5/10** |

**Recommendation**: Start with Expo Managed, can eject to Bare if needed

**Rationale**:
- MandaAct doesn't require complex native modules
- OCR is handled server-side (Edge Functions)
- EAS Build eliminates need for Mac for iOS development
- OTA updates critical for rapid bug fixes
- 2025 best practices strongly favor Expo

---

## 2. State Management Architecture

### Decision: Keep Zustand + Add TanStack Query

| Option | Migration Effort | Performance | Developer Experience | Score |
|--------|-----------------|-------------|---------------------|-------|
| **Keep Zustand** | None | Excellent | Familiar to team | **10/10** |
| **Redux Toolkit** | High | Good | More boilerplate | **6/10** |
| **MobX** | High | Excellent | Different paradigm | **5/10** |
| **Jotai** | Medium | Excellent | Less mature | **7/10** |

**Implementation Strategy**:
```typescript
// Shared state structure
interface AppState {
  auth: AuthState      // Zustand
  ui: UIState          // Zustand
  serverData: {        // TanStack Query
    mandalarts: QueryResult
    actions: QueryResult
    stats: QueryResult
  }
}
```

---

## 3. Navigation Architecture

### Decision: React Navigation v6

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **React Navigation v6** | • Industry standard<br>• Excellent docs<br>• TypeScript support<br>• Flexible architecture<br>• Large community | • Learning curve from React Router<br>• More configuration | **9/10** |
| **Expo Router** | • File-based routing<br>• Similar to Next.js<br>• Auto typing<br>• Less boilerplate | • Less mature<br>• Fewer examples<br>• Breaking changes likely | **6/10** |

**Navigation Structure**:
```typescript
Root Navigator
├── Auth Stack (not authenticated)
│   ├── Landing
│   ├── Login
│   └── Signup
└── Main Stack (authenticated)
    ├── Tab Navigator
    │   ├── Home
    │   ├── Today
    │   ├── Mandalart (Stack)
    │   ├── Stats
    │   └── Settings
    └── Modal Stack
        ├── MandalartCreate
        ├── ReportView
        └── Tutorial
```

---

## 4. UI Component Strategy

### Decision: NativeWind + Custom Components

| Approach | Development Speed | Maintenance | Performance | Score |
|----------|------------------|-------------|------------|-------|
| **NativeWind + Custom** | Fast | Moderate | Excellent | **8/10** |
| **Tamagui** | Moderate | Good | Excellent | **7/10** |
| **React Native Elements** | Fast | Easy | Good | **6/10** |
| **Gluestack UI** | Moderate | Good | Good | **6/10** |
| **Pure Custom** | Slow | High | Excellent | **5/10** |

**Component Migration Plan**:
1. Create base UI components (Button, Input, Card)
2. Use NativeWind for styling (Tailwind syntax)
3. Build complex components on top
4. Share types with web project

---

## 5. Animation Framework

### Decision: React Native Reanimated 3

| Option | Performance | Learning Curve | Features | Score |
|--------|------------|---------------|----------|-------|
| **Reanimated 3** | Native (60 FPS) | Medium | Complete | **9/10** |
| **React Native Animated** | Good | Low | Basic | **6/10** |
| **Lottie** | Good | Low | Limited to animations | **7/10** |
| **Moti** | Good | Low | Framer Motion-like | **7/10** |

**Key Animations to Implement**:
- Badge unlock celebration
- XP gain animation
- Check/uncheck transitions
- Screen transitions
- Pull-to-refresh
- Loading states

---

## 6. Image Handling & OCR

### Decision: Server-Side OCR + Client Optimization

| Approach | Pros | Cons | Score |
|----------|------|------|-------|
| **Server-Side Only** | • Secure API keys<br>• Consistent processing<br>• No client complexity<br>• Lower memory usage | • Network dependency<br>• Potential latency | **9/10** |
| **Client ML Kit** | • Offline capability<br>• Faster response<br>• No server costs | • API key exposure risk<br>• Platform differences<br>• Larger app size | **5/10** |
| **Hybrid** | • Best of both<br>• Fallback options | • Complex implementation<br>• Maintenance overhead | **7/10** |

**Implementation**:
```typescript
const processMandalartImage = async (imageUri: string) => {
  // 1. Resize image client-side (expo-image-manipulator)
  const resized = await resizeImage(imageUri, { width: 1024 })

  // 2. Upload to Supabase Storage
  const url = await uploadToStorage(resized)

  // 3. Call Edge Function for OCR
  const result = await callOCRFunction(url)

  return result
}
```

---

## 7. Push Notifications

### Decision: Expo Push Notifications (Initial) → Native (Later)

| Phase | Solution | Complexity | Features | Timeline |
|-------|----------|------------|----------|----------|
| **Phase 1** | Expo Push Service | Low | Basic push, easy setup | Week 1-8 |
| **Phase 2** | FCM + APNs Direct | High | Advanced features, analytics | Month 3+ |

**Notification Types**:
- Daily practice reminders
- Achievement unlocked
- Weekly report ready
- Streak at risk
- Monthly challenge start

---

## 8. Data Persistence & Offline

### Decision: AsyncStorage + TanStack Query Persistence

| Option | Complexity | Performance | Features | Score |
|--------|------------|-------------|----------|-------|
| **AsyncStorage + Query** | Low | Good | Basic offline | **8/10** |
| **WatermelonDB** | High | Excellent | Full offline DB | **6/10** |
| **Realm** | Medium | Excellent | Sync capable | **7/10** |
| **SQLite** | Medium | Good | SQL queries | **6/10** |

**Caching Strategy**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5,    // 5 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Persist queries
persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
})
```

---

## 9. Testing Strategy

### Decision: Jest + React Native Testing Library + Detox

| Layer | Tool | Coverage Target | Priority |
|-------|------|----------------|----------|
| **Unit** | Jest | 80% | High |
| **Component** | RNTL | 60% | Medium |
| **Integration** | Jest + MSW | 70% | High |
| **E2E** | Detox | Critical paths | Medium |

**Test Priorities**:
1. Business logic (actionTypes, XP, badges)
2. API integration
3. Critical user flows
4. UI components
5. Edge cases

---

## 10. Performance Optimization

### Decision: Progressive Enhancement

| Optimization | Impact | Effort | Priority |
|--------------|--------|--------|----------|
| **Image lazy loading** | High | Low | Week 1 |
| **List virtualization** | High | Low | Week 1 |
| **Code splitting** | Medium | Medium | Week 4 |
| **Hermes engine** | High | Low | Week 1 |
| **ProGuard/R8** | Medium | Low | Week 8 |
| **Bundle optimization** | Medium | Medium | Week 6 |

**Performance Targets**:
- Cold start: < 2 seconds
- Warm start: < 500ms
- List scroll: 60 FPS
- Memory: < 200MB
- JS bundle: < 5MB

---

## 11. Build & Deployment

### Decision: EAS Build + EAS Submit

| Aspect | Solution | Alternative | Decision |
|--------|----------|-------------|----------|
| **Build** | EAS Build | Local/Fastlane | EAS |
| **CI/CD** | GitHub Actions + EAS | CircleCI | GitHub + EAS |
| **Distribution** | EAS + Stores | CodePush | EAS + Stores |
| **Monitoring** | Sentry | Bugsnag | Sentry |
| **Analytics** | PostHog | Firebase | PostHog |

**Build Configuration**:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

---

## 12. Security Considerations

### API Key Management

| Key Type | Storage Location | Access Method |
|----------|-----------------|---------------|
| **Supabase Anon** | Environment variable | Expo SecureStore |
| **Perplexity API** | Edge Function only | Never in client |
| **Google Vision** | Edge Function only | Never in client |
| **Push tokens** | Supabase DB | Server-side only |

### Data Protection
```typescript
// Secure storage for sensitive data
import * as SecureStore from 'expo-secure-store';

const storeSecurely = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value);
}

const getSecurely = async (key: string) => {
  return await SecureStore.getItemAsync(key);
}
```

---

## 13. Monorepo vs Separate Repository

### Decision: Separate Repository (Initially)

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Separate Repo** | • Simple setup<br>• Independent deployment<br>• Clear separation<br>• Easier CI/CD | • Code duplication<br>• Type sync challenges | **8/10** |
| **Monorepo** | • Code sharing<br>• Single source of truth<br>• Shared types/utils | • Complex setup<br>• Build complexity<br>• Larger repo | **6/10** |

**Future Migration Path**:
1. Start with separate repo
2. Extract shared code to npm package
3. Consider monorepo after 6 months if needed

---

## 14. Code Sharing Strategy

### Shared Code Packages

```typescript
// @mandaact/shared package structure
shared/
├── types/           // TypeScript interfaces
│   ├── models.ts    // Data models
│   ├── api.ts       // API types
│   └── index.ts
├── utils/           // Pure functions
│   ├── dates.ts     // Date utilities
│   ├── xp.ts        // XP calculations
│   └── validation.ts
├── constants/       // Shared constants
└── package.json
```

---

## 15. Platform-Specific Decisions

### iOS Specific

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Minimum iOS** | iOS 15.0 | 95% device coverage |
| **iPad Support** | No (initially) | Focus on iPhone |
| **App Clips** | No | Not needed for MVP |
| **Widgets** | Future consideration | Phase 2 feature |

### Android Specific

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Minimum SDK** | API 26 (Android 8) | 90% device coverage |
| **Tablet Support** | Responsive design | Works by default |
| **App Bundles** | Yes (AAB) | Required by Play Store |
| **Instant Apps** | No | Not needed |

---

## Decision Review Checklist

### Before Implementation
- [ ] Team alignment on all decisions
- [ ] Budget approval for tools/services
- [ ] Risk mitigation plans in place
- [ ] Fallback options identified
- [ ] Timeline realistic with buffers

### During Implementation
- [ ] Weekly decision review
- [ ] Adjustment based on findings
- [ ] Document decision changes
- [ ] Communicate changes to team
- [ ] Update roadmap accordingly

### Post-Implementation
- [ ] Retrospective on decisions
- [ ] Document lessons learned
- [ ] Update for future projects
- [ ] Share knowledge with community

---

## Change Log

| Date | Decision | Change | Reason |
|------|----------|---------|--------|
| 2025-11-15 | Initial | All decisions documented | Project start |

---

**Document Status**: Living document, update as decisions evolve
**Next Review**: After Phase 1 completion
**Owner**: Development Team Lead