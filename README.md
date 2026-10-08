# Refund Admin Tool

Internal refund-operations demo for a prospective fintech client. A clean, single-page admin UI that walks a refund through the full lifecycle:

**Trigger → Queue → Review → Decision gate → Execution → Audit record**

Everything runs in the browser with synthetic data — no backend, database, or API keys required.

## Run it

Requires [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/npsierra/refund-admin-tool.git
cd refund-admin-tool
npm install
npm run dev
```

Open http://localhost:5173.

Other scripts:

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run build`   | Type-check and produce a static build in `dist/` |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | Run oxlint                                    |

## Demo walkthrough

1. **Dashboard** – pipeline by stage, pending/refunded totals, SLA breaches, recent activity.
2. **Refund Queue** – filter by status, merchant, "assigned to me"; sort by SLA, age, or amount.
3. **Open a case** – see the original purchase, customer history, and risk flags. Click **Start review**, enter a reason, then **Approve** (full or partial), **Reject**, or **Escalate**.
4. **Decision gate** – approval limits are enforced per role; refunds ≥ $1,000 require a second, different approver (two-person rule).
5. **Execute** – Supervisors/Admins execute approved refunds. A simulated processor call settles (or occasionally fails, so you can demo **Retry**).
6. **Audit Log** – every action and state transition is recorded: who, role, what, when, how much, before → after, and reason. Filter or export to CSV.
7. **Settings & Roles** – switch between users to show what each role can do. Reset demo data at any time.

### Roles

| Role       | Approval limit | Executes payouts |
| ---------- | -------------- | ---------------- |
| Analyst    | $250           | No               |
| Supervisor | $2,500         | Yes              |
| Admin      | Unlimited      | Yes              |

Two-person rule: any approval ≥ $1,000 needs a countersignature from a second user with sufficient limit. Limits live in `src/lib/policy.ts`.

## Swapping in your own demo data

- **Merchants (fake companies):** edit `src/data/merchants.json`.
- **Users / roles:** edit `src/data/users.json` (`role` must be `analyst`, `supervisor`, or `admin`).
- **Customers, purchases, refund cases, and history** are generated deterministically from the merchants list in `src/data/seed.ts` (product catalog per category, reasons, status mix). Adjust the `CATALOG`, `REASONS`, or `statusPlan` there to change the mix.

State is persisted to `localStorage`. Use **Settings → Reset demo data** (or clear site data) after changing seed files.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand (persisted store) · React Router · lucide-react

```
src/
  components/   Layout (sidebar) and UI primitives
  data/         merchants.json, users.json, deterministic seed generator
  lib/          formatting helpers, role/approval policy
  pages/        Dashboard, Queue, RefundDetail, NewRefund, AuditLog, Merchants, Settings
  store/        Zustand store: refund state machine + audit logging
  types.ts      Domain model
```
