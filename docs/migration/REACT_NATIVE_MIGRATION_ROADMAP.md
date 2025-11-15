# MandaAct React Native Migration Roadmap v1.0

**Creation Date**: 2025-11-15
**Status**: Planning Phase
**Target Completion**: Q1-Q2 2025 (12-16 weeks)
**Priority**: High

---

## Executive Summary

This document outlines the comprehensive migration strategy from MandaAct's current PWA implementation to a React Native mobile application. Based on 2025 best practices and the latest Expo SDK 52+ capabilities, this roadmap provides a structured approach to deliver a native mobile experience while maintaining feature parity and improving performance.

### Migration Approach: Expo Managed Workflow + EAS

**Recommended Stack**:
- **Framework**: Expo SDK 52+ (Managed Workflow)
- **Build System**: EAS Build & Submit
- **Navigation**: React Navigation v6
- **State Management**: Zustand (existing) + TanStack Query
- **Backend**: Supabase (no changes needed)
- **Push Notifications**: Expo Push Notifications → FCM/APNs

**Key Advantages**:
- 75% faster development compared to React Native CLI
- Cloud-based builds (no local Xcode/Android Studio required)
- Over-the-air (OTA) updates for instant bug fixes
- New Architecture enabled by default (better performance)
- Seamless migration path with possible code reuse

---

## Phase 0: Preparation & Setup (Week 1)

### Objectives
Establish development environment and project foundation with parallel development capability.

### Tasks
- [ ] **Repository Setup**
  - Create new branch: `mandaact-native`
  - Initialize Expo project: `npx create-expo-app mandaact-native --template expo-template-blank-typescript`
  - Configure monorepo structure (optional): `packages/web` + `packages/mobile`

- [ ] **Development Environment**
  - Install EAS CLI: `npm install -g eas-cli`
  - Configure EAS project: `eas init`
  - Set up development builds configuration
  - Configure TypeScript with shared types from web project

- [ ] **CI/CD Foundation**
  - GitHub Actions workflow for type checking and linting
  - EAS Build pipeline configuration
  - Environment variable management strategy

### Deliverables
- ✅ Expo project initialized with TypeScript
- ✅ EAS configured for cloud builds
- ✅ CI/CD pipeline ready
- ✅ Development environment documentation

### Success Criteria
- Successfully build and run empty Expo app on iOS/Android simulators
- EAS Build produces installable binaries

---

## Phase 1: Core Infrastructure PoC (Week 2-3)

### Objectives
Validate technical feasibility and establish core patterns for the migration.

### Tasks
- [ ] **Supabase Integration**
  ```typescript
  // Configure Supabase client for React Native
  import AsyncStorage from '@react-native-async-storage/async-storage'
  import { createClient } from '@supabase/supabase-js'

  const supabase = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    }
  })
  ```

- [ ] **Authentication Flow**
  - Email/password login implementation
  - Session persistence with AsyncStorage
  - Auto-login on app launch
  - Korean error message handling

- [ ] **State Management Setup**
  - Port Zustand stores (authStore)
  - Configure TanStack Query with React Native
  - Implement offline persistence strategy

- [ ] **Navigation Structure**
  ```typescript
  // Basic navigation structure
  const Stack = createNativeStackNavigator()
  const Tab = createBottomTabNavigator()

  // Main app structure
  - AuthStack (Login, Signup)
  - MainTabs
    - Home
    - Today
    - Mandalart
    - Stats
    - Settings
  ```

- [ ] **Critical Feature PoC: OCR Flow**
  - Camera/Gallery image selection
  - Upload to Supabase Storage
  - Call OCR Edge Function
  - Display and edit parsed result
  - Save to database

### Deliverables
- ✅ Working authentication with Supabase
- ✅ Basic navigation between 2-3 screens
- ✅ OCR flow proof of concept
- ✅ Data fetching and caching working

### Success Criteria
- User can log in and session persists
- OCR successfully processes mandalart image
- Data syncs between app and Supabase

---

## Phase 2: UI/UX Migration (Week 4-6)

### Objectives
Port all UI components and screens from web to React Native with native-optimized design.

### UI Framework Strategy

| Web Component | React Native Replacement | Implementation Notes |
|---------------|-------------------------|---------------------|
| Tailwind CSS | NativeWind 4.0 | Tailwind-compatible styling for RN |
| shadcn/ui | Custom components | Build RN equivalent components |
| Radix UI | React Native Elements | Use native UI primitives |
| Framer Motion | Reanimated 3 | Performance-optimized animations |
| Lucide Icons | React Native Vector Icons | Icon library with similar icons |

