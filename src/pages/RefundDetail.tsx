import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, PlayCircle, RotateCcw, ShieldAlert, XCircle } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useCurrentUser, useStore } from '../store/useStore'
import { Avatar, Badge, Button, Card, Field, Input, PageHeader, RiskFlagBadge, StatusBadge, Textarea } from '../components/ui'
import { dateTime, fullDateTime, money, relative, shortDate, titleCase, useNow } from '../lib/format'
import { ROLE_LABELS, canApproveAmount, canExecute, canSecondApprove, explainApprovalBlock, needsSecondApproval } from '../lib/policy'

const STEPS = ['Trigger', 'Queue', 'Review', 'Decision', 'Execution', 'Recorded'] as const

export function RefundDetail() {
  const { id } = useParams()
  const refund = useStore((s) => s.refunds.find((r) => r.id === id))
  const purchase = useStore((s) => s.purchases.find((p) => p.id === refund?.purchaseId))
  const merchant = useStore((s) => s.merchants.find((m) => m.id === refund?.merchantId))
  const customer = useStore((s) => s.customers.find((c) => c.id === refund?.customerId))
  const assignee = useStore((s) => s.users.find((u) => u.id === refund?.assigneeId))
  const allAudit = useStore((s) => s.audit)
  const audit = allAudit.filter((a) => a.refundId === id)
  const policy = useStore((s) => s.policy)
  const actions = useStore(
    useShallow((s) => ({
      startReview: s.startReview,
      assignToMe: s.assignToMe,
      approve: s.approve,
      secondApprove: s.secondApprove,
      reject: s.reject,
      escalate: s.escalate,
      addNote: s.addNote,
      execute: s.execute,
      retry: s.retry,
    })),
  )
  const me = useCurrentUser()
  const now = useNow()

  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!refund || !purchase || !merchant || !customer) {
    return (
      <div>
        <Link to="/queue" className="text-sm text-indigo-600 hover:underline">
          ← Back to queue
        </Link>
        <p className="mt-6 text-slate-600">Refund case not found.</p>
      </div>
    )
  }

  const approveAmount = amount === '' ? refund.requestedAmount : Number(amount)
  const stepIndex =
    refund.status === 'queued' ? 1
    : refund.status === 'in_review' ? 2
    : refund.status === 'pending_second_approval' || refund.status === 'approved' || refund.status === 'rejected' ? 3
    : refund.status === 'executing' || refund.status === 'failed' ? 4
    : 5
  const isOpenForDecision = refund.status === 'queued' || refund.status === 'in_review'
  const approvalBlock = explainApprovalBlock(me, approveAmount, policy)
  const willNeedSecond = needsSecondApproval(approveAmount, policy)
  const remaining = purchase.amount - purchase.refundedAmount

  const run = (fn: () => { ok: boolean; error?: string } | void) => {
    setError(null)
    const res = fn()
    if (res && !res.ok) setError(res.error ?? 'Action failed')
    else {
      setReason('')
      setAmount('')
    }
  }

  return (
    <div>
      <Link to="/queue" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={14} /> Back to queue
      </Link>
      <PageHeader
        title={refund.id}
        subtitle={`${titleCase(refund.trigger)} · opened ${relative(refund.createdAt)} · ${merchant.name}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={refund.priority === 'high' ? 'danger' : refund.priority === 'low' ? 'neutral' : 'info'}>{titleCase(refund.priority)} priority</Badge>
            <StatusBadge status={refund.status} />
          </div>
        }
      />

      <ol className="mb-6 flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => {
          const done = i < stepIndex || refund.status === 'completed'
          const active = i === stepIndex && refund.status !== 'completed'
          const failed = (refund.status === 'rejected' && i === 3) || (refund.status === 'failed' && i === 4)
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={
                  'flex h-6 items-center gap-1 rounded-full px-2.5 font-medium ' +
                  (failed ? 'bg-rose-100 text-rose-700' : done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')
                }
              >
                {done && !failed ? <CheckCircle2 size={12} /> : failed ? <XCircle size={12} /> : <span className="text-[10px]">{i + 1}</span>}
                {s}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-5 bg-slate-200" />}
            </li>
          )
        })}
      </ol>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Request">
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Requested">{money(refund.requestedAmount)}</Field>
              <Field label="Approved">{refund.approvedAmount != null ? money(refund.approvedAmount) : '—'}</Field>
              <Field label="Trigger">{titleCase(refund.trigger)}</Field>
              <Field label="SLA due">
                <span className={new Date(refund.slaDueAt).getTime() < now && ['queued', 'in_review', 'pending_second_approval'].includes(refund.status) ? 'text-rose-600' : ''}>{dateTime(refund.slaDueAt)}</span>
              </Field>
            </dl>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{refund.reason}</p>
            {refund.riskFlags.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500">
                  <ShieldAlert size={12} /> Risk flags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {refund.riskFlags.map((f) => (
                    <RiskFlagBadge key={f} flag={f} />
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card title="Original purchase">
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Order">{purchase.id}</Field>
                <Field label="Date">{shortDate(purchase.purchasedAt)}</Field>
                <Field label="Total">{money(purchase.amount)}</Field>
                <Field label="Already refunded">{money(purchase.refundedAmount)}</Field>
                <Field label="Payment">
                  {titleCase(purchase.paymentMethod)} ····{purchase.last4}
                </Field>
                <Field label="Processor">{merchant.processor}</Field>
              </dl>
              <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
                {purchase.items.map((it) => (
                  <li key={it.sku} className="flex justify-between py-2">
                    <span className="text-slate-700">
                      {it.qty}× {it.name} <span className="text-xs text-slate-400">{it.sku}</span>
                    </span>
                    <span className="tabular-nums text-slate-900">{money(it.qty * it.unitPrice)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Customer">
              <div className="flex items-center gap-3">
                <Avatar name={customer.name} size="lg" />
                <div>
                  <div className="font-medium text-slate-900">{customer.name}</div>
                  <div className="text-xs text-slate-500">{customer.email}</div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Country">{customer.country}</Field>
                <Field label="Customer since">{shortDate(customer.joinedAt)}</Field>
                <Field label="Lifetime spend">{money(customer.lifetimeSpend)}</Field>
                <Field label="Prior refunds">
                  <span className={customer.priorRefunds >= 3 ? 'font-medium text-amber-600' : ''}>{customer.priorRefunds}</span>
                </Field>
              </dl>
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Merchant policy: {merchant.refundPolicyDays}-day window · {merchant.riskTier} risk tier
              </div>
            </Card>
          </div>

          <Card title="Case history" action={<span className="text-xs text-slate-400">{audit.length} audit entries</span>}>
            <ol className="relative ml-2 border-l border-slate-200">
              {[...audit].reverse().map((e) => (
                <li key={e.id} className="mb-4 ml-5">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
                  <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium text-slate-900">{e.actorName}</span>
                    <span className="text-xs text-slate-400">{ROLE_LABELS[e.actorRole]}</span>
                    <span className="text-slate-600">{titleCase(e.action.split('.')[1] ?? e.action).toLowerCase()}</span>
                    {e.amount != null && e.amount > 0 && <span className="font-medium text-slate-800">{money(e.amount)}</span>}
                    {e.before && e.after && (
                      <span className="text-xs text-slate-500">
                        {titleCase(e.before)} → {titleCase(e.after)}
                      </span>
                    )}
                  </div>
                  {e.reason && <div className="mt-0.5 text-xs text-slate-500">“{e.reason}”</div>}
                  <div className="mt-0.5 text-[11px] text-slate-400">{fullDateTime(e.at)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Decision">
            {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

            {refund.status === 'queued' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">This case is waiting in the queue.</p>
                <Button variant="primary" className="w-full" onClick={() => run(() => actions.startReview(refund.id))}>
                  Start review
                </Button>
              </div>
            )}

            {isOpenForDecision && refund.status === 'in_review' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Approve amount (max {money(refund.requestedAmount)})</label>
                  <Input type="number" step="0.01" min={0} max={refund.requestedAmount} placeholder={refund.requestedAmount.toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  {approveAmount > remaining && <p className="mt-1 text-xs text-amber-600">Exceeds remaining refundable balance ({money(remaining)}).</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Reason</label>
                  <Textarea rows={3} placeholder="Why are you making this decision?" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Your limit ({ROLE_LABELS[me.role]})</span>
                    <span className="font-medium">{Number.isFinite(policy.approvalLimits[me.role]) ? money(policy.approvalLimits[me.role]) : 'Unlimited'}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Two-person rule</span>
                    <span className="font-medium">{willNeedSecond ? `Required (≥ ${money(policy.twoPersonThreshold)})` : 'Not required'}</span>
                  </div>
                  {approvalBlock && <div className="mt-2 text-rose-600">{approvalBlock}</div>}
                </div>
                <Button variant="success" className="w-full" disabled={!!approvalBlock || !reason.trim() || approveAmount <= 0 || approveAmount > refund.requestedAmount} onClick={() => run(() => actions.approve(refund.id, approveAmount, reason))}>
                  <CheckCircle2 size={16} />
                  {approveAmount < refund.requestedAmount ? `Approve partial ${money(approveAmount)}` : `Approve ${money(approveAmount)}`}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="danger" disabled={!reason.trim()} onClick={() => run(() => actions.reject(refund.id, reason))}>
                    <XCircle size={16} /> Reject
                  </Button>
                  <Button disabled={!reason.trim() || refund.priority === 'high'} onClick={() => run(() => actions.escalate(refund.id, reason))}>
                    Escalate
                  </Button>
                </div>
                {!reason.trim() && <p className="text-center text-[11px] text-slate-400">A reason is required for every decision.</p>}
              </div>
            )}

            {refund.status === 'pending_second_approval' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  {money(refund.approvedAmount ?? 0)} approved by {refund.decisions[0]?.byName}. Amounts ≥ {money(policy.twoPersonThreshold)} need a second, different approver.
                </div>
                <Textarea rows={2} placeholder="Second approver reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                {!canSecondApprove(me, refund, policy) && (
                  <p className="text-xs text-rose-600">
                    {refund.decisions.some((d) => d.action === 'approve' && d.by === me.id)
                      ? 'You made the first approval — switch to another user to countersign.'
                      : canApproveAmount(me, refund.approvedAmount ?? 0, policy)
                        ? ''
                        : `Exceeds your ${ROLE_LABELS[me.role]} limit.`}
                  </p>
                )}
                <Button variant="success" className="w-full" disabled={!canSecondApprove(me, refund, policy) || !reason.trim()} onClick={() => run(() => actions.secondApprove(refund.id, reason))}>
                  <CheckCircle2 size={16} /> Countersign approval
                </Button>
                <Button variant="danger" className="w-full" disabled={!reason.trim()} onClick={() => run(() => actions.reject(refund.id, reason))}>
                  <XCircle size={16} /> Reject
                </Button>
              </div>
            )}

            {refund.status === 'approved' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800">
                  Fully approved for {money(refund.approvedAmount ?? 0)}. Execution sends the credit to {merchant.processor}.
                </div>
                {!canExecute(me) && <p className="text-xs text-rose-600">Only Supervisors and Admins can execute payouts.</p>}
                <Button variant="primary" className="w-full" disabled={!canExecute(me)} onClick={() => run(() => actions.execute(refund.id))}>
                  <PlayCircle size={16} /> Execute refund
                </Button>
              </div>
            )}

            {refund.status === 'executing' && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={16} className="animate-spin text-violet-500" /> Sending {money(refund.execution?.amount ?? 0)} to {merchant.processor}…
              </div>
            )}

            {refund.status === 'failed' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{refund.execution?.failureReason}</div>
                <Button variant="primary" className="w-full" disabled={!canExecute(me)} onClick={() => run(() => actions.retry(refund.id))}>
                  <RotateCcw size={16} /> Retry execution
                </Button>
              </div>
            )}

            {refund.status === 'completed' && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 font-medium text-emerald-700">
                  <CheckCircle2 size={16} /> Settled {money(refund.execution?.amount ?? 0)}
                </div>
                <dl className="grid grid-cols-1 gap-2 text-xs">
                  <Field label="Processor reference">
                    <code className="text-xs">{refund.execution?.processorRef}</code>
                  </Field>
                  <Field label="Settled at">{refund.execution?.completedAt ? fullDateTime(refund.execution.completedAt) : '—'}</Field>
                </dl>
              </div>
            )}

            {refund.status === 'rejected' && (
              <div className="text-sm text-slate-600">
                Rejected by {refund.decisions.find((d) => d.action === 'reject')?.byName}: “{refund.decisions.find((d) => d.action === 'reject')?.reason}”
              </div>
            )}
          </Card>

          <Card title="Assignment">
            {assignee ? (
              <div className="flex items-center gap-2 text-sm">
                <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" /> {assignee.name}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Unassigned</p>
            )}
            {assignee?.id !== me.id && ['queued', 'in_review', 'pending_second_approval'].includes(refund.status) && (
              <Button size="sm" className="mt-3" onClick={() => actions.assignToMe(refund.id)}>
                Assign to me
              </Button>
            )}
          </Card>

          <Card title="Decisions">
            {refund.decisions.length === 0 ? (
              <p className="text-sm text-slate-500">No decisions yet.</p>
            ) : (
              <ul className="space-y-3">
                {refund.decisions.map((d, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{d.byName}</span>
                      <Badge tone={d.action === 'approve' ? 'success' : d.action === 'reject' ? 'danger' : 'warn'}>{titleCase(d.action)}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">
                      {ROLE_LABELS[d.role]} · {dateTime(d.at)} {d.amount > 0 && `· ${money(d.amount)}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">“{d.reason}”</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Notes">
            <ul className="mb-3 space-y-2">
              {refund.notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-slate-50 p-2.5 text-sm">
                  <div className="text-slate-800">{n.text}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {n.byName} · {dateTime(n.at)}
                  </div>
                </li>
              ))}
            </ul>
            <Textarea rows={2} placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              size="sm"
              className="mt-2"
              disabled={!note.trim()}
              onClick={() => {
                actions.addNote(refund.id, note)
                setNote('')
              }}
            >
              Add note
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
