# Badge Deletion Impact - Quick Summary

**TL;DR**: Badges should remain permanently unlocked even when mandalarts are deleted. Current system already works this way - no code changes needed.

---

## Critical Finding

**ALL 20 badges depend on check_history data**, which cascade deletes when mandalarts are deleted.

## The Problem

```
User earns "100회 실천" badge → Deletes mandalart → check_history count drops to 0
→ Badge still shows as unlocked, but progress shows 0/100
→ Is this a bug or intended behavior?
```

## The Answer: Feature, Not Bug

**Recommendation**: Keep badges permanently (Option A)

### Why?

1. **User Psychology**: Losing achievements demotivates users (research-backed)
2. **Industry Standard**: Steam, Xbox, PlayStation, Duolingo all use permanent badges
3. **Zero Cost**: Current system already works this way
4. **Simple Mental Model**: "Badges are trophies for past accomplishments"

### Trade-offs

- Pro: Positive user experience, no punishment feeling
- Con: Technical inconsistency (badge unlocked but progress = 0%)
- Resolution: Benefits >> drawbacks

## Implementation

**Database Changes**: None required ✅  
**Code Changes**: None required ✅  
**UI Changes**: Optional clarification text

### Optional UI Enhancement

```typescript
// Badge detail dialog
if (isUnlocked && currentProgress === 0) {
  showNote("This badge represents a past accomplishment and remains unlocked permanently.")
}
```

## Alternative: Hybrid Model (Option C)

If you prefer technical consistency:

- **Permanent badges** (17): Never revoke
- **Monthly badges** (3): Can be lost if mandalart deleted mid-month

**Complexity**: Medium (2-3 days implementation)  
**Recommendation**: Not worth the effort vs user experience cost

---

## Badge Dependency Breakdown

| Category | Count | check_history Dependent? |
|----------|-------|-------------------------|
| Beginner | 3 | ✅ 100% |
| Intermediate | 7 | ✅ 100% |
| Advanced | 5 | ✅ 100% |
| Monthly (repeatable) | 3 | ✅ 100% |
| Secret | 2 | ✅ 100% |
| **TOTAL** | **20** | **✅ 100%** |

## Edge Cases Handled

1. **Delete all mandalarts**: Badges stay, progress shows 0%
2. **Delete one of multiple**: Badges stay, progress may still show from other mandalarts
3. **Monthly badges + deletion**: Can't re-earn that month, fresh start next month

---

## Action Items

- [x] Accept current behavior (permanent badges)
- [ ] Optional: Add UI clarification on badge detail page
- [ ] Optional: Add FAQ entry about badge permanence
- [ ] Monitor user feedback

**Status**: No changes required, document and monitor ✅

---

For detailed analysis, see: `BADGE_DELETION_IMPACT_ANALYSIS.md`