### Component Migration Priority

#### Critical Components (Week 4)
- [ ] **Layout Components**
  - Navigation (bottom tabs for mobile)
  - Headers with back navigation
  - Loading states and skeletons
  - Error boundaries

- [ ] **Form Components**
  - Input fields with validation
  - Buttons (primary, secondary, ghost)
  - Select/Dropdown replacements
  - Checkbox and Radio components

- [ ] **Display Components**
  - Cards and containers
  - Lists with pull-to-refresh
  - Modals and bottom sheets
  - Toast notifications

#### Screen Implementation (Week 5-6)

**Authentication Screens**
- [ ] Login screen with form validation
- [ ] Signup screen with password requirements
- [ ] Password reset flow

**Core Screens**
- [ ] **Home Dashboard**
  - Stats summary cards
  - Quick action buttons
  - Recent activity feed
  - Level/XP progress display

- [ ] **Today's Practice (오늘의 실천)**
  - Grouped action list by mandalart
  - Swipe to check/uncheck
  - Filter by action type
  - Progress indicators

- [ ] **Mandalart Management**
  - List view with activate/deactivate
  - Search and filter
  - Delete with confirmation

- [ ] **Mandalart Detail (9x9 Grid)**
  ```typescript
  // Optimized grid implementation
  const MandalartGrid = () => {
    return (
      <ScrollView>
        <View style={styles.grid}>
          {cells.map((cell, index) => (
            <MandalartCell
              key={index}
              data={cell}
              isCenter={index === 40}
              onPress={() => handleCellPress(cell)}
            />
          ))}
        </View>
      </ScrollView>
    )
  }
  ```

- [ ] **Mandalart Creation (3 Methods)**
  - Image upload with camera/gallery
  - Text paste with parsing
  - Manual template input
  - AI type suggestions inline

- [ ] **Statistics**
  - Heatmap calendar view
  - Progress charts (Victory Native or react-native-chart-kit)
  - Mandalart filter dropdown

- [ ] **Reports**
  - Weekly report display (Markdown renderer)
  - Goal diagnosis view
  - Share functionality

- [ ] **Settings**
  - Notification preferences
  - Account management
  - App version and info

### Animation Strategy
```typescript
// Migrate from Framer Motion to Reanimated
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated'

// Badge unlock animation example
const BadgeUnlock = ({ badge }) => {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withSpring(1)
    opacity.value = withTiming(1)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }))

  return <Animated.View style={animatedStyle}>...</Animated.View>
}
```

### Deliverables
- ✅ All 15+ screens implemented
- ✅ Navigation flow complete
- ✅ Animations and transitions smooth
- ✅ Responsive layout for various screen sizes

---

## Phase 3: Feature Migration & Optimization (Week 7-10)

### Objectives
Implement all business logic, integrate APIs, and optimize performance.

### Core Features Implementation

#### 3.1 Mandalart System
- [ ] **Data Models**
  - Port TypeScript interfaces
  - Implement local data caching
  - Offline-first architecture

- [ ] **Action Type System**
  - Port `actionTypes.ts` logic
  - AI suggestion integration
  - Type-specific display rules

- [ ] **Check History**
  - Daily check functionality
  - Date selection (up to yesterday)
  - Optimistic updates with rollback

#### 3.2 Gamification System
- [ ] **XP System**
  ```typescript
  // Port XP calculation with multipliers
  import { calculateXPWithMultipliers } from '@/lib/xpMultipliers'

  const awardXP = async (userId: string, baseXP: number) => {
    const multipliers = await getActiveMultipliers(userId)
    const finalXP = calculateXPWithMultipliers(baseXP, multipliers)
    // Update with animation
    animateXPGain(finalXP)
  }
  ```

- [ ] **Badge System**
  - 21 badges implementation
  - Auto-unlock evaluation
  - Toast notifications with haptic feedback
  - NEW badge indicators

- [ ] **Streaks & Challenges**
  - Streak calculation with KST timezone
  - Monthly challenge reset
  - Freeze feature

#### 3.3 AI Integration (Server-Side)
- [ ] **OCR Processing**
  - Optimize image upload (resize before upload)
  - Progress indicator during processing
  - Error handling with retry

- [ ] **Reports Generation**
  - Weekly report request/display
  - Goal diagnosis functionality
  - Caching strategy for reports

