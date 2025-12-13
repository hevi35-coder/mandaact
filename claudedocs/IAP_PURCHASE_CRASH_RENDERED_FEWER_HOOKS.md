# IAP Purchase Issues - Status & Resolution

## Test Date: 2025-12-13

### ✅ RESOLVED: React Hooks Crash After Purchase

**Issue**: App crashed with "Rendered fewer hooks than expected" error after completing subscription purchase.

**Root Cause**: `TodayScreen.tsx` had conditional early returns after hooks were called, violating React's Rules of Hooks:
```typescript
// BEFORE (WRONG)
const TodayScreen = () => {
  // ... hooks called here ...

  if (isLoading) return <LoadingView />  // ❌ Violates Rules of Hooks
  if (error) return <ErrorView />        // ❌ Violates Rules of Hooks

  return <MainView />
}
```

**Fix Applied**: Replaced early returns with conditional rendering:
```typescript
// AFTER (CORRECT)
const TodayScreen = () => {
  // ... all hooks called unconditionally ...

  return (
    <View>
      {isLoading && <LoadingView />}
      {!isLoading && error && <ErrorView />}
      {!isLoading && !error && <MainView />}
    </View>
  )
}
```

**File Modified**: `apps/mobile/src/screens/TodayScreen.tsx` lines 542-1116

**Test Result**: ✅ Crash no longer occurs after purchase completion

---

## ✅ RESOLVED ISSUES

### Issue #1: Rewarded Ads Not Hidden for Premium Users (CRITICAL)

**Status**: ✅ FIXED
**Priority**: 🔴 Highest
**Resolution Date**: 2025-12-13 11:20 KST (Updated 11:35 KST)

**Solution Applied**:
Added `isPremium` check to all rewarded ad components to automatically hide for premium users.

**Ads Hidden for Premium Users**:
1. **XP Boost Button** (HomeScreen, TodayScreen)
2. **Focus Mode / Ad-Free** (SettingsScreen)

**Files Modified**:
- `apps/mobile/src/components/ads/XPBoostButton.tsx`
  - Added `useSubscriptionContext()` import
  - Added early return when `isPremium === true` (line 86-88)

- `apps/mobile/src/screens/SettingsScreen.tsx`
  - Wrapped Focus Mode section with `!isPremium` condition (lines 652-713)
  - Entire section hidden for premium users

- `apps/mobile/src/components/ads/AdFreeButton.tsx`
  - Added `useSubscriptionContext()` import
  - Added early return when `isPremium === true` (line 63-65)

**Code Pattern**:
```typescript
// Added premium check
const { isPremium } = useSubscriptionContext()

// Don't render for premium users (ads-free benefit)
if (isPremium) {
  return null
}
```

**Benefit**: Premium users now enjoy complete ad-free experience:
- ✅ No XP Boost ads (was: watch ad for 2x XP for 1 hour)
- ✅ No Focus Mode ads (was: watch ad for 24h banner-free)
- ✅ Premium users are always ad-free by default

---

### Issue #2: No "Generate Report" Button for Premium Users

**Status**: ✅ FIXED
**Priority**: 🟡 High
**Resolution Date**: 2025-12-13 11:25 KST

**Solution Applied**:
Added premium-exclusive "Generate Report" button that replaces the "Next Report" countdown.

**Files Modified**:
- `apps/mobile/src/screens/ReportsScreen.tsx` (lines 919-1028)
  - Modified "Next Report" display to only show for free users
  - Added new "Generate Report" button for premium users with gradient design
  - Shows loading state while generating
- `apps/mobile/src/i18n/locales/ko.json` (lines 937-938)
- `apps/mobile/src/i18n/locales/en.json` (lines 939-940)

**UI Behavior**:
- **Free Users**: See "Next Report: Dec 15 (Mon)" countdown
- **Premium Users**: See "Generate Report" button with gradient styling
- Button triggers `handleGenerateAll()` immediately
- Shows "Generating..." state during report creation

**Translation Keys Added**:
- `reports.generateReport`: "리포트 생성하기" / "Generate Report"
- `reports.generating`: "생성 중..." / "Generating..."

---

### Issue #3: Subscription State Lost After App Restart

**Status**: ✅ FIXED (Improved)
**Priority**: 🔴 Critical
**Resolution Date**: 2025-12-13 11:30 KST

**Root Cause**:
1. `useEffect` dependency on `refreshSubscription` caused unstable re-initialization
2. No fallback to Supabase during initial load
3. Race condition between RevenueCat initialization and state queries

