# iOS Purchase Alert Limitation

## Issue

When users complete a subscription purchase in the mobile app, an iOS system alert appears in Korean ("설정 완료", "성공적으로 구입이 완료되었습니다.") even when the app is set to English language mode.

## Root Cause

The alert dialog is **not from the MandaAct app code** but from **iOS StoreKit system**. According to RevenueCat documentation, this is a native iOS system message that **cannot be prevented, suppressed, or customized** by developers.

## Technical Details

1. **Source**: Apple StoreKit framework (native iOS)
2. **Language**: Device system language (not app language)
3. **Control**: Completely managed by Apple, not accessible to developers
4. **Behavior**: Always appears after successful in-app purchase in sandbox and production

## Evidence

From RevenueCat Community discussion:
- "You cannot prevent this alert. The 'You're all set your purchase was successful' message is a system message from Apple and is out of developer control."
- Source: https://community.revenuecat.com/sdks-51/is-there-a-way-to-prevent-you-re-all-set-your-purchase-was-successful-message-after-a-purchase-816

## App Code Verification

All `Alert.alert()` calls in the MandaAct codebase properly use i18n translations:
- `SubscriptionScreen.tsx` lines 80-83: Uses `t('subscription.purchaseSuccess')` and `t('subscription.welcomePremium')`
- All other alerts use `t()` function with proper translation keys

## User Impact

- **Expected Behavior**: System alert appears in device language
- **App Behavior**: App toast notifications correctly show in selected app language
- **Workaround**: None available (iOS limitation)
- **User Education**: This is normal iOS behavior for all apps

## Related Fix

A separate React hooks error that occurred after purchase completion has been fixed in `TodayScreen.tsx` by removing conditional early returns that violated the Rules of Hooks.

## Date

2025-12-13
