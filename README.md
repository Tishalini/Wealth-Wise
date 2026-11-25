# WealthWise

**AI-powered personal financial planning and risk intelligence platform.**

WealthWise brings a person's whole financial picture into one place: income, spending, budgets, goals and net worth. It scores their financial health, forecasts their cash flow, simulates "what-if" decisions, and explains everything through an AI financial assistant.

---

## Features

| Module | What it does |
|---|---|
| **Financial overview** | Net worth, income, expenses, savings and health score at a glance, with cash-flow trends, spending by category, budget and goal progress, and AI insights |
| **Transactions** | Search, filter (type, category, account, month), sort, add, edit, delete and export to CSV |
| **Budgets** | Monthly limits per category, budget-vs-actual chart, alerts when you're on pace to overspend, "safe to spend per day" |
| **Goals** | Savings goals with progress tracking, required monthly contribution, expected completion date and one-click pace correction |
| **Cash-flow forecast** | 3, 6 or 12-month projection with a confidence range, planned one-off expenses and upcoming recurring bills |
| **Scenario simulator** | Model a raise, job loss, cutting expenses, investing more or a big purchase, and see the effect on net worth, savings rate, financial independence and every goal |
| **Financial health** | A 0–100 score built from six weighted factors (savings rate, emergency fund, debt-to-income, budget discipline, investments, spending stability), plus risk indicators and ranked recommendations |
| **AI assistant** | Chat that answers questions from your own data: where to cut spending, "can I afford ₹1.5L in March?", goal status, score explanations, forecasts, subscriptions and investing |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, Recharts, React Router, Lucide icons |
| Backend (planned) | Python, FastAPI |
| AI / ML (planned) | LLM-based assistant, forecasting with Prophet / scikit-learn |
| Database (planned) | PostgreSQL or SQLite |

> **Current status:** the frontend is complete and runs on realistic mock data (about 500 transactions over 12 months), saved in the browser. The AI assistant currently calculates its answers locally from that data; it will be connected to a language model through the Python backend.

---

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer (check with `node -v`)
- npm (comes with Node.js)

### Run the frontend

The repository folder contains a `frontend` folder. Open a terminal **in the repository folder** (the one containing this README), then:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

> **Windows note:** if you cloned or downloaded the repo into a folder that is also called `Wealth-Wise`, you may have a nested path like
> `C:\Users\<you>\Desktop\Wealth-Wise\Wealth-Wise\frontend`.
> If `cd frontend` says the path does not exist, run `dir` to check whether you need `cd Wealth-Wise\frontend` first.

### Other commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Type-check and create a production build in `frontend/dist` |
| `npm run preview` | Serve the production build locally |

---

## Project structure

```
Wealth-Wise/
├── README.md
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx              # App entry and routes
        ├── index.css             # Theme (colours, fonts, buttons, inputs)
        ├── data/
        │   ├── types.ts          # Transaction, Budget, Goal, Account, Profile
        │   └── mock.ts           # Realistic demo data generator
        ├── store/
        │   └── FinanceContext.tsx  # App state, add/edit/delete, browser storage
        ├── lib/
        │   ├── analytics.ts      # Health score, budgets, forecast, simulator maths
        │   ├── assistant.ts      # AI assistant engine
        │   └── format.ts         # Currency (₹ lakh/crore) and date formatting
        ├── components/
        │   ├── Layout.tsx        # Sidebar, top bar, alerts, notifications
        │   ├── ui.tsx            # Cards, modals, progress bars, badges
        │   └── charts.tsx        # Chart colours and tooltips
        └── pages/
            ├── Dashboard.tsx
            ├── Transactions.tsx
            ├── Budgets.tsx
            ├── Goals.tsx
            ├── CashFlow.tsx
            ├── Simulator.tsx
            ├── Health.tsx
            ├── Assistant.tsx
            └── Settings.tsx
```

---

## Demo walkthrough

A suggested order for presenting the project:

1. **Overview:** the full financial picture and health score.
2. **Transactions:** add a transaction, then show the overview, budgets and health score update instantly.
3. **Budgets:** point out the categories flagged as over budget or on pace to overspend.
4. **Goals:** use "Auto-fix pace" on the goal that is behind.
5. **Cash-flow forecast:** add a planned expense and watch the projected balance change.
6. **Simulator:** click the "Job loss shock" and "FIRE mode" presets to compare outcomes.
7. **Financial health:** walk through the score breakdown, then click **Explain** on a recommendation.
8. **AI assistant:** ask "Can I afford a ₹1.5L vacation in March?" and "Where can I cut back on spending?"

To restore the original demo data at any time, go to **Settings → Reset demo data**.

---

## Roadmap: connecting the Python backend

The frontend is built so the backend can be added without changing any screens:

1. **Data:** replace the browser-storage functions in `src/store/FinanceContext.tsx` with calls to FastAPI endpoints (`/api/transactions`, `/api/budgets`, `/api/goals`, `/api/accounts`).
2. **AI assistant:** replace `answer()` in `src/lib/assistant.ts` with a call to `POST /api/assistant`, returning the same reply shape (`text`, `bullets`, `table`, `followUps`).
3. **Analytics:** optionally move the health score and forecast to the backend (e.g. Prophet or scikit-learn) and keep the same return formats.
4. **Accounts:** add user sign-up/login and bank statement import (CSV/PDF).

---

## Disclaimer

WealthWise provides educational financial insights, not regulated financial advice. All data in the demo is fictional.