- [ ] **Security**
  - All API keys remain in Edge Functions
  - No sensitive data in client code

#### 3.4 Push Notifications
```typescript
// Expo Push Notifications setup
import * as Notifications from 'expo-notifications'

const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status === 'granted') {
    const token = await Notifications.getExpoPushTokenAsync()
    // Save token to Supabase
    await saveNotificationToken(token.data)
  }
}
```

- [ ] **Implementation**
  - Permission request flow
  - Token registration with Supabase
  - Daily reminder notifications
  - Achievement unlock notifications
  - Weekly report ready notifications

### Performance Optimization

#### Memory Management
- [ ] Image optimization before upload
- [ ] List virtualization for large datasets
- [ ] Component memoization strategy
- [ ] Lazy loading for heavy screens

#### Network Optimization
- [ ] Request batching
- [ ] Implement request queue for offline
- [ ] Progressive data loading
- [ ] Image caching with expo-image

#### Bundle Size Optimization
- [ ] Tree shaking verification
- [ ] Code splitting where applicable
- [ ] Remove unused dependencies
- [ ] Asset optimization

### Deliverables
- ✅ All features working with feature parity
- ✅ Performance metrics meeting targets
- ✅ Offline functionality implemented
- ✅ Push notifications working

---

## Phase 4: Platform Integration & Testing (Week 11-12)

### Objectives
Ensure app meets platform requirements and passes all quality checks.

### Platform-Specific Configuration

#### iOS Configuration
```json
// app.json iOS configuration
{
  "ios": {
    "bundleIdentifier": "com.mandaact.app",
    "buildNumber": "1.0.0",
    "infoPlist": {
      "NSCameraUsageDescription": "카메라를 사용하여 만다라트를 촬영합니다",
      "NSPhotoLibraryUsageDescription": "갤러리에서 만다라트 이미지를 선택합니다",
      "NSPhotoLibraryAddUsageDescription": "생성된 만다라트를 저장합니다"
    },
    "supportsTablet": false,
    "associatedDomains": ["applinks:mandaact.com"]
  }
}
```

#### Android Configuration
```json
// app.json Android configuration
{
  "android": {
    "package": "com.mandaact.app",
    "versionCode": 1,
    "permissions": [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "NOTIFICATIONS"
    ],
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#000000"
    }
  }
}
```

### Testing Strategy

#### Unit Testing
- [ ] Core logic tests (Jest)
  - Action type system
  - XP calculations
  - Badge evaluation logic
  - Date/time utilities

#### Integration Testing
- [ ] API integration tests
  - Supabase authentication
  - Data synchronization
  - Edge function calls

#### E2E Testing (Detox)
- [ ] Critical user flows
  - Onboarding → Create mandalart → Check actions
  - Login → Today's practice → Earn XP
  - Upload image → OCR → Save mandalart
  - Generate weekly report

#### Platform Testing
- [ ] iOS Testing
  - iPhone (various sizes)
  - iPad compatibility check
  - iOS 15+ compatibility

- [ ] Android Testing
  - Various screen densities
  - Android 8+ compatibility
  - Different manufacturers

### Quality Assurance Checklist
- [ ] Performance metrics meet targets
  - App launch < 2 seconds
  - Screen transitions < 300ms
  - Memory usage < 200MB
- [ ] Accessibility compliance
  - Screen reader support
  - Color contrast ratios
  - Touch target sizes
- [ ] Error handling comprehensive
  - Network failures gracefully handled
  - Clear error messages in Korean
  - Retry mechanisms in place

### Deliverables
- ✅ All tests passing
- ✅ Platform configurations complete
- ✅ Performance benchmarks met
- ✅ Beta builds ready for testing

---

## Phase 5: Deployment & Launch (Week 13-14)

### Objectives
Successfully deploy to app stores and migrate existing users.

### Pre-Launch Preparation

#### Assets Preparation
- [ ] App icons (all required sizes)
- [ ] Splash screens
- [ ] Store screenshots (iPhone/Android)
- [ ] App preview videos
- [ ] Store descriptions (Korean/English)

