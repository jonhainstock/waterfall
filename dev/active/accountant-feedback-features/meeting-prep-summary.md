# Accountant Meeting Prep - Quick Reference

**Purpose:** Get clarity on feature priorities and requirements

---

## 🎯 Top 5 Critical Questions (Must Ask)

### 1. Feature Priority
**Question:** "Of the three features we discussed (Initial Transaction JE, Date Picker/Search, Zero Balance Filtering), which should we build first?"

**Why:** Determines development order and resource allocation.

---

### 2. Initial Transaction Timing
**Question:** "When should initial transactions be posted - automatically during import, or manually after review?"

**Why:** Affects UX design and workflow significantly.

**Follow-up:** "What's your typical volume? Do most contracts use the same clearing account?"

Either an integration with Stripe - A2X or post clearing account entry out of Stripe Clearing account and deferred revenue account - Cinder (Stripe Transactions), Finaloop, Trade spend
Get the invoice into QuickBooks
Integrate with Stripe, first half of the journal entry.  
Deferred revenue balance - transactions
95% Quickbooks
---

### 3. Zero Balance Definition
**Question:** "When you mentioned 'zero balances fall off the view' - do you mean contracts with zero balance in the selected date range, or contracts that are fully recognized (all-time zero)?"

**Why:** This is ambiguous in the current plan and affects implementation.

Date selection and only present data that is non zero, historicals, 

---

### 4. Clearing Account Approach
**Question:** "Do your clients typically use a single clearing account (like 'Stripe Clearing'), or do they vary by payment method?"

**Why:** Determines if we need per-contract selection or just organization-level default.

---

### 5. Workflow Volume & Patterns
**Question:** "What's your typical workflow? How many contracts do you import at once, and how often do you post?"

**Why:** Helps prioritize bulk operations vs. individual actions.

Monthly process flow, monthly cadence, defferred revenue software schedule, add new invoices, make a single journal entry for deferred - tie out deferred - P&L and Balance sheet, new contracts coming into deferred revenue have to have a tie out GL 

---

## 📋 Quick Decision Checklist

Use this during the meeting to capture key decisions:

### Feature Priority
- [ ] Feature 1 (Initial Transaction) - Priority: ___ (1-3)
- [ ] Feature 2 (Date Picker & Search) - Priority: ___ (1-3)
- [ ] Feature 3 (Zero Balance Filtering) - Priority: ___ (1-3)

### Initial Transaction
- [ ] Timing: [ ] Auto on import [ ] Manual [ ] Both options
- [ ] Clearing Account: [ ] Single default [ ] Per-contract selection [ ] Both
- [ ] Bulk Operations: [ ] Needed [ ] Not needed

### Zero Balance
- [ ] Definition: [ ] Period-specific [ ] All-time [ ] Both
- [ ] Default: [ ] Show all [ ] Hide zeros

### Search & Filtering
- [ ] Search scope: [ ] Customer + Invoice [ ] Also description
- [ ] Date presets: Which ones? ___

---

## 💡 Context to Share

Before asking questions, briefly share:

1. **Current Status:** "We've planned three features based on your feedback..."
2. **Approach:** "We're thinking of implementing them in phases, starting with..."
3. **Open Questions:** "We have a few clarifying questions to make sure we build the right thing..."

---

## 🎤 Meeting Flow Suggestion

1. **Opening (2 min):** Recap the three features from previous feedback
2. **Priority Discussion (5 min):** Which feature first?
3. **Feature 1 Deep Dive (10 min):** Initial Transaction - timing, clearing account, workflow
4. **Feature 2 & 3 Quick Review (5 min):** Search/date picker and zero balance - clarify definitions
5. **Workflow Questions (5 min):** Volume, patterns, edge cases
6. **Wrap-up (3 min):** Confirm priorities, next steps

**Total: ~30 minutes**

---

## 📝 Notes Template

**Date:** ___  
**Key Decisions:**
1. Priority order: ___
2. Initial transaction: ___
3. Zero balance: ___
4. Clearing account: ___

**Next Steps:**
1. ___
2. ___

**Follow-up:**
- [ ] Send meeting summary
- [ ] Update plan based on decisions
- [ ] Schedule next review

---

## 🔗 Reference Documents

- Full question list: `accountant-meeting-questions.md`
- Feature plan: `accountant-feedback-plan.md`
- Context: `accountant-feedback-context.md`


