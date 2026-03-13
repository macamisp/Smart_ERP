# Smart Restaurant ERP (Advanced Kitchen & Inventory)

A powerful, real-time Restaurant ERP system designed to fulfill the exact specifications of the **Smart Restaurant BRD v1.0 and v2.0**. It features a stunning, guest-facing tablet ordering app and an ultra-low latency (< 500ms) real-time Kitchen Display System (KDS), all powered by a rigid **Bill of Materials (BOM) engine** for atomic inventory deductions.

---

## 🚀 Features Implemented

### 📱 Module 1: Guest Self-Ordering Tablet (Next.js)
- **Premium UI:** Glassmorphism design, fluid animations, and a rich dark mode.
- **Smart Menu:** Automatically syncs with the exact remaining stock in the database.
- **Atomic Availability:** If an ingredient (e.g., Basmathi Rice) falls below the requirement for a specific portion size (e.g., Large Chicken Fried Rice), that specific item is instantly grayed-out and marked **"Unavailable"**.
- **Live Order Tracking:** Real-time progress bar (Received ➡️ Preparing ➡️ Ready to Serve) powered by WebSockets.

### ⚙️ Module 2: Advanced Kitchen & Inventory (Node.js + Prisma)
- **BOM Engine:** Every dish size (S/M/L) is mapped to precise raw material quantities.
- **Atomic Transactions:** When an order is completed, Prisma utilizes `$transaction` to atomically deduct all required raw ingredients in a single sweep to prevent ghost inventory levels.
- **Sub-500ms Real-Time Data:** Socket.io instantly broadcasts new orders and status changes between the Kitchen and Tables.

---

## 🛠️ Technology Stack
- **Frontend Development:** Next.js (TypeScript, React 19)
- **Design System:** Custom CSS Architecture (Glassmorphism, gradients, no generic component libraries)
- **Backend API Engine:** Node.js, Express
- **Real-Time Communication:** Socket.io 
- **Database & ORM:** SQLite (Dev) / PostgreSQL / MySQL + Prisma ORM

---

## 📦 Local Installation & Setup

### 1. Requirements
- Node.js (v18+)
- NPM or PNPM

### 2. Backend Setup
Navigate into the `backend` folder and initialize the API server and Database:

```bash
cd backend

# Install dependencies
npm install

# Initialize Prisma Database & Push the robust schema
npx prisma generate
npx prisma db push

# Seed the initial BRD v2.0 ingredients and menu items 
# (Chicken Fried Rice & Egg Koththu BOM data)
npx tsx seed.ts

# Start the Backend Server (Runs on Port 5000)
npx tsx index.ts
```

### 3. Frontend Setup (Guest Tablet UI)
Open a new terminal window, navigate into the `frontend` folder, and start the Next.js app:

```bash
cd frontend

# Install dependencies
npm install

# Start the Next.js Development Server (Runs on Port 3000)
npm run dev
```

### 4. Viewing the Application
- The **Guest Tablet Application** will be running at [http://localhost:3000](http://localhost:3000)
- The **Backend API & WebSockets** will be running at [http://localhost:5000](http://localhost:5000)

---

## 📋 Roadmap (Next Phases)
- [ ] **Phase 3:** Create the KDS (Kitchen Display System) UI dashboard for chefs to accept and complete incoming tablet orders.
- [ ] **Phase 4:** Create the Waiter Notification Logstics (Room System) view with Green and Yellow actionable alerts.
- [ ] **Phase 5:** Build out the Admin Financial Reporting dashboard with Gross Margins calculation (Revenue vs. True BOM Cost).