#### App Store Submission (iOS)
```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

- [ ] Apple Developer account setup
- [ ] App Store Connect configuration
- [ ] Privacy policy URL
- [ ] App review preparation

#### Google Play Submission (Android)
```bash
# Build for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --latest
```

- [ ] Google Play Console setup
- [ ] Content rating questionnaire
- [ ] Data safety form
- [ ] Target audience configuration

### Migration Strategy for Existing Users

#### Communication Plan
- [ ] In-app announcement (PWA)
- [ ] Email notification
- [ ] Social media announcement
- [ ] Migration benefits explanation

#### Data Migration
- [ ] User accounts work seamlessly
- [ ] All data accessible in native app
- [ ] Settings preserved
- [ ] Progress/XP maintained

#### Transition Period
- [ ] Both PWA and native app available
- [ ] Feature parity maintained
- [ ] Gradual migration encouragement
- [ ] PWA sunset timeline

### Post-Launch Monitoring

#### Analytics Setup
- [ ] User acquisition tracking
- [ ] Crash reporting (Sentry)
- [ ] Performance monitoring
- [ ] User behavior analytics

#### Success Metrics
- [ ] Download numbers
- [ ] User retention (Day 1/7/30)
- [ ] Crash-free rate > 99.5%
- [ ] App store rating > 4.0
- [ ] Migration completion rate

### Deliverables
- ✅ App live on App Store
- ✅ App live on Google Play
- ✅ Migration completed for X% users
- ✅ Monitoring dashboards active

---

## Technical Decision Matrix

### Architecture Decisions

| Decision Point | Options | Recommendation | Rationale |
|---------------|---------|---------------|-----------|
| **Framework** | Expo Managed vs React Native CLI | **Expo Managed** | 75% faster development, cloud builds, OTA updates |
| **Navigation** | React Navigation vs Expo Router | **React Navigation** | More mature, better documentation, proven stability |
| **State Management** | Keep Zustand vs Redux/MobX | **Keep Zustand** | Already implemented, works well with RN |
| **UI Framework** | NativeWind vs Styled Components | **NativeWind** | Familiar Tailwind syntax, good performance |
| **Animations** | Reanimated vs Lottie | **Reanimated** | Better performance, more control |
| **Charts** | Victory Native vs react-native-chart-kit | **Victory Native** | Better customization, similar to web |
| **Push Notifications** | Expo Push vs Native FCM/APNs | **Expo Push** | Simpler implementation, unified API |
| **Testing** | Detox vs Maestro | **Detox** | Better React Native integration |

### Technology Mapping

| Web Technology | React Native Alternative | Migration Complexity |
|----------------|------------------------|---------------------|
| React 18 | React Native 0.76 | Low - Same concepts |
| TypeScript | TypeScript | None - Direct use |
| Vite | Metro | Low - Automatic with Expo |
| Tailwind CSS | NativeWind 4.0 | Medium - Syntax adaptation |
| shadcn/ui | Custom Components | High - Full rewrite |
| TanStack Query | TanStack Query | Low - Works in RN |
| Zustand | Zustand | Low - Works in RN |
| React Router | React Navigation | Medium - Different API |
| Framer Motion | Reanimated 3 | High - Different concepts |
| dom-to-image | react-native-view-shot | Low - Similar API |
| date-fns | date-fns | None - Direct use |
| React Markdown | react-native-markdown-display | Low - Similar usage |
| Supabase | Supabase | Low - Add AsyncStorage |

---

## Risk Assessment & Mitigation

### High Priority Risks

#### Risk 1: UI Component Recreation Complexity
**Impact**: High | **Probability**: High
- **Description**: shadcn/ui and Radix components need complete rewrite
- **Mitigation**:
  - Start with minimal component set
  - Use React Native UI libraries as base
  - Incremental component development
  - Consider hiring RN UI specialist

#### Risk 2: OCR Performance on Mobile
**Impact**: High | **Probability**: Medium
- **Description**: Large image processing may cause memory issues
- **Mitigation**:
  - Implement image resizing before upload
  - Add upload progress indicators
  - Consider on-device ML Kit for offline
  - Implement retry mechanism

#### Risk 3: 9x9 Grid Performance
**Impact**: Medium | **Probability**: Medium
- **Description**: 81 cells may cause rendering performance issues
- **Mitigation**:
  - Use FlatList with optimization props
  - Implement cell memoization
  - Consider virtualization
  - Progressive loading strategy

### Medium Priority Risks

#### Risk 4: Push Notification Complexity
**Impact**: Medium | **Probability**: Low
- **Description**: Different implementation for iOS/Android
- **Mitigation**:
  - Use Expo Push service initially
  - Gradual migration to native if needed
  - Comprehensive testing on both platforms

#### Risk 5: Animation Performance
**Impact**: Medium | **Probability**: Medium
- **Description**: Complex animations may not be smooth
- **Mitigation**:
  - Use native driver for animations
  - Simplify animation complexity
  - Performance testing on low-end devices

### Low Priority Risks

#### Risk 6: App Store Rejection
**Impact**: Low | **Probability**: Low
- **Description**: App may be rejected for various reasons
- **Mitigation**:
  - Follow guidelines strictly
  - Prepare detailed review notes
  - Have contingency plan for fixes

---

## Resource Requirements

### Team Composition
- **Lead Developer**: Full-time (14 weeks)
- **UI/UX Designer**: Part-time (4 weeks)
- **QA Tester**: Part-time (4 weeks)
- **Project Manager**: Part-time (14 weeks)

### Budget Estimation

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer Account | $99/year | Required for iOS |
| Google Play Console | $25 one-time | Required for Android |
| EAS Build (Team Plan) | $99/month | Recommended for faster builds |
| Testing Devices | $2000 | Various iOS/Android devices |
| External Services | $500/month | Sentry, Analytics, etc. |
| **Total Initial Investment** | **~$5000** | First 3 months |
| **Ongoing Monthly** | **~$200** | After launch |

### Timeline Summary

```
Week 1     : Phase 0 - Setup & Environment
Week 2-3   : Phase 1 - Core Infrastructure PoC
Week 4-6   : Phase 2 - UI/UX Migration
Week 7-10  : Phase 3 - Feature Migration
Week 11-12 : Phase 4 - Testing & Integration
Week 13-14 : Phase 5 - Deployment & Launch
Week 15-16 : Buffer - Issue resolution & optimization
```

---

## Success Criteria

### Technical Metrics
- ✅ 100% feature parity with PWA
- ✅ Performance score > 90 (Lighthouse equivalent)
- ✅ Crash-free rate > 99.5%
- ✅ App size < 50MB (iOS) / < 30MB (Android)
- ✅ Cold start < 2 seconds
- ✅ API response cache hit rate > 80%

### Business Metrics
- ✅ 70% user migration rate within 3 months
- ✅ App store rating ≥ 4.0
- ✅ User retention Day 7 > 60%
- ✅ User retention Day 30 > 40%
- ✅ Daily Active Users growth +50%
- ✅ Average session duration +30%

### User Experience Metrics
- ✅ Onboarding completion > 80%
- ✅ Tutorial completion > 70%
- ✅ Daily check completion > 60%
- ✅ Push notification opt-in > 50%
- ✅ Weekly report generation > 40% users

---

## Implementation Checklist

### Immediate Actions (This Week)
- [ ] Set up Expo development environment
- [ ] Create project repository structure
- [ ] Install core dependencies
- [ ] Configure TypeScript and ESLint
- [ ] Set up EAS Build
- [ ] Create basic navigation structure
- [ ] Implement Supabase connection

### Week 1-2 Milestones
- [ ] Authentication working
- [ ] Basic UI components created
- [ ] OCR PoC functional
- [ ] Navigation complete
- [ ] CI/CD pipeline active

### Critical Path Dependencies
1. Supabase integration → Everything else
2. Navigation setup → Screen implementation
3. UI components → Feature development
4. OCR PoC → Mandalart creation flow
5. Testing setup → Quality assurance

---

## Appendix

### A. Useful Commands

```bash
# Project initialization
npx create-expo-app mandaact-native --template expo-template-blank-typescript
cd mandaact-native

