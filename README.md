# Refund Admin Tool

Internal refund-operations demo for a prospective fintech client. A clean, single-page admin UI that walks a refund through the full lifecycle:

**Trigger → Queue → Review → Decision gate → Execution → Audit record**

Everything runs in the browser with synthetic data — no backend, database, or API keys required.

## Run it

Requires [Node.js](https://nodejs.org) 20 or newer (`node -v` to check). Nothing else: no accounts, API keys, or environment variables.

Open a terminal in the folder where you want the project, then:

```bash
git clone https://github.com/npsierra/refund-admin-tool.git
cd refund-admin-tool
npm install
npm run dev
```

Open http://localhost:5173 in your browser. Stop the server with `Ctrl+C`.

Other scripts:

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run build`   | Type-check and produce a static build in `dist/` |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | Run oxlint                                    |

## What's in the app

- **Dashboard** – pipeline by stage (bars match status colors), pending/refunded totals, SLA breaches, recent activity. Supervisors/Admins see "awaiting your countersign".
- **Refund Queue** – filter by status, merchant, "assigned to me" (the default for Analysts); sort by SLA, age, or amount.
- **Case view** – original purchase, customer history, risk flags. **Start review**, enter a reason, then **Approve** (full or partial), **Reject**, or **Escalate**.
- **Decision gate** – approval limits enforced per role; refunds ≥ $1,000 require a second, different approver (two-person rule).
- **Execute** – Supervisors/Admins execute approved refunds. A simulated processor call settles (or occasionally fails, so you can demo **Retry**).
- **Audit Log** – every action, state transition, user switch, and policy change is recorded: who, role, what, when, how much, before → after, reason. Filter or export to CSV.
- **Settings & Roles** – switch users, view/edit the approval policy (Admin only), reset demo data.

## 5-minute demo path

1. **Settings → Reset demo data** so the dataset is fresh.
2. **Dashboard** as Priya (Analyst): pipeline by stage, unassigned count.
3. On the **Dashboard**, click the *Queued* stage bar to open those cases (the Queue otherwise defaults to "Assigned to me" for Analysts) → open one → **Assign to me** → **Start review** → try to approve an amount over $250 → blocked by the Analyst limit.
4. **Settings → Switch to David (Admin)** → under *Roles & approval policy* raise the Analyst limit to **$500** → **Save policy**. Open **Audit Log**: a `policy.updated` row shows *Analyst limit $250.00 → $500.00*.
5. **Switch back to Priya** → the same approval now succeeds.
6. Open a case **≥ $1,000** as Elena (Supervisor) → **Approve** → status becomes *Needs 2nd Approval*. Elena cannot countersign her own approval; **switch to David** → **Countersign** → **Execute** → settles with a processor reference.
7. **Dashboard** as Elena shows "awaiting your countersign"; **Audit Log → Export CSV**.

### Roles

| Role       | First-approval limit | Countersigns | Executes payouts | Edits policy |
| ---------- | -------------------- | ------------ | ---------------- | ------------ |
| Analyst    | $250                 | No           | No               | No           |
| Supervisor | $2,500               | Any amount   | Yes              | No           |
| Admin      | Unlimited            | Any amount   | Yes              | Yes          |

Two-person rule: any approval ≥ $1,000 needs a countersignature from a *different* Supervisor or Admin. The role limit applies to the first approval only.

**Configurable policy:** an Admin can change the Analyst limit, Supervisor limit, and two-person threshold in **Settings → Roles & approval policy**. Changes take effect immediately for every open case and are written to the audit log (who, from → to). Defaults live in `src/lib/policy.ts`; edits are kept in `localStorage` until **Reset demo data**.

## Connecting real data

All merchants, customers, purchases, and refunds come from the synthetic data layer in `src/data/`. In a production deployment that layer is replaced by calls to your systems — the payment processor (Stripe, Adyen) for refunds and settlement, the order database for purchases — and the rest of the app (queue, decision gate, audit) is unchanged.

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
