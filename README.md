# ⚡ SportsWire — Real-Time Sports Stadium Scoreboard

A high-performance, real-time sports scoreboard built with **native WebSockets (`ws`)**, **Express**, **Drizzle ORM**, and **React (Vite)**. Engineered for sub-10ms broadcast latency, high-fidelity glassmorphic stadium visuals, and multi-sport coverage for both **Football** and **Cricket**.

---

## 🚀 Key Features

* **⚡ Native WebSocket Engine (`ws`)**: Hand-crafted WebSocket server with selective room subscriptions (`matchSubscribers`), 30s heartbeat ping/pong protocol, and ghost connection auto-cleanup.
* **🏏 Multi-Sport Support**:
  * **Football (Soccer)**: Premier League, UEFA Champions League, Bundesliga, La Liga, and Serie A fetched live from ESPN's global API.
  * **Cricket**: International match fixtures (India vs Australia, England vs South Africa) with authentic score metrics (`runs/wickets (overs)`), Current Run Rate (CRR), Required Run Rate (RRR), active strike batters, and bowlers.
* **📋 Authentic Team Lineups ("Who's Playing")**: Official Starting XI / Playing XI rosters for both football clubs and national cricket teams with player names, jersey numbers, and field positions.
* **🏟️ Pure Fan View (Production Mode)**: Immersive, distraction-free stadium night interface with LED digit scoreboards, pitch radar, breaking sports marquee, and live fan crowd prediction voting.
* **🛡️ Security & Guardrails**: Integrated Arcjet bot detection and sliding-window rate-limiting.

---

## 📁 Project Structure

```
sports-scoreboard/
├── backend/
│   ├── src/
│   │   ├── index.js                     # Unified Express + native ws HTTP server
│   │   ├── ws/server.js                 # Native WebSocket room pub/sub & heartbeat
│   │   ├── routes/                      # REST endpoints (/matches, /commentary)
│   │   ├── services/real-sports-service.js # ESPN feed integration & cricket rosters
│   │   ├── db/schema.js                 # Drizzle ORM schema
│   │   └── arcjet.js                    # Security & rate limiting middleware
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                      # Pure Fan View stadium dashboard
│   │   ├── App.css                      # Glassmorphic LED styling
│   │   └── index.css                    # Design tokens & responsive layout
│   ├── .env.example
│   ├── vite.config.js                   # Dedicated port 4000 configuration
│   └── package.json
└── README.md
```

---

## 🛠️ Local Development

### Prerequisites
* Node.js v18+ 
* npm v9+

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm start
# Server runs on http://localhost:8000 and ws://localhost:8000/ws
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Vite runs on http://localhost:4000
```

---

## 🌐 Deployment Guide

### Deploying Backend (Render, Railway, or Fly.io)
Because the backend uses **persistent WebSockets (`ws`)**, deploy it to a platform that supports continuous long-lived connections (e.g., [Render](https://render.com), [Railway](https://railway.app), or [Fly.io](https://fly.io)):

1. Set Root Directory to `backend`.
2. Build Command: `npm install`
3. Start Command: `node src/index.js`
4. Set Environment Variables:
   * `PORT`: `8000` (or the port provided by the host)
   * `HOST`: `0.0.0.0`
   * `DATABASE_URL`: Your PostgreSQL / Neon database connection string (optional)

### Deploying Frontend (Vercel, Netlify, or Cloudflare Pages)
1. Set Root Directory to `frontend`.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variables in your deployment dashboard:
   * `VITE_API_BASE`: `https://your-backend-domain.com`
   * `VITE_WS_URL`: `wss://your-backend-domain.com/ws`

---

## 📄 License
MIT
