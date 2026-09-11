# PharmaLoop

**From Expired Medicine to Verified Disposal.**

Enterprise pharmaceutical reverse-chain compliance platform: pharmacy return → distributor verification → manufacturer quarantine & disposal → evidence-based closure → re-entry monitoring.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, React Router, Recharts, Lucide
- **Backend:** Node.js, Express, JWT, bcrypt
- **Data:** Rich in-memory demo store (MongoDB optional via `MONGODB_URI`)

## Quick start

```bash
npm install
npm run dev:all
```

- App: http://localhost:5173  
- API: http://localhost:4000  

Or run separately:

```bash
npm run server   # API on :4000
npm run dev      # Vite on :5173
```

## Demo accounts

Password for all: **`demo123`**

| Role | Email |
|------|--------|
| Pharmacy | `pharmacy@pharmaloop.com` |
| Distributor | `distributor@pharmaloop.com` |
| Manufacturer | `manufacturer@pharmaloop.com` |
| Admin | `admin@pharmaloop.com` |

## Product differentiation

Existing systems can track inventory and expired returns. PharmaLoop focuses on the **verification gap**: handoff quantities, settlement status, disposal evidence, verified closure, and possible re-entry after disposal.

**Closed** is only allowed after disposal completed → evidence/certificate → quantity reconciled → destruction verified.

## Key demo batch

`PCM-2026-001` — Paracetamol 500mg (partial return 500 / received 495 / verified disposal). Use Admin **Batch Search** + scan simulation for **Possible Re-entry → Investigation**.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Frontend only |
| `npm run server` | API only |
| `npm run server:dev` | API with watch |
| `npm run dev:all` | Frontend + API |
| `npm run build` | Production frontend build |
