# OMP DEALS — RESTFUL API SPECIFICATION (`API.md`)

## 1. API Architecture & Standards

- **Base URL:** `http://localhost:3001/api/v1` (Production: `https://api.ompdeals.com/v1`)
- **Protocol:** HTTPS / JSON over REST
- **Authentication:** Bearer JWT Token (`Authorization: Bearer <token>`) or Session Cookie
- **Error Format:**
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "The requested vehicle listing does not exist."
    }
  }
  ```

---

## 2. Authentication & Session Endpoints

### 2.1 Authenticate with Credentials
- **Endpoint:** `POST /api/v1/auth/login`
- **Request Body:**
  ```json
  {
    "email": "liaison@automoneyfl.com",
    "password": "SouthFL@2026",
    "roleId": "LIAISON"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-liaison-1",
      "role": "LIAISON",
      "name": "Elena Rostova",
      "email": "liaison@automoneyfl.com",
      "dealershipId": "auto-money-fl",
      "defaultRoute": "/omp/crm/liaison"
    }
  }
  ```

### 2.2 Instant 1-Click Demo Login
- **Endpoint:** `POST /api/v1/auth/quick-demo`
- **Request Body:**
  ```json
  {
    "roleId": "SALES_REP"
  }
  ```
- **Response (200 OK):** Returns demo JWT token and sets active session cookie.

---

## 3. Public Marketplace & Vehicle Inventory Endpoints

### 3.1 Search & Filter Listings
- **Endpoint:** `GET /api/v1/marketplace/listings`
- **Query Parameters:**
  - `category` (string, e.g. `cars-trucks`)
  - `location` (string, e.g. `Fort Lauderdale, FL`)
  - `radius` (integer, e.g. `30`)
  - `bodyStyle` (string, e.g. `Coupe`, `Pickup`, `SUV`)
  - `minPrice` / `maxPrice` (numbers)
  - `q` (string search keyword)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "total": 42,
    "data": [
      {
        "id": "lst-corvette-1",
        "vin": "1G1YC2D40R5102948",
        "title": "2024 Chevrolet Corvette Stingray 2LT Coupe",
        "price": 79900,
        "monthlyEstimate": 849,
        "mileage": 3210,
        "engine": "6.2L V8",
        "exteriorColor": "Rapid Blue",
        "location": "Fort Lauderdale, FL",
        "dealerId": "auto-money-fl",
        "dealerName": "Auto Money Motorcars LLC",
        "images": ["https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800"]
      }
    ]
  }
  ```

### 3.2 Get Auto Money Lot Storefront
- **Endpoint:** `GET /api/v1/dealers/:dealerId/inventory`
- **Parameters:** `dealerId = auto-money`
- **Response (200 OK):** Returns full 42 vehicle units in-stock at 1450 SE 17th St.

---

## 4. 10-Second AI Intent Radar & Lead Generation

### 4.1 Submit Purchase Intent & Phone Consent
- **Endpoint:** `POST /api/v1/leads/intent`
- **Request Body:**
  ```json
  {
    "vehicleId": "lst-corvette-1",
    "dealerId": "auto-money-fl",
    "customerName": "David Miller",
    "phone": "(954) 555-7821",
    "buyingTimeline": "NOW or within 24 hours",
    "phoneConsent": true,
    "sourceRef": "AMP-JESSICA-2026",
    "dwellDurationSeconds": 14
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "leadId": "lead-sf-9021",
    "isBuyNowHot": true,
    "assignedLiaison": "Elena Rostova",
    "status": "New",
    "message": "Qualified BUY NOW lead created. Red blinking alert broadcasted to Liaison Desk."
  }
  ```

---

## 5. Dealership Liaison Triage Desk Endpoints

