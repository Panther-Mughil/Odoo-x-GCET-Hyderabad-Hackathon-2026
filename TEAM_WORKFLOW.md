# 👥 StockSense — 3-Member Team Division & Implementation Roadmap

To win this hackathon, we divide the project into **3 clearly isolated, parallel tracks** so no two members block each other. Each member owns an essential piece with defined inputs and outputs.

---

```
                       ┌─────────────────────────────────────────────────────┐
                       │               StockSense IMS Project                │
                       └─────────────────────────────────────────────────────┘
                                   │                   │
         ┌─────────────────────────┴─────────┐         └─────────────────────────┐
         ▼                                   ▼                                   ▼
┌───────────────────┐               ┌───────────────────┐               ┌───────────────────┐
│     MEMBER 1      │               │     MEMBER 2      │               │     MEMBER 3      │
│  Backend, Engine  │               │   Operations &    │               │  Frontend UI/UX,  │
│    & DB Models    │               │  Business Logic   │               │ Dashboard & Flow  │
└───────────────────┘               └───────────────────┘               └───────────────────┘
```

---

## 🧑‍💻 Member 1: Core Backend, Database Models & Double-Entry Engine

> **Focus:** Data integrity, relational schemas, ACID-compliant ledger transactions, and authentication.

### Key Responsibilities & Deliverables:
1. **Database Schema & ORM Setup (`app/database.py`, `app/models.py`)**:
   - `User` table (with roles: `inventory_manager`, `warehouse_staff`).
   - `Warehouse` & `Location` tables with hierarchical full paths (`WH1/Main Store`, `WH1/Production Rack`, `Vendors/Incoming`, `Customers/Outgoing`, `Virtual/Loss`).
   - `Product` & `Category` tables (SKU, UoM, cost, sale price, `min_reorder_qty`, `target_stock_qty`).
   - `OperationDocument` & `StockMove` tables (Source Location -> Destination Location ledger).
2. **Double-Entry Ledger Core Engine (`app/services/ledger.py`)**:
   - Function: `execute_stock_move(db, source_loc, dest_loc, product_id, qty, doc_id, user_id)`.
   - Function: `get_location_stock(db, location_id, product_id)` (calculating sum(in) - sum(out)).
   - Strict validation preventing negative stock in physical locations unless explicitly permitted.
3. **Authentication & OTP Security (`app/routers/auth.py`)**:
   - User Registration, Login (JWT Token creation).
   - OTP Generation & 10-minute expiry verification for password reset.
   - Role-Based Access Control (RBAC) middleware / dependency guards.

---

## 🧑‍💻 Member 2: Operations Workflows, Business Logic & APIs

> **Focus:** Document lifecycles, transactional validation, and search/filter/KPI aggregation APIs.

### Key Responsibilities & Deliverables:
1. **Receipts (Incoming Goods) Workflow (`app/routers/receipts.py`)**:
   - Create receipt in `Draft` -> Add supplier & lines -> Mark `Ready` -> Click `Validate`.
   - On validate: Automatically trigger ledger moves from `Vendors/Incoming` -> Warehouse destination.
2. **Delivery Orders (Outgoing Goods) Workflow (`app/routers/deliveries.py`)**:
   - Create delivery order -> Reserve stock -> Step-by-step `Pick` -> `Pack` -> `Validate`.
   - On validate: Trigger ledger moves from Warehouse location -> `Customers/Outgoing`.
3. **Internal Transfers & Stock Adjustments (`app/routers/transfers.py`, `app/routers/adjustments.py`)**:
   - Internal Transfer: Move stock between `Main Store` -> `Production Rack` or `Rack A` -> `Rack B` (Zero net change to total stock).
   - Stock Adjustments: Record physical audit count vs ledger count -> automatically write off difference to `Virtual/Loss & Scrap`.
4. **Analytics, KPIs & Dynamic Multi-Filter API (`app/routers/dashboard.py`)**:
   - Aggregation endpoint for the 5 key dashboard metrics:
     1. Total Products in Stock
     2. Low / Out of Stock alerts
     3. Pending Receipts count
     4. Pending Deliveries count
     5. Internal Transfers scheduled
   - 4-way filter endpoint: by Document Type, Status, Warehouse/Location, and Category.

---

## 🧑‍💻 Member 3: Modern Frontend UI/UX, Dashboard & Floor Operations

> **Focus:** Stunning visual aesthetics, Glassmorphic responsive interface, mobile warehouse experience, and live interactivity.

### Key Responsibilities & Deliverables:
1. **Design System & Executive Dashboard (`frontend/index.html`, `frontend/css/style.css`)**:
   - Sleek enterprise UI with dark/light mode toggle and vibrant color accents.
   - Interactive KPI cards with real-time counters and status badges.
   - Chart.js visualizations (Stock distribution by category, operation volume by type).
   - Dynamic 4-way filter bar (Type, Status, Warehouse, Category) with instant table filtering.
2. **Operational Modals & Forms (`frontend/js/operations.js`)**:
   - Modal for creating New Receipts (with vendor and line items).
   - Modal for Delivery Orders with interactive `Pick`, `Pack`, and `Validate` buttons.
   - Modal for Internal Transfers (Source rack -> Destination rack selector).
   - Modal for Stock Adjustments with automatic difference calculation.
3. **Warehouse Floor View & Barcode / SKU Scanner (`frontend/js/scanner.js`)**:
   - Mobile-responsive layout tailored for warehouse staff tablets/smartphones.
   - Interactive barcode / SKU scanner simulation (type or tap SKU to instantly reveal on-hand quantity across all racks).
4. **Auth & Profile Management (`frontend/js/auth.js`)**:
   - Sign up / Sign in view with role selector badge.
   - OTP Password Reset modal with instant code entry.
   - Left sidebar with active user profile & one-click logout.

---

## 🔄 Integration Timeline (Hackathon Schedule)

| Phase | Milestone | Deliverable |
| :--- | :--- | :--- |
| **Hour 1** | **Foundation** | Member 1 establishes DB schemas & ledger logic; Member 2 creates API contracts; Member 3 builds the layout & design system. |
| **Hour 2** | **Workflows** | Member 2 hooks up Receipts, Deliveries, and Transfers to Member 1's engine; Member 3 builds the operational forms. |
| **Hour 3** | **Integration** | Connect UI to FastAPI backend endpoints. Populate with demo dataset (100 kg Steel flow from problem statement). |
| **Hour 4** | **Polish & Demo Prep** | Mobile testing, Barcode scanner validation, commit & push to GitHub repository with comprehensive README. |
