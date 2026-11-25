# WealthWise: Frontend

AI-powered personal financial planning and risk intelligence. React + TypeScript + Vite + Tailwind CSS v4 + Recharts.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

## Pages

| Route | What it does |
|---|---|
| `/` Overview | Net worth, income, expenses, savings, health score, cash-flow chart, category donut, budget pulse, goals, recent activity, AI insights |
| `/transactions` | Search, filter (type / category / account / month), sort, paginate, add / edit / delete, CSV export |
| `/budgets` | Budget vs. actual chart, pace-based alerts (fixed costs are not extrapolated), safe-to-spend per day, unbudgeted spend |
| `/goals` | Progress rings, required vs. actual monthly pace, ETA, add funds, auto-fix pace, create / edit / delete |
| `/cash-flow` | 3/6/12-month forecast with confidence band, projected balance, planned one-off expenses, upcoming recurring bills |
| `/simulator` | Presets plus 8 sliders (income, expenses, extra investing, windfall, return, salary growth, inflation, horizon); nominal vs. inflation-adjusted; years to financial independence; goal impact |
| `/health` | Weighted 6-pillar score, radar, risk indicators, ranked recommendations (each with "Explain" → AI) |
| `/assistant` | Chat grounded in the user's data: spending cuts, affordability, goals, score, forecast, subscriptions, investing |
| `/settings` | Profile, currency (INR/USD/EUR), risk appetite, linked accounts, JSON export, reset demo |

## Architecture

```
src/
  data/        types + deterministic mock data generator (12 months, ~500 transactions)
  store/       FinanceContext: app state, CRUD, localStorage persistence, toasts
  lib/
    analytics.ts  all financial maths (summaries, budgets, health score, forecast, simulator)
    assistant.ts  AI assistant engine (intent → computed answer)
    format.ts     currency / date formatting (Indian lakh/crore compact notation)
  components/  Layout (sidebar, topbar, alerts), UI kit, chart tokens
  pages/       one file per route
```

### Connecting the Python backend

The frontend only reads data through `FinanceContext` and only computes through `lib/analytics.ts` and `lib/assistant.ts`. To go live:

1. Replace `load()` / the CRUD functions in `store/FinanceContext.tsx` with `fetch` calls to the FastAPI endpoints (`/api/transactions`, `/api/budgets`, `/api/goals`, `/api/accounts`).
2. Replace `answer()` in `lib/assistant.ts` with `POST /api/assistant` that sends the question and gets back the same `Reply` shape (`text`, `bullets`, `table`, `followUps`). The UI needs no changes.
3. Optionally move `healthReport` / `forecast` server-side (e.g. Prophet / scikit-learn) and keep the same return shapes.

Chart colours use a colour-blind-validated categorical palette checked against the card surface (`#111827`); category colours are fixed per category, never by rank.
