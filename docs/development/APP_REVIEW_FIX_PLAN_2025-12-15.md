# App Review Fix Plan (2025-12-15)

## Rejection Summary

### Guideline 2.1 — IAP Paywall (Plans not displayed)
- Symptom: On the review device, subscription plans were not displayed.
- Impact: Poor UX; reviewer cannot validate subscription purchase flow.

### Guideline 3.1.2 — Missing Terms of Use (EULA) link in metadata
- Symptom: App Store Connect metadata is missing a functional Terms of Use (EULA) link.
- Note: The binary already includes an EULA link, but Apple also requires it in metadata (App Description or custom EULA field).

---

## Fix (Code) — Make Plans Display Reliably

### Approach
1. Keep RevenueCat Offerings as the primary source (normal case).
2. If Offerings return no packages, **fallback to StoreKit products** via `Purchases.getProducts([monthly, yearly])`.
3. Render plan cards from:
   - `packages` when available, otherwise
   - `storeProducts` (fallback).
4. Purchase using:
   - `Purchases.purchasePackage(...)` for packages, otherwise
   - `Purchases.purchaseStoreProduct(...)` for fallback products.
5. Add a simple `Retry` button when no plans are available.

### Files
- `apps/mobile/src/hooks/useSubscription.ts`
- `apps/mobile/src/context/SubscriptionContext.tsx`
- `apps/mobile/src/screens/SubscriptionScreen.tsx`

---

## Fix (Manual) — Add EULA link to App Store Connect metadata

### If using Apple Standard EULA
Add this link somewhere in **App Description** (recommended near the bottom):

- Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Also ensure the Privacy Policy field in App Store Connect is set (already required separately).

### Where to edit
- App Store Connect → My Apps → MandaAct → App Information → **Description**
  - Add the EULA URL line above.
  - Save.

---

## Verification Checklist (before resubmitting)

### On iPad (TestFlight build)
1. Open Premium/Subscription screen.
2. Confirm **Monthly** and **Yearly** cards are visible.
3. Tap each plan:
   - Purchase sheet should appear (or sandbox auth prompt).
   - If purchase succeeds, Premium status should update.
4. If plans are missing, tap `Retry` and confirm plans appear.

### Metadata
1. App Store Connect description includes the EULA link.

---

## Execution Log

- 2025-12-16: PR merged (paywall plans fallback + retry)
- 2025-12-16: Local iOS build + EAS Submit 완료
  - IPA: `apps/mobile/build-1765846160124.ipa`
  - Build number (CFBundleVersion): `201`
  - EAS submission: https://expo.dev/accounts/hevi35/projects/mandaact/submissions/a1dde88c-3d0c-46e4-b8d5-473c87733141

---

## Reply Template (Resolution Center)

- We fixed the paywall to reliably display subscription plans by falling back to StoreKit product retrieval if RevenueCat Offerings are unavailable.
- We added a retry action for plan loading failures.
- We added the Apple Standard Terms of Use (EULA) link to the App Store Connect App Description.
