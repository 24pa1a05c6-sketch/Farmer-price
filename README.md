# KisanSetu — Farmer Crop Price Tracker & Market Intelligence Platform

> **Tagline:** *Know Your Price. Choose Your Market. Grow Your Profit.*  
> **Geographical Focus:** Andhra Pradesh, India (Guntur, Tadepalligudem, Kakinada, Rajahmundry, Vijayawada, Kurnool, Madanapalle, Adoni) — designed for nationwide extensibility.

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/atlas)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 1. System Architecture

```text
+-------------------------------------------------------------------------+
|                        KISANSETU CLIENT (React + Vite)                  |
|  - Warm Ivory (#F7F4EC) & Deep Forest (#10271F) Glassmorphic UI         |
|  - Complete Auth Experience (Login, Signup, Password Strength Meter)     |
|  - Bilingual Localization (English + Telugu / తెలుగు)                    |
|  - Best Market Finder (Net Earnings & Transport Cost Engine)            |
|  - Recharts Price Trends, Mandi Explorer, Threshold Alerts, Admin Tools |
+------------------------------------+------------------------------------+
                                     | HTTPS / REST API (JWT + HttpOnly Cookie)
                                     v
+-------------------------------------------------------------------------+
|                    KISANSETU SERVER (Node.js + Express)                 |
|  - Auth: bcrypt password hashing, signed JWT, HttpOnly Cookies, RBAC    |
|  - Rate Limiting, Helmet security headers, credentialed CORS            |
|  - Calculation Engine: Deterministic unit conversions (1 Qtl = 100 Kg)   |
|  - Alert Evaluation Engine: Triggers on new records, deduplicates       |
|  - Data Ingestion: Official AGMARKNET API (Data.gov.in) + CSV Importer  |
+------------------+-----------------------------------+------------------+
                   | Mongoose ODM                      | HTTPS GET
                   v                                   v
+------------------------------------+   +--------------------------------+
|      MongoDB Atlas Cluster         |   | Official Data.gov.in AGMARKNET |
|  - Users (Farmers & Admins)        |   | Resource ID:                   |
|  - Crops, Markets, MarketPrices    |   | 9ef84268-d588-465a-a308-       |
|  - PriceAlerts, AuditLogs          |   | a864a43d0070                   |
+------------------------------------+   +--------------------------------+
```

---

## 2. Core Features

### 🔐 1. Complete Farmer Authentication & Security
- **Registration**: Full name, email, phone number, Andhra Pradesh district selector, and password confirmation with real-time strength meter. Public registration safely defaults to the `farmer` role (preventing role escalation attacks).
- **Secure Login**: Email and password authentication verified against salted `bcryptjs` hashes. Show/hide password toggles, remember-me options, and helpful validation feedback.
- **Session Management**: Dual-resilience auth using signed HTTP-only `kisansetu_token` cookies with `SameSite` policies alongside `Authorization: Bearer <token>` Axios interceptors.
- **Session Restoration**: Seamless session hydration via `/api/auth/me` on browser refresh without UI layout flashing.
- **Clean Logout**: Immediate cookie clearance and client state sanitization.

### 🌾 2. Best Market Finder (Signature Calculation Engine)
- **Unit Conversion**: Seamlessly converts `Kg` to `Quintal` (`1 Quintal = 100 Kg`) without duplicate conversions.
- **Transparent Formula**:
  $$\text{Gross Revenue} = \text{Quantity (Quintals)} \times \text{Modal Price (₹/Quintal)}$$
  $$\text{Total Expenses} = \text{Transport Cost} + \text{Hamali / Additional Expenses}$$
  $$\text{Estimated Net Earnings} = \text{Gross Revenue} - \text{Total Expenses}$$
- **Mandi Ranking**: Ranks APMC mandis by **Estimated Net Take-Home Earnings**, proving how a nearby mandi with lower raw price can net higher profits than a distant mandi burdened by heavy transport freight.

### 📊 3. Crop Explorer & Mandi Intelligence
- Filter by Crop, Variety, District, Mandi, Price Range, and Date.
- Real-time unit switching between `₹/Quintal` and `₹/Kg`.
- Provenance tags: `OFFICIAL AGMARKNET`, `MANUALLY VERIFIED`, `DEMO SAMPLE`, and `STALE (> 7 days old)`.

### 📈 4. Historical Trends & Analytics
- Visual interactive charts comparing min, modal, and max prices over 7, 14, and 30-day windows.
- CSV export for on-ground agricultural record-keeping.

### 🔔 5. Price Alerts & Notifications
- Farmers configure target thresholds (`ABOVE_OR_EQUAL` / `BELOW_OR_EQUAL`).
- Alerts trigger automatically when new price observations are posted, with deterministic duplicate-notification prevention.

### 🌐 6. Native Bilingual Localization (English & తెలుగు)
- Comprehensive instant toggle across all views, forms, error alerts, calculations, and tables.

---

## 3. Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Heroicons, Recharts, Axios.
- **Backend**: Node.js, Express 4, Mongoose 8, JWT (`jsonwebtoken`), bcryptjs, Helmet, CORS, Express Rate Limit, Multer, CSV-Parse.
- **Database**: MongoDB Atlas (Cloud).
- **Government Open Data**: Data.gov.in AGMARKNET Daily Mandi Prices API (`Resource: 9ef84268-d588-465a-a308-a864a43d0070`).

---

## 4. Local Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- A MongoDB Atlas account and cluster (or local MongoDB)

### Step 1: Clone the Repository
```bash
git clone https://github.com/24pa1a05c6-sketch/Farmer-price.git
cd Farmer-price
```

### Step 2: Configure and Start the Backend Server
```bash
cd server

# Create your .env from the safe template
cp .env.example .env

# Edit .env with your favorite editor and configure:
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/kisansetu?retryWrites=true&w=majority
# JWT_SECRET=your_super_secret_jwt_key_here

npm install

# Seed initial crops, APMC markets, and sample price data
npm run seed

# Run automated backend test suite (21 tests)
npm test

# Start the Express server (Runs on port 5000)
npm run dev
```

### Step 3: Configure and Start the Frontend Client
```bash
# Open a new terminal window
cd ../client

# Create your client environment configuration
cp .env.example .env

npm install

# Run automated client calculation tests (8 tests)
npm test

# Start the Vite development server (Runs on port 5173)
npm run dev
```

Visit **http://localhost:5173** in your browser!

---

## 5. Environment Variables Reference

### Backend (`server/.env`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Express listening port | `5000` |
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing JWT auth tokens | `64_char_hex_secret` |
| `JWT_EXPIRES_IN` | Token duration | `7d` |
| `COOKIE_SECURE` | Set to true in HTTPS production deployments | `false` (dev) / `true` (prod) |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `DATA_GOV_IN_API_KEY` | Optional Data.gov.in API Key for AGMARKNET | `your_api_key` |

### Frontend (`client/.env`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend API base path | `/api` (uses Vite proxy) |

---

## 6. Automated Testing

### Server Tests (21 Tests)
Covers authentication endpoints, registration validation, duplicate prevention, password hashing, session cookies, and AGMARKNET unit conversions:
```bash
cd server
npm test
```

### Client Tests (8 Tests)
Covers price conversions, Quintal/Kg calculations, and Best Market ranking algorithms:
```bash
cd client
npm test
```

---

## 7. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