**Solution Applied**:
Completely rewrote initialization logic with 3-step process:

**Step 1**: Load from Supabase (fast, cached)
- Immediately show cached subscription status from database
- Provides instant feedback on app startup

**Step 2**: Initialize RevenueCat
- Connect to RevenueCat SDK with user ID
- Prepare for receipt validation

**Step 3**: Refresh from RevenueCat (source of truth)
- Get latest customer info from RevenueCat servers
- Update both app state and Supabase
- Log completion for debugging

**Files Modified**:
- `apps/mobile/src/hooks/useSubscription.ts` (lines 419-492)
  - Removed `refreshSubscription` from dependency array
  - Added mounted flag for cleanup safety
  - Added comprehensive logging at each step
  - Implemented Supabase-first fallback pattern

**Code Pattern**:
```typescript
useEffect(() => {
  if (!userId) return
  let mounted = true

  const initialize = async () => {
    // 1. Load from Supabase (fast)
    const supabaseData = await loadFromSupabase(userId)
    if (mounted) setSubscriptionInfo(supabaseData)

    // 2. Initialize RevenueCat
    await initializeRevenueCat(userId)
    if (!mounted) return
    setIsRevenueCatInitialized(true)

    // 3. Refresh from RevenueCat (source of truth)
    const rcInfo = await Purchases.getCustomerInfo()
    if (mounted) {
      setSubscriptionInfo(parseCustomerInfo(rcInfo))
      await syncToSupabase(rcInfo)
    }
  }

  initialize()
  return () => { mounted = false }
}, [userId]) // Only userId dependency
```

**Benefits**:
- Faster initial load (Supabase cache)
- More stable initialization (no circular dependencies)
- Better error handling and logging
- Proper cleanup on unmount

**Known Limitations**:
- iOS Sandbox receipts may still expire (Apple limitation)
- Sandbox purchases are test data, not permanent
- Production receipts (TestFlight/App Store) will persist correctly

---

## Resolution Timeline

### Phase 1: Critical Bug Fix (11:00 KST)
- ✅ Fixed React hooks crash in TodayScreen (conditional early returns)
- ✅ Documented iOS system alert limitation (Korean text expected behavior)

### Phase 2: Premium Features (11:15-11:35 KST)
- ✅ 11:20 KST: Issue #1 - Hidden rewarded ads for premium users (XP Boost + Focus Mode)
- ✅ 11:25 KST: Issue #2 - Added "Generate Report" button for premium users
- ✅ 11:30 KST: Issue #3 - Improved subscription state persistence

### Phase 3: Packages Loading Fix (12:05-12:10 KST)
- ✅ 12:10 KST: Issue #4 - Fixed subscription packages not loading (missing getOfferings call)

### Phase 4: Variable Reference Fix (12:47-12:50 KST)
- ✅ 12:50 KST: Issue #5 - Fixed ReferenceError in Generate Report button (undefined variables)

### Summary
- **Total Issues Resolved**: 6
- **Critical Bugs Fixed**: 4 (hooks crash, state persistence, packages loading, variable reference)
- **Premium Features Added**: 2 (complete ad-free, instant report generation)
- **Files Modified**: 7
  - `apps/mobile/src/screens/TodayScreen.tsx`
  - `apps/mobile/src/screens/SettingsScreen.tsx`
  - `apps/mobile/src/screens/ReportsScreen.tsx` (modified twice)
  - `apps/mobile/src/components/ads/XPBoostButton.tsx`
  - `apps/mobile/src/components/ads/AdFreeButton.tsx`
  - `apps/mobile/src/hooks/useSubscription.ts` (modified twice)
  - `apps/mobile/src/i18n/locales/*.json` (2 files)

---

## 🔴 NEW ISSUE FOUND & FIXED (2025-12-13 12:05 KST)

### Issue #4: Subscription Packages Not Loading in SubscriptionScreen

**Status**: ✅ FIXED
**Priority**: 🔴 Critical
**Discovery Date**: 2025-12-13 12:05 KST
**Resolution Date**: 2025-12-13 12:10 KST

**Symptoms**:
- SubscriptionScreen shows "현재 이용 가능한 플랜이 없습니다" (No plans available)
- Monthly and Yearly subscription packages not displayed
- Issue occurs with all accounts (not user-specific)
- "Restore Purchases" button visible but no packages to purchase

**Root Cause**:
When fixing Issue #3 (subscription state persistence), we rewrote the initialization logic in `useSubscription.ts` but **forgot to add the `getOfferings()` call** to load packages.

