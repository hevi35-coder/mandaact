# Debug: Premium Subscription Not Removing Ads

## Issue
User purchased premium subscription (yearly) in Sandbox, but ads are still showing on screens.

## Debug Logging Added

### 1. useSubscription.ts - parseCustomerInfo()
**Location**: Lines 106-150
**What to check**:
```
[useSubscription] 🔍 parseCustomerInfo - Raw data:
  - activeEntitlements: [] or ["premium"]
  - hasPremiumEntitlement: true or false
```

**Expected after purchase**:
- `activeEntitlements: ["premium"]`
- `hasPremiumEntitlement: true`
- Should log: `✅ Premium entitlement found → PREMIUM`

**If showing FREE**:
- `activeEntitlements: []`
- Should log: `❌ No active premium entitlement found → FREE`

### 2. useSubscription.ts - purchase()
**Location**: Lines 266-299
**Purchase flow logs**:
```
[useSubscription] 💳 Starting purchase: $rc_yearly
[useSubscription] 💳 Purchase completed, parsing customer info...
[useSubscription] 💳 Updated subscription state: { isPremium: true, status: 'premium', plan: 'yearly' }
[useSubscription] 💳 Synced to Supabase
```

**What to check**:
- Does purchase complete successfully?
- Does `parseCustomerInfo` return `isPremium: true`?
- Does Supabase sync succeed?

### 3. useSubscription.ts - Customer Info Update Listener
**Location**: Lines 346-365
**What to check**:
```
[useSubscription] 👂 Customer info update listener registered
[useSubscription] 🔔 Customer info updated (listener triggered)
[useSubscription] 🔔 State updated from listener: { isPremium: true, status: 'premium' }
```

**Expected behavior**:
- Listener should trigger after purchase
- Should update state to `isPremium: true`

### 4. SubscriptionContext.tsx
**Location**: Lines 71-76
**Context value propagation**:
```
[SubscriptionContext] 📦 Context value updated: { isPremium: true, isFreeTier: false, status: 'premium', isLoading: false }
```

**What to check**:
- Does context receive updated value?
- Is `isPremium` correctly set to `true`?

### 5. BannerAd.tsx
**Location**: Lines 53-101
**Ad display decision logs**:
```
[BannerAd] 🎯 Subscription state check: { location: 'home', hasSubscription: true, isPremium: true, subscriptionStatus: 'premium' }
[BannerAd] 🚫 Ad hidden - reason: { isPremium: true, adRestriction: 'no_ads', isAdFree: false }
```

**What to check**:
- What is `isPremium` value in BannerAd?
- Is ad being hidden or shown?

## Diagnosis Steps

### Step 1: Check RevenueCat Response
Look for `parseCustomerInfo` logs right after purchase:
- ✅ **GOOD**: `activeEntitlements: ["premium"]` → RevenueCat knows about purchase
- ❌ **BAD**: `activeEntitlements: []` → RevenueCat doesn't have entitlement data

**If BAD**: RevenueCat issue
- Check RevenueCat dashboard: Products → Entitlements
- Ensure "premium" entitlement exists and is attached to product
- Check product ID matches: `com.mandaact.sub.premium.yearly`

### Step 2: Check State Update
Look for purchase flow logs:
- ✅ **GOOD**: State shows `isPremium: true` after purchase
- ❌ **BAD**: State still shows `isPremium: false`

**If BAD**: Parsing or state update issue
- Check `parseCustomerInfo` logic
- Verify state is being set correctly

### Step 3: Check Context Propagation
Look for SubscriptionContext logs:
- ✅ **GOOD**: Context value has `isPremium: true`
- ❌ **BAD**: Context value has `isPremium: false`

**If BAD**: Context update issue
- Check if hook is re-rendering
- Verify context provider is wrapping app correctly

### Step 4: Check BannerAd Component
Look for BannerAd logs on each screen (home, today, list):
- ✅ **GOOD**: `isPremium: true` → Ad should be hidden
- ❌ **BAD**: `isPremium: false` → Ad will still show

**If BAD but Context is GOOD**:
- Component not receiving context updates
- Check if BannerAd is inside SubscriptionProvider
- Check for multiple SubscriptionProvider instances

## Quick Test Actions

### Action 1: Check Settings Screen
Navigate to Settings screen and check if premium status is displayed.
- If premium card shows → Context is working
- If limit card shows → Context has `isPremium: false`

### Action 2: Force Refresh
Call `refreshSubscription()` manually:
- Should trigger `parseCustomerInfo` again
- Check if entitlements are fetched from RevenueCat

### Action 3: Restore Purchases
Try "Restore Purchases" button:
- Should fetch latest customer info
- Check logs for entitlement data

## Common Issues & Solutions

### Issue 1: RevenueCat Sandbox Delay
**Symptom**: Purchase succeeds but entitlements don't appear immediately
**Solution**: Wait 1-2 minutes, then check RevenueCat dashboard

### Issue 2: Entitlement Not Configured
**Symptom**: `activeEntitlements: []` even after purchase
**Solution**:
1. Go to RevenueCat dashboard → Products
2. Check if "premium" entitlement exists
3. Verify product `com.mandaact.sub.premium.yearly` is attached to entitlement

### Issue 3: Multiple App User IDs
**Symptom**: Purchase shows in RevenueCat for different appUserID
**Solution**: Check RevenueCat initialization - ensure `appUserID` matches MandaAct user ID

### Issue 4: Stale State
**Symptom**: Context not updating even though RevenueCat has entitlement
**Solution**:
1. Kill and restart app
2. Check customer info update listener is registered
3. Manually call `refreshSubscription()`

## Expected Log Flow (Happy Path)

```
[RevenueCat] Initializing... { userId: "..." }
[RevenueCat] Successfully initialized for user: ...
[useSubscription] 👂 Customer info update listener registered
[useSubscription] 🔍 parseCustomerInfo - Raw data: { activeEntitlements: [] }
[useSubscription] ❌ No active premium entitlement found → FREE
[SubscriptionContext] 📦 Context value updated: { isPremium: false, status: 'loading' }

--- USER PURCHASES ---

[useSubscription] 💳 Starting purchase: $rc_yearly
[useSubscription] 💳 Purchase completed, parsing customer info...
[useSubscription] 🔍 parseCustomerInfo - Raw data: { activeEntitlements: ["premium"] }
[useSubscription] ✅ Premium entitlement found → PREMIUM { productId: "com.mandaact.sub.premium.yearly", plan: "yearly" }
[useSubscription] 💳 Updated subscription state: { isPremium: true, status: 'premium', plan: 'yearly' }
[useSubscription] 💳 Synced to Supabase
[SubscriptionContext] 📦 Context value updated: { isPremium: true, status: 'premium' }

--- USER NAVIGATES TO HOME ---

[BannerAd] 🎯 Subscription state check: { location: 'home', isPremium: true }
[BannerAd] 🚫 Ad hidden - reason: { isPremium: true }
```

## Next Steps

1. **Run the app in Expo** and watch the console logs
2. **Purchase premium subscription** in Sandbox
3. **Follow the log flow** above to identify where it breaks
4. **Report findings** with specific log excerpts showing the issue

## Files Modified

- `apps/mobile/src/hooks/useSubscription.ts` (lines 106-150, 266-299, 346-365)
- `apps/mobile/src/context/SubscriptionContext.tsx` (lines 71-76)
- `apps/mobile/src/components/ads/BannerAd.tsx` (lines 53-58, 92-101)
