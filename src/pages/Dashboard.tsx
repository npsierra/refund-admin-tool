import { clsx } from 'clsx'
import { Link } from 'react-router-dom'
import { useCurrentUser, useStore } from '../store/useStore'
import { Card, PageHeader, Stat, StatusBadge } from '../components/ui'
import { money, relative, titleCase, useNow } from '../lib/format'
import { OPEN_STATUSES, STATUS_BAR, STATUS_LABELS } from '../lib/policy'
import type { RefundStatus } from '../types'

const STAGES: RefundStatus[] = ['queued', 'in_review', 'pending_second_approval', 'approved', 'executing', 'completed', 'rejected', 'failed']

export function Dashboard() {
  const refunds = useStore((s) => s.refunds)
  const audit = useStore((s) => s.audit)
  const merchants = useStore((s) => s.merchants)
  const me = useCurrentUser()
  const now = useNow()

  const open = refunds.filter((r) => OPEN_STATUSES.includes(r.status))
  const pendingAmount = open.reduce((s, r) => s + (r.approvedAmount ?? r.requestedAmount), 0)
  const completed = refunds.filter((r) => r.status === 'completed')
  const refundedAmount = completed.reduce((s, r) => s + (r.approvedAmount ?? r.requestedAmount), 0)
  const breached = open.filter((r) => new Date(r.slaDueAt).getTime() < now)
  const needsSecond = refunds.filter((r) => r.status === 'pending_second_approval')
  const myCountersigns = me.role === 'analyst' ? [] : needsSecond.filter((r) => !r.decisions.some((d) => d.action === 'approve' && d.by === me.id))
  const secondHint =
    me.role === 'analyst'
      ? `${needsSecond.length} awaiting 2nd approval`
      : `${myCountersigns.length} awaiting your countersign`
  const byStage = STAGES.map((st) => ({ st, n: refunds.filter((r) => r.status === st).length }))
  const max = Math.max(...byStage.map((b) => b.n), 1)
  const recent = [...audit].reverse().slice(0, 8)

  const byMerchant = merchants
    .map((m) => {
      const rs = refunds.filter((r) => r.merchantId === m.id)
      return { m, count: rs.length, amount: rs.filter((r) => r.status === 'completed').reduce((s, r) => s + (r.approvedAmount ?? 0), 0) }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Refund operations at a glance" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open cases" value={open.length} hint={`${refunds.filter((r) => r.status === 'queued').length} unassigned in queue`} />
        <Stat label="Pending amount" value={money(pendingAmount)} hint="Across all open cases" />
        <Stat label="Refunded (all time)" value={money(refundedAmount)} hint={`${completed.length} completed`} tone="success" />
        <Stat label="SLA breaches" value={breached.length} hint={needsSecond.length ? secondHint : 'All within SLA'} tone={breached.length ? 'danger' : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Pipeline by stage" className="lg:col-span-2">
          <div className="space-y-3">
            {byStage.map(({ st, n }) => (
              <Link to={`/queue?status=${st}`} key={st} className="group flex items-center gap-3">
                <div className="w-36 text-xs font-medium text-stone-600 group-hover:text-brand-700">{STATUS_LABELS[st]}</div>
                <div className="h-5 flex-1 overflow-hidden rounded bg-stone-100">
                  <div className={clsx('h-full rounded transition-all', STATUS_BAR[st])} style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <div className="w-6 text-right text-xs font-semibold text-stone-700">{n}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Top merchants by refunded $">
          <ul className="divide-y divide-stone-100">
            {byMerchant.map(({ m, count, amount }) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium text-stone-800">{m.name}</div>
                  <div className="text-xs text-stone-500">{count} cases</div>
                </div>
                <div className="font-medium text-stone-900">{money(amount)}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Needs attention" className="lg:col-span-1">
          {breached.length === 0 && needsSecond.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing urgent.</p>
          ) : (
            <ul className="space-y-2">
              {[...needsSecond, ...breached.filter((r) => r.status !== 'pending_second_approval')].slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link to={`/refunds/${r.id}`} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">
                    <div>
                      <div className="font-medium text-brand-700">{r.id}</div>
                      <div className="text-xs text-stone-500">
                        {money(r.approvedAmount ?? r.requestedAmount)} · due {relative(r.slaDueAt)}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent activity" className="lg:col-span-2" action={<Link to="/audit" className="text-xs font-medium text-brand-600 hover:underline">View audit log</Link>}>
          <ul className="divide-y divide-stone-100">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-xs text-stone-400">{relative(e.at)}</span>
                <span className="flex-1 truncate">
                  <span className="font-medium text-stone-800">{e.actorName}</span>{' '}
                  <span className="text-stone-500">{titleCase(e.action.split('.')[1] ?? e.action).toLowerCase()}</span>{' '}
                  {e.refundId && (
                    <Link to={`/refunds/${e.refundId}`} className="font-medium text-brand-600 hover:underline">
                      {e.refundId}
                    </Link>
                  )}
                </span>
                {e.amount != null && e.amount > 0 && <span className="text-xs font-medium text-stone-700">{money(e.amount)}</span>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