### 5.1 Fetch Incoming Lead Triage Queue
- **Endpoint:** `GET /api/v1/crm/leads`
- **Headers:** `Authorization: Bearer <LIAISON_TOKEN>`
- **Query Parameters:** `status=New&dealerId=auto-money-fl`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "totalLeads": 8,
    "buyNowCount": 2,
    "leads": [
      {
        "id": "lead-sf-9021",
        "customerName": "David Miller",
        "phone": "(954) 555-7821",
        "vehicleTitle": "2024 Chevrolet Corvette Stingray 2LT",
        "price": "$79,900",
        "buyingTimeline": "NOW or within 24 hours",
        "isBuyNow": true,
        "createdAt": "2026-09-29T13:45:00Z",
        "expiresInHours": 23.5,
        "assignedTo": null,
        "status": "New"
      }
    ]
  }
  ```

### 5.2 Assign Lead to Sales Staff
- **Endpoint:** `PATCH /api/v1/crm/leads/:id/assign`
- **Request Body:**
  ```json
  {
    "assigneeRole": "SALES_REP",
    "assigneeUserId": "usr-tony-rep",
    "assigneeName": "Tony Ramirez",
    "liaisonNotes": "Customer ready to buy today, check trade-in for Civic."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "leadId": "lead-sf-9021",
    "status": "Assigned",
    "assignedTo": "Tony Ramirez",
    "updatedAt": "2026-09-29T13:50:00Z"
  }
  ```

---

## 6. Sales Rep Direct Calling & Sales Notes Endpoints

### 6.1 Log Call Activity
- **Endpoint:** `POST /api/v1/crm/calls/log`
- **Request Body:**
  ```json
  {
    "leadId": "lead-sf-9021",
    "repUserId": "usr-tony-rep",
    "callDisposition": "Connected - Test Drive Scheduled",
    "durationSeconds": 142,
    "scheduledTestDrive": "2026-09-29T16:00:00Z"
  }
  ```
- **Response (200 OK):** Updates lead record and increments rep call metrics.

### 6.2 Append Timestamped Sales Note
- **Endpoint:** `POST /api/v1/crm/leads/:id/notes`
- **Request Body:**
  ```json
  {
    "authorId": "usr-tony-rep",
    "authorName": "Tony Ramirez (Sales Rep)",
    "content": "Spoke with David. He is bringing his 2018 Civic for trade-in inspection at 4:00 PM."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "noteId": "note-881",
    "timestamp": "2026-09-29T13:55:12Z"
  }
  ```

---

## 7. 60-Second Desking Deal Calculator Endpoints

### 7.1 Calculate Retail Installment Contract
- **Endpoint:** `POST /api/v1/desking/calculate`
- **Request Body:**
  ```json
  {
    "sellingPrice": 79900,
    "downPayment": 15000,
    "tradeAllowance": 12000,
    "tradePayoff": 5000,
    "termMonths": 60,
    "apr": 5.99,
    "docFee": 899,
    "taxRatePercent": 6.0
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "amountFinanced": 61245.50,
    "monthlyPayment": 1184.22,
    "totalInterest": 9807.70,
    "totalPayments": 71053.20,
    "dealerReserve": 1250.00
  }
  ```

---

## 8. Auto Sales AMP Affiliate Endpoints

### 8.1 Track Campaign Click
- **Endpoint:** `POST /api/v1/amp/clicks`
- **Request Body:**
  ```json
  {
    "refCode": "AMP-JESSICA-2026",
    "targetPath": "/cars-trucks",
    "referrer": "instagram.com"
  }
  ```
- **Response (200 OK):** Sets 30-day attribution tracking token.

### 8.2 Get Affiliate Performance Dashboard
- **Endpoint:** `GET /api/v1/amp/stats`
- **Headers:** `Authorization: Bearer <AMP_TOKEN>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "affiliateName": "Jessica Morales",
    "campaignCode": "AMP-JESSICA-2026",
    "totalClicks": 348,
    "qualifiedLeads": 18,
    "carsSold": 4,
    "commissionPerSale": 250,
    "totalCommissionEarned": 1000,
    "payoutStatus": "Paid to Direct Deposit"
  }
  ```

---

## 9. Police Safe Spots & Insured Shipping Endpoints

### 9.1 Police Safe Spots Directory
- **Endpoint:** `GET /api/v1/safety/police-safe-spots`
- **Query:** `city=Fort+Lauderdale&state=FL`
- **Response (200 OK):** Returns verified police station parking bays with address and 24/7 video surveillance status.

### 9.2 Insured Doorstep Freight Estimator
- **Endpoint:** `POST /api/v1/shipping/estimate`
- **Request Body:**
  ```json
  {
    "originZip": "33316",
    "destinationZip": "75001",
    "vehicleWeightClass": "Class 1-3",
    "carrierType": "Enclosed"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "distanceMiles": 1320,
    "estimatedDays": 4,
    "shippingPrice": 1240.00,
    "transitInsuranceIncluded": true
  }
  ```
