# BACKEND IMPLEMENTATION PLAN

## 1. Existing backend architecture
- Currently, only `server.js` exists as an entry point.
- Standard folders need to be mapped: `src/routes`, `src/controllers`, `src/services`, `src/middleware`, `src/utils`.

## 2. Existing Prisma schema summary
- Fully configured and aligned with ERD from DATABASE.md.
- Contains all roles (GUEST, LIAISON, SALES_REP, SALES_MGR, DEALER_PRO, BROKER, AMP_AFFILIATE, EXECUTIVE_ADMIN, MEMBER).
- Contains core modules: `User`, `Store`, `Vehicle`, `Lead`, `Deal`, `CallLog`, `SalesNote`, `AffiliateLink`, `Commission`, `Message`, `DMSFeed`, `ReconTicket`, `VehiclePhoto`, `SocialPost`, `ROIReport`, `Expense`, `Lender`, `BHPHAccount`, `PoliceSafeSpot`.

## 3. Existing API inventory
- Existing project routes need to be implemented properly with Express routers.

## 4. Required API inventory from API.md
- **Auth:** `POST /api/v1/auth/login`, `POST /api/v1/auth/quick-demo`
- **Marketplace:** `GET /api/v1/marketplace/listings`, `GET /api/v1/dealers/:dealerId/inventory`
- **Leads:** `POST /api/v1/leads/intent`
- **Liaison:** `GET /api/v1/crm/leads`, `PATCH /api/v1/crm/leads/:id/assign`
- **Sales Rep:** `POST /api/v1/crm/calls/log`, `POST /api/v1/crm/leads/:id/notes`
- **Desking:** `POST /api/v1/desking/calculate`
- **AMP Affiliate:** `POST /api/v1/amp/clicks`, `GET /api/v1/amp/stats`
- **Safety/Shipping:** `GET /api/v1/safety/police-safe-spots`, `POST /api/v1/shipping/estimate`

## 5. Menu inventory
1. Authentication & Session
2. Marketplace & Discovery
3. 10-Second AI Radar & Lead Generation
4. Dealership Liaison Triage Desk
5. Sales Rep CRM Inbox
6. Sales Manager Floor & Desking
7. Auto Sales AMP Portal
8. Trust & Safety

## 6. Implementation order
1. **Authentication & Session**
2. Marketplace & Discovery
3. AI Radar & Lead Generation
4. Liaison Triage Desk
5. Sales Rep Inbox
6. Manager Desking
7. AMP Portal
8. Trust & Safety
