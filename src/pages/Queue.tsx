import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Search } from 'lucide-react'
import { useCurrentUser, useStore } from '../store/useStore'
import { Avatar, Badge, Empty, Input, PageHeader, RiskFlagBadge, Select, StatusBadge } from '../components/ui'
import { money, relative, titleCase, useNow } from '../lib/format'
import { OPEN_STATUSES, STATUS_LABELS } from '../lib/policy'
import type { RefundStatus } from '../types'

type Sort = 'newest' | 'oldest' | 'amount_desc' | 'sla'

export function Queue() {
  const [params, setParams] = useSearchParams()
  const refunds = useStore((s) => s.refunds)
  const merchants = useStore((s) => s.merchants)
  const customers = useStore((s) => s.customers)
  const users = useStore((s) => s.users)
  const me = useCurrentUser()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('sla')
  const status = (params.get('status') ?? 'open') as RefundStatus | 'open' | 'all'
  const merchant = params.get('merchant') ?? 'all'
  const mine = params.get('mine') === '1'
  const now = useNow()

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (!v || v === 'all' || v === '0') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    let list = refunds
    if (status === 'open') list = list.filter((r) => OPEN_STATUSES.includes(r.status))
    else if (status !== 'all') list = list.filter((r) => r.status === status)
    if (merchant !== 'all') list = list.filter((r) => r.merchantId === merchant)
    if (mine) list = list.filter((r) => r.assigneeId === me.id)
    if (q.trim()) {
      const needle = q.toLowerCase()
      list = list.filter((r) => {
        const c = customers.find((x) => x.id === r.customerId)
        return r.id.toLowerCase().includes(needle) || r.purchaseId.toLowerCase().includes(needle) || c?.name.toLowerCase().includes(needle) || c?.email.toLowerCase().includes(needle)
      })
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (sort === 'amount_desc') return (b.approvedAmount ?? b.requestedAmount) - (a.approvedAmount ?? a.requestedAmount)
      return a.slaDueAt.localeCompare(b.slaDueAt)
    })
    return sorted
  }, [refunds, status, merchant, mine, q, sort, customers, me.id])

  return (
    <div>
      <PageHeader title="Refund Queue" subtitle={`${rows.length} case${rows.length === 1 ? '' : 's'} match your filters`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
          <Input placeholder="Search case, order, customer…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={status} onChange={(e) => setParam('status', e.target.value)} className="w-44">
          <option value="open">Open (all active)</option>
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABELS) as RefundStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select value={merchant} onChange={(e) => setParam('merchant', e.target.value)} className="w-52">
          <option value="all">All merchants</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-40">
          <option value="sla">SLA due soonest</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="amount_desc">Amount (high → low)</option>
        </Select>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={mine} onChange={(e) => setParam('mine', e.target.checked ? '1' : '0')} className="rounded border-slate-300" />
          Assigned to me
        </label>
      </div>

      {rows.length === 0 ? (
        <Empty>No refund cases match these filters.</Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Customer / Merchant</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const c = customers.find((x) => x.id === r.customerId)
                const m = merchants.find((x) => x.id === r.merchantId)
                const a = users.find((u) => u.id === r.assigneeId)
                const breached = OPEN_STATUSES.includes(r.status) && new Date(r.slaDueAt).getTime() < now
                const closed = !OPEN_STATUSES.includes(r.status)
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/refunds/${r.id}`} className="font-medium text-indigo-600 hover:underline">
                        {r.id}
                      </Link>
                      <div className="text-xs text-slate-400">{r.purchaseId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c?.name}</div>
                      <div className="text-xs text-slate-500">{m?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={r.trigger === 'chargeback' || r.trigger === 'fraud_review' ? 'danger' : 'neutral'}>{titleCase(r.trigger)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                      {money(r.approvedAmount ?? r.requestedAmount)}
                      {r.approvedAmount != null && r.approvedAmount < r.requestedAmount && <div className="text-xs font-normal text-slate-400">of {money(r.requestedAmount)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.riskFlags.slice(0, 2).map((f) => (
                          <RiskFlagBadge key={f} flag={f} />
                        ))}
                        {r.riskFlags.length > 2 && <Badge>+{r.riskFlags.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {closed ? (
                        <span className="text-slate-400">—</span>
                      ) : breached ? (
                        <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                          <AlertTriangle size={12} /> {relative(r.slaDueAt)}
                        </span>
                      ) : (
                        <span className="text-slate-600">{relative(r.slaDueAt)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a ? (
                        <span className="inline-flex items-center gap-2 text-xs text-slate-700">
                          <Avatar name={a.name} color={a.avatarColor} size="sm" /> {a.name.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Unassigned</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
