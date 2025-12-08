# Premium Subscription Pricing Plan

> **Date**: 2025-12-07
> **Status**: **Confirmed** ($3.99 USD)

## 1. Core Pricing (KRW)
*   **Target Price**: **4,900 KRW / Month**
*   **Psychological Identity**: "Coffee Price" (커피 한 잔 값).
*   **Market Positioning**: Affordable productivity tool. High accessibility.

## 2. USD Pricing Strategy
Apple's App Store allows independent pricing updates, but generally follows "Tier" conventions.
Current Exchange Rate (approx.): $1 USD = 1,400 KRW.

### Selected Option: **$3.99 USD** (Standard / Balanced)
*   **Converted**: ~$5,600 KRW
*   **Pros**: 
    - Standard "Tier 4" equivalent.
    - Slightly higher revenue per user.
    - Matches the "under $4" psychological barrier, similar to "under 5000 won".
*   **Cons**: Slightly more expensive (~15%) than KRW price.

## 3. Decision
**Final Decision: $3.99 USD**
*   **Rationale**: The "3.99" tag is the standard psychological equivalent to "4900". In purchasing power terms, $3.99 in the US feels very similar to 4900 KRW in Korea (nominal coffee index).
*   **Display**: "Less than a cup of coffee" marketing works for both.

*   **Display**: "Less than a cup of coffee" marketing works for both.

## 4. Annual Tier Strategy (연간 구독)
**Recommendation**: **YES, Highly Recommended.**
*   **Reason**: Secures long-term retention and upfront cashflow. Prevents efficient churn (users trying for 1 month and leaving).

### Pricing Options (Anchor: $3.99/mo -> $47.88/yr)

#### Option A: **$29.99 USD** (Aggressive / Best Value)
*   **Discount**: ~37% off (Equivalent to ~$2.50/mo).
*   **Strategy**: "Irresistible Deal". Maximizes conversion volume.
*   **KRW**: ~39,000 Won.

#### Option B: **$39.99 USD** (Standard)
*   **Discount**: ~16% off (2 months free).
*   **Strategy**: Maximizes revenue per user. Standard industry discount.
*   **KRW**: ~55,000 Won.

### Recommendation: **$29.99 USD**
*   **Why**: As a new utility app, **Lock-in (Retention)** is more critical than maximizing margin. $29.99 feels like a "light" decision compared to $39.99.

## 5. Lifetime Tier Consideration (평생권)
**Question**: Should we offer a "One-time Purchase" (Lifetime)?

### Analysis
*   **Pros (Why add it?)**:
    *   **Cash Injection**: High upfront revenue ($49~$99).
    *   **Conversion**: Appeals to users who hate subscriptions ("Subscription Fatigue").
    *   **Simplicity**: No churn management.
*   **Cons (Risks)**:
    *   **Ongoing AI Costs**: AI Reports incur recurring API costs (OpenAI/Gemini). A lifetime user generates costs forever without new revenue.
    *   **LTV Cap**: Limits the long-term revenue potential per user.

### Recommendation
**Verdict**: **Recommendation: Skip for Launch (Initial Release)**
*   **Reason**: MandaAct relies on AI features which have real recurring costs. Validating the "Cost per User" (unit economics) with monthly subs first is safer.
*   **Alternative**: If confirmed, set a high price (e.g., **$59.99**, approx. 15-18 months of sub value) to cover potential future AI costs.

## 5. Implementation Checklist
- [ ] Configure In-App Purchase in App Store Connect
    - [ ] Type: Auto-Renewable Subscription
    - [ ] Duration: 1 Month
    - [ ] KRW Price: 4,900 Won
    - [ ] USD Price: $3.99
    - [ ] Free Trial: 7 Days (Optional but recommended)
- [ ] Backend Validation (Supabase/RevenueCat)

## 4. Implementation Checklist
- [ ] Configure In-App Purchase in App Store Connect
    - [ ] Type: Auto-Renewable Subscription
    - [ ] Duration: 1 Month
    - [ ] KRW Price: 4,900 Won
    - [ ] USD Price: $3.99
    - [ ] Free Trial: 7 Days (Optional but recommended)
- [ ] Backend Validation (Supabase/RevenueCat)
