<div align="center">

# 💊 PharmaLoop

### Pharmaceutical Reverse-Chain Compliance Platform  
### From Expired Medicine to Verified Disposal

<p>
Create Batches • Sell Downstream • Return Expired Stock • Verify Quantities • Dispose & Close • Settle Credits
</p>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

<br>

<img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=700&size=22&pause=1000&color=0F766E&center=true&vCenter=true&width=900&lines=Digital+Batch+Passport+%26+Audit+Trail;Manufacturer+%E2%86%92+Distributor+%E2%86%92+Pharmacy+Sell+Chain;Expired+Return+%E2%86%92+Verify+%E2%86%92+Dispose+%E2%86%92+Close;Role-Based+Dashboards+(Pharmacy+%7C+Distributor+%7C+Manufacturer+%7C+Admin);MongoDB+Atlas+%2B+Deploy+on+Render">

</div>

---

# 📖 About

**PharmaLoop** is an end-to-end pharmaceutical reverse-logistics and compliance platform. It tracks medicines from **manufacturer warehouse** through **distributor** and **pharmacy**, then closes the loop when expired, near-expiry, or unused stock is **returned, verified, quarantined, disposed, and settled**—with a digital **batch passport**, discrepancy alerts, and regulator oversight.

---

# ✨ Key Features

## 🏠 Product Experience

| Module | Description |
|--------|-------------|
| 🔐 Auth & RBAC | JWT login — Pharmacy, Distributor, Manufacturer, Admin |
| 🏭 Add Medicine | Manufacturer creates unique **batch numbers** + warehouse stock |
| 📦 Forward Sell | Manufacturer → Distributor → Pharmacy → retail sell |
| 🔁 Return Requests | Pharmacy submits expired / near-expiry / damaged returns |
| 🔍 Scan & Verify | Distributor confirms quantities; flags discrepancies |
| 🚚 Pickup & Manifest | Pickup → consolidate → dispatch to manufacturer |
| 🧪 Quarantine & Disposal | Receive → quarantine → dispose → evidence → reconcile → close |
| 💳 Settlements | Credits / payments after verified reverse chain |
| 🛂 Batch Passport | Full timeline: manufacture, sales, returns, disposal |
| 📱 Scan Medicine | Passport lookup + possible **re-entry** alert |
| 🔔 Notifications | Header bell for role-relevant events |
| 🛡️ Admin Console | Orgs, users, returns, discrepancies, audit, AI alerts |

---

## 🔁 Operations Workflows

### Forward chain (create → sell)

```text
MANUFACTURER ADDS MEDICINE (batch no + qty)
      ↓
SELL TO DISTRIBUTOR
      ↓
SELL TO PHARMACY
      ↓
PHARMACY RETAIL SALE
      ↓
BATCH PASSPORT UPDATED
```

### Reverse chain (return → dispose)

```text
EXPIRED / NEAR-EXPIRY STOCK AT PHARMACY
      ↓
RETURN REQUEST (RETURN_REQUESTED)
      ↓
DISTRIBUTOR SCAN & VERIFY (± discrepancy)
      ↓
PICKUP → CONSOLIDATE → DISPATCH MANIFEST
      ↓
MANUFACTURER RECEIVE → QUARANTINE
      ↓
DISPOSAL → EVIDENCE → QUANTITY RECONCILE
      ↓
VERIFY DESTRUCTION → CLOSE BATCH / RETURN
      ↓
SETTLEMENT CREDIT → PHARMACY
      ↓
SCAN / RE-ENTRY MONITORING (Admin + Pharmacy)
```

---

# 🛠 Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19 · Vite · Tailwind CSS v4 · React Router · Recharts · Lucide |
| Backend | Node.js · Express · TypeScript (`tsx`) · JWT · bcrypt |
| Database | **MongoDB Atlas** (real-time persistence) · local Mongo optional |
| Auth | Role-checked JWT (12h) · Protected routes + API middleware |
| Deploy | **Render** (UI + API one service) · Vercel frontend optional |

---

# 📂 Project Structure