# Core dependencies installation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler
npm install @tanstack/react-query zustand @react-native-async-storage/async-storage
npm install @supabase/supabase-js
npm install nativewind tailwindcss
npm install react-native-reanimated
npm install expo-image expo-camera expo-image-picker
npm install react-native-view-shot
npm install expo-notifications

# Development setup
npm install -D @types/react @types/react-native
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier

# EAS setup
npm install -g eas-cli
eas init
eas build:configure

# Build commands
eas build --platform ios --profile development
eas build --platform android --profile development
eas build --platform all --profile preview

# Testing
npm install -D jest @testing-library/react-native detox
```

### B. Recommended Libraries

| Category | Library | Version | Purpose |
|----------|---------|---------|---------|
| **Navigation** | @react-navigation/native | ^6.1 | Navigation framework |
| **State** | zustand | ^4.5 | Global state management |
| **API** | @tanstack/react-query | ^5.56 | Server state management |
| **UI** | nativewind | ^4.1 | Tailwind for React Native |
| **Animation** | react-native-reanimated | ^3.16 | Performance animations |
| **Storage** | @react-native-async-storage/async-storage | ^2.1 | Local storage |
| **Icons** | react-native-vector-icons | ^10.2 | Icon library |
| **Forms** | react-hook-form | ^7.65 | Form management |
| **Charts** | victory-native | ^37.3 | Data visualization |
| **Markdown** | react-native-markdown-display | ^7.0 | Markdown rendering |
| **Image** | expo-image | ~52.0 | Optimized image component |
| **Camera** | expo-camera | ~52.0 | Camera access |
| **Notifications** | expo-notifications | ~52.0 | Push notifications |

### C. File Structure

```
mandaact-native/
├── app.json                 # Expo configuration
├── eas.json                 # EAS Build configuration
├── babel.config.js          # Babel configuration
├── metro.config.js          # Metro bundler config
├── tailwind.config.js       # NativeWind configuration
├── tsconfig.json           # TypeScript configuration
├── package.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── App.tsx                 # Entry point
├── src/
│   ├── components/         # Reusable components
│   │   ├── ui/            # Base UI components
│   │   ├── forms/         # Form components
│   │   └── features/      # Feature-specific components
│   ├── screens/           # Screen components
│   │   ├── auth/          # Authentication screens
│   │   ├── home/          # Home and dashboard
│   │   ├── mandalart/     # Mandalart screens
│   │   ├── stats/         # Statistics screens
│   │   └── settings/      # Settings screens
│   ├── navigation/        # Navigation configuration
│   ├── services/          # API and external services
│   │   ├── supabase.ts
│   │   └── notifications.ts
│   ├── store/             # State management
│   │   ├── authStore.ts
│   │   └── gameStore.ts
│   ├── lib/               # Utility functions
│   │   ├── actionTypes.ts
│   │   ├── xpMultipliers.ts
│   │   └── stats.ts
│   ├── hooks/             # Custom hooks
│   ├── types/             # TypeScript types
│   └── constants/         # App constants
├── assets/                # Images, fonts, etc.
└── __tests__/            # Test files
```

### D. Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| App Launch (Cold) | < 2s | Performance monitor |
| App Launch (Warm) | < 500ms | Performance monitor |
| Screen Navigation | < 300ms | Custom tracking |
| List Scroll FPS | 60 FPS | React DevTools |
| Memory Usage | < 200MB | Xcode/Android Studio |
| Network Cache Hit | > 80% | Custom metrics |
| JS Bundle Size | < 5MB | Metro bundler |
| APK Size | < 30MB | Build output |
| IPA Size | < 50MB | Build output |

### E. Migration Tips

1. **Start with Expo Managed Workflow** - You can always eject later if needed
2. **Reuse Business Logic** - Most TypeScript code can be shared
3. **Redesign, Don't Port** - Take advantage of native patterns
4. **Test Early and Often** - Use real devices, not just simulators
5. **Optimize Images** - Mobile has stricter memory constraints
6. **Handle Offline First** - Mobile networks are unreliable
7. **Respect Platform Conventions** - iOS and Android have different UX patterns
8. **Plan for App Store Review** - Build in time for potential rejections
9. **Monitor Performance** - Use tools like Flipper and React DevTools
10. **Gather User Feedback** - Beta test with real users before launch

---

## Document Updates

This document should be updated:
- Weekly during active development
- After each phase completion
- When major decisions change
- Based on user feedback
- After app store launch

**Last Updated**: 2025-11-15
**Next Review**: After Phase 0 completion
**Document Version**: 1.0
**Author**: Development Team

---

## Questions for Decision Making

Before starting implementation, decide on:

1. **Monorepo vs Separate Repo**: Will mobile app share code with web?
2. **Design System**: Create new or adapt existing?
3. **Testing Coverage Target**: What percentage is acceptable?
4. **Beta Testing Strategy**: TestFlight/Play Console track?
5. **Migration Timeline**: Aggressive (hard switch) or gradual?
6. **Feature Prioritization**: MVP features vs full parity?
7. **Offline Capabilities**: How much should work offline?
8. **Analytics Platform**: Firebase, Amplitude, or other?
9. **Error Tracking**: Sentry, Bugsnag, or other?
10. **Code Sharing Strategy**: Shared types, utils, or more?

---

END OF DOCUMENT