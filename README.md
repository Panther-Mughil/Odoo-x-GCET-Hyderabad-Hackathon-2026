# StockSense - Enterprise Modular Inventory Management System (IMS)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?style=flat&logo=python)](https://python.org)
[![SQLAlchemy](https://img.shields.io/badge/Engine-Double--Entry%20Ledger-D71F00.svg?style=flat)](https://www.sqlalchemy.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modular, real-time Inventory Management System designed to digitize inventory tracking for modern supply chains. Modeled after **Odoo's double-entry stock ledger**, StockSense prevents phantom inventory, enforces ACID transactional integrity, and provides distinct experiences for **Inventory Managers** and **Warehouse Floor Staff**.

---

## 🌟 Key Features

### 1. Double-Entry Stock Ledger
- Every stock movement is an auditable transaction transferring quantities from a **Source Location** to a **Destination Location**.
- Eliminates manual arithmetic stock drift.
- Supports hierarchical physical racks (`Main Warehouse/Production Rack`, `WH1/Rack A`) as well as virtual locations (`Vendors/Incoming`, `Customers/Outgoing`, `Virtual/Loss & Scrap`).

### 2. Full Inventory Lifecycle
- **Receipts (Incoming):** Vendor deliveries, item checks, and automatic stock increments upon validation.
- **Delivery Orders (Outgoing):** Multi-step Pick $\to$ Pack $\to$ Validate flow with stock availability guarantees.
- **Internal Transfers:** Zero net-loss transfers between warehouse zones and assembly racks.
- **Physical Stock Adjustments:** Audit cycle counts, detect discrepancies, and log automated write-offs with reason codes.
- **Audit Move History:** Complete chronological traceability of all ledger movements.

### 3. Role-Based Access Control (RBAC) & Auth
- **Inventory Managers:** Executive dashboard, real-time valuation, min/max reorder alerts, multi-warehouse topology.
- **Warehouse Staff:** Streamlined mobile-first views for fast receiving, picking, scanning, and counting.
- **OTP Password Reset:** Secure 6-digit OTP delivery flow.

### 4. Interactive Real-Time Dashboard & Smart Filters
- KPI cards for Total Products in Stock, Low/Out of Stock items, Pending Receipts, Pending Deliveries, and Scheduled Transfers.
- Dynamic filtering by Document Type, Workflow Status, Warehouse/Location, and Product Category.
- Barcode / SKU quick-scanner simulator for rapid floor operation.

---

## 🏗️ Technology Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn
- **Database:** SQLite / PostgreSQL compatible relational engine
- **Frontend:** Responsive SPA with Glassmorphic enterprise design, CSS variables, Chart.js KPIs, and Mobile Barcode UI
- **Version Control:** Git & GitHub

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/sanjay01261/StockSense.git
cd StockSense
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the development server
```bash
python main.py
```
Open your browser at `http://localhost:8000` to access the application, or `http://localhost:8000/docs` for interactive Swagger API documentation.
