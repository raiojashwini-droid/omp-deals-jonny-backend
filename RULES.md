# OMP DEALS — SYSTEM BUSINESS RULES & OPERATIONAL GOVERNANCE (`RULES.md`)

## 1. Architectural Separation Rules

### RULE-SYS-01: Absolute Independence from CRM nErgy
- **Mandate:** OMP Deals Marketplace must remain a completely separate repository, runtime, and database from CRM nErgy.
- **Enforcement:**
  - Zero network requests to `http://localhost:3000` or any external CRM nErgy SSO gateway.
  - Zero database foreign keys or cross-schema linkages with CRM nErgy tables.
  - All dealership CRM tools (Liaison Desk, Rep Inbox, Manager Dashboard, Desking Calculator) must run natively within the OMP Deals application.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Route / Module | `GUEST` (Buyer) | `LIAISON` (Platform Mgr) | `SALES_REP` (Floor Sales) | `SALES_MGR` (Floor Lead) | `DEALER_PRO` (Auto Money GM) | `BROKER` (Negotiator) | `AMP_AFFILIATE` (Partner) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Public Website (`/`, `/about`, `/contact`) | **Full** | **Full** | **Full** | **Full** | **Full** | **Full** | **Full** |
| Auto Money Storefront (`/omp/dealer/auto-money`) | **Full** | **Full** | **Full** | **Full** | **Full** | **Full** | **Full** |
| Liaison Triage Desk (`/omp/crm/liaison`) | ❌ | **Full (RW)** | ❌ | Read-Only | Read-Only | ❌ | ❌ |
| Sales Rep Inbox (`/omp/crm/rep-inbox`) | ❌ | Read-Only | **Full (RW)** | **Full (RW)** | Read-Only | ❌ | ❌ |
| Sales Manager Floor (`/omp/crm/manager`) | ❌ | Read-Only | ❌ | **Full (RW)** | **Full (RW)** | ❌ | ❌ |
| Auto Broker Desk (`/omp/crm/broker`) | ❌ | Read-Only | ❌ | ❌ | ❌ | **Full (RW)** | ❌ |
| Auto Sales AMP Portal (`/omp/crm/amp`) | ❌ | Read-Only | ❌ | ❌ | ❌ | ❌ | **Full (RW)** |
| 60s Desking Calculator (`/omp/desking/calculator`) | ❌ | Read-Only | Read-Only | **Full (RW)** | **Full (RW)** | ❌ | ❌ |
| DMS Feed Sync (`/omp/feed-sync`) | ❌ | Read-Only | ❌ | ❌ | **Full (RW)** | ❌ | ❌ |

---

## 3. Lead Generation & 10-Second AI Radar Rules

### RULE-RADAR-01: Trigger Conditions
1. User must be on an Auto Money vehicle listing or dealer lot page (`/omp/dealer/auto-money` or `/listing/:id`).
2. Continuous active engagement (mouse movement, scroll, touch, or active viewport) for **exactly 10 seconds**.
3. If the user dismisses the modal without submitting, suppress re-triggering for that session for **24 hours** via `localStorage` session flag.

### RULE-RADAR-02: Purchase Intent Qualification
The modal must require the user to classify their purchase timeframe into one of four immutable tiers:
1. **`NOW or within 24 hours`** -> Triggers Priority 1 `BUY NOW` status.
2. **`Within 2-5 days`** -> Triggers Priority 2 `High Intent` status.
3. **`1 week`** -> Triggers Priority 3 `Standard Qualified` status.
4. **`Just Browsing`** -> Triggers Priority 4 `Informational / Nurture` status.

### RULE-RADAR-03: TCPA Phone Consent Mandate
- Phone number input is optional unless the user requests a callback or price quote.
- If phone number is supplied, the consent checkbox is **mandatory**:
  *"I consent to receive calls and text messages from Auto Money Motorcars LLC regarding this vehicle."*
- Unconsented phone numbers must NOT be passed to the Click-to-Call dialer.

---

## 4. Lead Triage & SLA Escalation Rules

### RULE-TRIAGE-01: BUY NOW Red Blinking Alert
- Any lead tagged with `NOW or within 24 hours` must display a **CSS red blinking pulse indicator** (`#ef4444`) on both the Liaison Desk and the assigned Sales Rep Inbox.
- **Service Level Agreement (SLA):**
  - Time-to-First-Dial SLA: **5 minutes**.
  - If a `BUY NOW` lead is uncontacted after 15 minutes, an escalation notification is dispatched to the Sales Manager (Carlos Vega).

### RULE-TRIAGE-02: 24-Hour Expiration Countdown
- Every newly arrived lead features a countdown timer of 24 hours.
- If a lead is not accepted or contacted within 24 hours, its status changes to `Expired / Requires Re-engagement`.

### RULE-TRIAGE-03: Assignment Ownership
- Only the Dealership Liaison (`LIAISON`) or General Manager (`DEALER_PRO`) can assign or reassign leads.
- A lead can have exactly one primary owner (`assigned_rep_id`) at any given time.

---

## 5. Sales Rep Governance & Call Logging Rules

### RULE-REP-01: Mandatory Call Disposition
- Clicking the Click-to-Call action must trigger the native dialer and prompt the rep for a post-call disposition:
  - `Connected - Test Drive Scheduled`
  - `Connected - Pricing Discussed`
  - `Left Voicemail`
  - `No Answer / Busy`
  - `Wrong Number / Inactive`
- Rep cannot close the call log modal without selecting a disposition.

### RULE-REP-02: Immutability of Sales Notes
- Every sales note entry is timestamped in UTC and tagged with the author's user ID and role.
- Once committed, a sales note cannot be edited or deleted by the salesperson (append-only log for audit integrity).

---

## 6. Auto Sales AMP (Affiliate) Rules

### RULE-AMP-01: Referral Tracking & Cookie Window
- When a user enters via an AMP affiliate referral link (`?ref=AMP-XYZ`), a tracking token is stored for **30 days**.
- The referral attribution follows a **Last-Click Model**.

### RULE-AMP-02: Commission Payout Criteria
- Flat rate: **$250.00 USD per verified retail car purchase**.
- Commission status transitions:
  - `Tracked Click` -> Lead created with `ref_code`.
  - `Pending Payout` -> Customer signs contract and pays down payment.
  - `Approved / Paid` -> Deal funded by lender and vehicle delivered off lot.
- Self-referrals by dealership employees or fraud rings are strictly disqualified.

---

## 7. Inventory & Zero-Ghost-Listing Rules

### RULE-INV-01: DMS Sync Frequency
- Public lot inventory must synchronize with Auto Money's CDK / Frazer DMS feed every **60 seconds**.
- If a vehicle's status changes to `SOLD` or `OFF_LOT` in the DMS, it must be removed from public search results immediately.
- Vehicles marked `PENDING_SALE` remain visible with a yellow "Deposit Placed" badge.

---

## 8. Police Safe Spots Protocol Rules

### RULE-SAFE-01: Off-Site Safety Compliance
- For private party vehicle sales or offsite consumer test drives:
  - Exchange must take place at an active, registered **Police Safe Spot** (1,600+ participating police station parking lots).
  - Recommended hours: Monday – Sunday, **8:00 AM – 8:00 PM** (daylight / lighted hours).
  - High-value cash transactions must utilize the police lobby or designated safe exchange bay under 24/7 video recording.