```bash
medical/   # PharmaLoop
│
├── src/                      # React + Vite UI
│   ├── pages/
│   │   ├── pharmacy/
│   │   ├── distributor/
│   │   ├── manufacturer/
│   │   └── admin/
│   ├── components/
│   ├── context/
│   └── lib/api.js
│
├── server/                   # Express API
│   ├── index.ts              # Boot + Mongo hydrate
│   ├── src/
│   │   ├── routes/           # auth, pharmacy, distributor, manufacturer, admin, shared
│   │   ├── models/           # Mongoose collections
│   │   ├── store.ts          # Seed data
│   │   ├── rules.ts          # Domain rules + inventory transfer
│   │   ├── mongo.ts          # Atlas connect + persist
│   │   └── auth.ts / middleware.ts
│   └── .env.example
│
├── render.yaml               # Render Blueprint
├── vercel.json               # Optional Vercel UI
├── package.json
└── README.md
```

---

# 🚀 Installation (Local)

## Prerequisites

- Node.js 18+
- MongoDB local **or** MongoDB Atlas URI

## Setup

```bash
git clone https://github.com/YOUR_USER/medical.git
cd medical
npm install
```

## Environment

Copy `server/.env.example` → `server/.env`:

```env
PORT=4000
JWT_SECRET=pharmaloop-dev-secret-change-me
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/pharmaloop?retryWrites=true&w=majority
```

Local Mongo example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/pharmaloop
```

## Run frontend + backend

```bash
npm run dev:all
```

| Service | URL |
|---------|-----|
| App | http://localhost:5173 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/api/health |

Or separately:

```bash
npm run server   # API
npm run dev      # Vite (proxies /api → :4000)
```

---

# 🔑 Demo Accounts

Password for all: **`demo123`**

| Role | Email |
|------|--------|
| Pharmacy | `pharmacy@pharmaloop.com` |
| Distributor | `distributor@pharmaloop.com` |
| Manufacturer | `manufacturer@pharmaloop.com` |
| Admin | `admin@pharmaloop.com` |

---

# 🧭 Quick Demo Path

1. **Manufacturer** → Add Medicine / Warehouse & Sell → sell to Distributor  
2. **Distributor** → Stock & Sell → sell to Pharmacy  
3. **Pharmacy** → Inventory → Sell (retail) or Return near-expiry stock  
4. **Distributor** → Scan & Verify → Pickup → Consolidate → Dispatch  
5. **Manufacturer** → Receive → Quarantine → Dispose → Evidence → Reconcile → Close  
6. **Settlement** → Pharmacy credit  
7. **Pharmacy** → Scan Medicine → view passport / re-entry after close  
8. **Admin** → returns, discrepancies, audit trail  

In-app guide (optional route): `/guide`

---

# 🌐 Deployment — Render (UI + API together)

**One Render Web Service** builds React (`dist`) and serves it from Express.

1. Push repo to GitHub (**do not** commit `server/.env`)
2. Atlas → Network Access → allow `0.0.0.0/0` (or Render IPs)
3. Render → **New** → **Web Service** (or Blueprint via `render.yaml`)
4. Settings:

| Field | Value |
|--------|--------|
| Build | `npm install --include=dev && npm run build` |
| Start | `npm start` |
| Health check | `/api/health` |

5. Environment variables:

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Atlas connection string (database `pharmaloop`) |
| `JWT_SECRET` | long random secret |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | optional (`*` or your Vercel URL if split) |

6. Open `https://YOUR-SERVICE.onrender.com`

| Check | URL |
|--------|-----|
| UI | `https://YOUR-SERVICE.onrender.com/` |
| Health | `https://YOUR-SERVICE.onrender.com/api/health` |

> Free tier sleeps when idle — first request may take ~30–60s.

### Optional: Vercel UI + Render API

- Deploy API on Render  
- Deploy UI on Vercel with `VITE_API_URL=https://YOUR-API.onrender.com`  
- Set `FRONTEND_ORIGIN` on Render to your Vercel URL  

---

# 📡 API Overview

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Login / register / me |
| `/api/pharmacy` | Inventory, returns, sell, settlements |
| `/api/distributor` | Verify, pickup, consolidate, manifests, sell |
| `/api/manufacturer` | Batches, stock sell, receive, quarantine, disposal, close |
| `/api/admin` | Orgs, users, returns, discrepancies, audit |
| `/api` (shared) | Notifications, search, batch passport |
| `/api/health` | Health + Mongo status |

---

<div align="center">

# 💊 PharmaLoop

### Create Batches · Sell Downstream · Return · Verify · Dispose · Close

### Traceable • Role-Based • MongoDB-Backed • Deploy-Ready

From Expired Medicine to Verified Disposal

⭐ Star this repository if you find it useful ⭐

</div>
