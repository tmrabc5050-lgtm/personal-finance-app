# Personal Finance Super App 💰

A high-performance, local-first and cloud-synced Personal Finance application built with React 19, TypeScript, Vite, and Supabase.

## 🚀 Features

- **Double-Entry Financial Accuracy:** Complete separation of transfers, fees, and income/expenses using exact BigInt integer-paisa math (zero floating-point drift).
- **Accounts & Wallets:** Support for Cash, Bank, Mobile Wallets (bKash/Nagad), and Credit Cards with real-time balance reconciliation.
- **Budgeting & Savings Goals:** Category-level budget tracking with 80% warning and 100% exceeded alerts, and progress tracking for savings targets.
- **Cash Flow Forecasting & Recurring Bills:** 30/60/90-day predictive cash flow projection with leap-year and month-end safe recurring transaction scheduling.
- **Local-First & Cloud-Synced:** Seamless Guest mode with local IndexedDB/localStorage and encrypted cloud persistence via Supabase PostgreSQL.
- **Row Level Security (RLS):** 100% tenant-isolated multi-user security with strict database-level authorization.
- **Data Mobility:** Full JSON Backup & Restore with backward compatibility (v1, v2, v3) and UTF-8 BOM CSV export for Excel.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vanilla CSS Design System, Vite
- **Backend / Database:** Supabase (PostgreSQL 15 with Row Level Security)
- **Email:** Custom SMTP via Resend API
- **Deployment:** Vercel (Single Page App with `vercel.json` rewrites)

## 📦 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/tmrabc5050-lgtm/personal-finance-app.git
   cd personal-finance-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run locally:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```
