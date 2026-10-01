# BACKEND API MATRIX

| Menu | Method | Endpoint | Auth | Role | Request | Response | Prisma Model | Status |
|---|---|---|---|---|---|---|---|---|
| Auth | POST | `/api/v1/auth/login` | No | Any | email, password, roleId | token, user | User | Pending |
| Auth | POST | `/api/v1/auth/quick-demo` | No | Any | roleId | token | User | Pending |
| Marketplace | GET | `/api/v1/marketplace/listings` | No | Any | Query: category, location, minPrice, maxPrice | listings array | Vehicle | Pending |
| Marketplace | GET | `/api/v1/dealers/:dealerId/inventory` | No | Any | Params: dealerId | listings array | Vehicle | Pending |
| Leads | POST | `/api/v1/leads/intent` | No | Any | vehicleId, customerName, phone, timeline | leadId, status | Lead | Pending |
| Liaison | GET | `/api/v1/crm/leads` | Yes | LIAISON, DEALER_PRO | Query: status, dealerId | leads array | Lead | Pending |
| Liaison | PATCH | `/api/v1/crm/leads/:id/assign` | Yes | LIAISON, DEALER_PRO | assigneeRole, assigneeUserId | lead status | Lead, User | Pending |
| Sales Rep | POST | `/api/v1/crm/calls/log` | Yes | SALES_REP, MGR | leadId, repUserId, disposition | status | CallLog, Lead | Pending |
| Sales Rep | POST | `/api/v1/crm/leads/:id/notes` | Yes | SALES_REP, MGR | content | note details | SalesNote, Lead | Pending |
| Manager | POST | `/api/v1/desking/calculate` | Yes | SALES_MGR, DEALER_PRO | sellingPrice, downPayment, term, apr | payment, reserve | N/A (Calc) | Pending |
| AMP | POST | `/api/v1/amp/clicks` | No | Any | refCode | status | AffiliateLink | Pending |
| AMP | GET | `/api/v1/amp/stats` | Yes | AMP_AFFILIATE | None | clicks, commissions | AffiliateLink, Commission | Pending |
| Safety | GET | `/api/v1/safety/police-safe-spots` | No | Any | city, state | safe spots list | PoliceSafeSpot | Pending |
| Safety | POST | `/api/v1/shipping/estimate` | No | Any | originZip, destZip, class | price | N/A (Calc) | Pending |