**Original Code (lines 461-472)**:
```typescript
// Step 3: Refresh from RevenueCat (source of truth)
const customerInfo = await Purchases.getCustomerInfo()
const info = parseCustomerInfo(customerInfo)

if (mounted) {
  setSubscriptionInfo(info)
  await syncToSupabase(info)
  // ❌ MISSING: getOfferings() call to load packages!
}
```

**Fixed Code (lines 461-502)**:
```typescript
// Step 3: Refresh from RevenueCat (source of truth)
const customerInfo = await Purchases.getCustomerInfo()
const info = parseCustomerInfo(customerInfo)

if (mounted) {
  setSubscriptionInfo(info)
  await syncToSupabase(info)
}

// Step 4: Load available packages ✅ ADDED
const offerings = await Purchases.getOfferings()

if (mounted) {
  if (offerings.current?.availablePackages) {
    setPackages(offerings.current.availablePackages)
  } else {
    // Fallback: Try to find any offering with packages
    const offeringsWithPackages = Object.values(offerings.all || {}).find(
      offering => offering.availablePackages && offering.availablePackages.length > 0
    )
    if (offeringsWithPackages) {
      setPackages(offeringsWithPackages.availablePackages)
    } else {
      setPackages([])
    }
  }
}
```

**Files Modified**:
- `apps/mobile/src/hooks/useSubscription.ts` (lines 461-502)
  - Added Step 4: Load available packages
  - Includes fallback logic for non-current offerings
  - Enhanced logging for debugging

**Impact**:
- **Before**: Users couldn't see subscription options, couldn't purchase
- **After**: Monthly ($2.99) and Yearly ($22.99) packages display correctly

**Lesson Learned**:
When refactoring initialization logic, ensure all critical steps from the original implementation are preserved:
1. ✅ Load Supabase cache
2. ✅ Initialize RevenueCat
3. ✅ Get customer info
4. ✅ **Get offerings/packages** ← This was missing!

---

## 🔴 NEW ISSUE FOUND & FIXED (2025-12-13 12:47 KST)

### Issue #5: ReferenceError After Purchase - Generate Report Button

**Status**: ✅ FIXED
**Priority**: 🔴 Critical
**Discovery Date**: 2025-12-13 12:47 KST
**Resolution Date**: 2025-12-13 12:50 KST

**Error Message**:
```
ReferenceError: Property 'isGeneratingWeekly' doesn't exist
```

**Symptoms**:
- App crashes immediately after completing subscription purchase
- Error boundary shows the above ReferenceError
- Crash occurs when navigating to or rendering ReportsScreen

**Root Cause**:
When adding the "Generate Report" button for premium users (Issue #2), we referenced **non-existent variables** `isGeneratingWeekly` and `isGeneratingDiagnosis`.

**Incorrect Code (lines 975, 992)**:
```typescript
disabled={isGeneratingWeekly || isGeneratingDiagnosis}  // ❌ Variables don't exist

{isGeneratingWeekly || isGeneratingDiagnosis ? (  // ❌ Variables don't exist
  <ActivityIndicator />
) : (
  <Sparkles />
)}
```

**The Problem**:
ReportsScreen has `generateWeeklyMutation` and `generateDiagnosisMutation` (defined at lines 663-664), but we incorrectly assumed there were `isGeneratingWeekly` and `isGeneratingDiagnosis` boolean variables.

**Correct Code (lines 975, 992)**:
```typescript
disabled={generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending}  // ✅ Correct

{generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending ? (  // ✅ Correct
  <ActivityIndicator />
) : (
  <Sparkles />
)}
```

**Files Modified**:
- `apps/mobile/src/screens/ReportsScreen.tsx` (lines 975, 992)
  - Changed `isGeneratingWeekly` → `generateWeeklyMutation.isPending`
  - Changed `isGeneratingDiagnosis` → `generateDiagnosisMutation.isPending`

**Impact**:
- **Before**: App crashed after purchase when ReportsScreen rendered
- **After**: Generate Report button works correctly, shows loading state during generation

**Lesson Learned**:
When adding new UI that depends on existing state, **verify the exact variable names** by searching the file first. Don't assume variable names based on convention.

---

## Notes

- iOS system purchase alert showing Korean text is expected behavior (iOS limitation, not a bug)
- All app toast notifications correctly use i18n translations
- Initialization now includes 4 complete steps: Supabase → RevenueCat → Customer Info → Packages
- Always use mutation's `.isPending` property to check loading state in TanStack Query
