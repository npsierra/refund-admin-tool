import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Button, Card, Empty, Input, Label, PageHeader, Select, Textarea } from '../components/ui'
import { money, shortDate, titleCase } from '../lib/format'
import type { RefundRequest, RefundTrigger } from '../types'

const TRIGGERS: RefundTrigger[] = ['customer_request', 'return_received', 'merchant_initiated', 'chargeback', 'fraud_review', 'manual']

export function NewRefund() {
  const navigate = useNavigate()
  const purchases = useStore((s) => s.purchases)
  const customers = useStore((s) => s.customers)
  const merchants = useStore((s) => s.merchants)
  const refunds = useStore((s) => s.refunds)
  const createRefund = useStore((s) => s.createRefund)

  const [q, setQ] = useState('')
  const [purchaseId, setPurchaseId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [trigger, setTrigger] = useState<RefundTrigger>('customer_request')
  const [priority, setPriority] = useState<RefundRequest['priority']>('normal')
  const [reason, setReason] = useState('')

  const openByPurchase = useMemo(() => new Set(refunds.filter((r) => !['completed', 'rejected'].includes(r.status)).map((r) => r.purchaseId)), [refunds])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return purchases
      .filter((p) => {
        if (openByPurchase.has(p.id)) return false
        if (p.refundedAmount >= p.amount) return false
        if (!needle) return true
        const c = customers.find((x) => x.id === p.customerId)
        const m = merchants.find((x) => x.id === p.merchantId)
        return p.id.toLowerCase().includes(needle) || c?.name.toLowerCase().includes(needle) || c?.email.toLowerCase().includes(needle) || m?.name.toLowerCase().includes(needle)
      })
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
      .slice(0, 12)
  }, [q, purchases, customers, merchants, openByPurchase])

  const selected = purchases.find((p) => p.id === purchaseId)
  const remaining = selected ? Math.round((selected.amount - selected.refundedAmount) * 100) / 100 : 0
  const amt = amount === '' ? remaining : Number(amount)
  const valid = selected && amt > 0 && amt <= remaining && reason.trim().length > 0

  const submit = () => {
    if (!selected || !valid) return
    const id = createRefund({ purchaseId: selected.id, amount: amt, trigger, reason, priority })
    navigate(`/refunds/${id}`)
  }

  return (
    <div>
      <PageHeader title="New Refund" subtitle="Trigger a refund case manually. In production, most cases arrive automatically from returns, chargebacks, and customer requests." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card title="1. Find the purchase" className="lg:col-span-3">
          <div className="relative mb-3">
            <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-stone-400" />
            <Input placeholder="Search by order ID, customer, or merchant…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" autoFocus />
          </div>
          {results.length === 0 ? (
            <Empty>No eligible purchases found.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
              {results.map((p) => {
                const c = customers.find((x) => x.id === p.customerId)
                const m = merchants.find((x) => x.id === p.merchantId)
                const active = p.id === purchaseId
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setPurchaseId(p.id)
                        setAmount('')
                      }}
                      className={'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ' + (active ? 'bg-brand-50' : 'hover:bg-stone-50')}
                    >
                      <div>
                        <div className="font-medium text-stone-900">
                          {c?.name} <span className="font-normal text-stone-400">· {m?.name}</span>
                        </div>
                        <div className="text-xs text-stone-500">
                          {p.id} · {shortDate(p.purchasedAt)} · {p.items.map((i) => i.name).join(', ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium tabular-nums text-stone-900">{money(p.amount)}</div>
                        {p.refundedAmount > 0 && <div className="text-xs text-stone-400">{money(p.refundedAmount)} refunded</div>}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="2. Refund details" className="lg:col-span-2">
          {!selected ? (
            <p className="text-sm text-stone-500">Select a purchase to continue.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Order total</span>
                  <span className="font-medium">{money(selected.amount)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Refundable balance</span>
                  <span className="font-medium">{money(remaining)}</span>
                </div>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="1"
                  min={0}
                  max={remaining}
                  placeholder={remaining.toFixed(2)}
                  value={amount}
                  onFocus={() => amount === '' && setAmount(remaining.toFixed(2))}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {amt > remaining && <p className="mt-1 text-xs text-rose-600">Cannot exceed refundable balance.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Trigger</Label>
                  <Select value={trigger} onChange={(e) => setTrigger(e.target.value as RefundTrigger)}>
                    {TRIGGERS.map((t) => (
                      <option key={t} value={t}>
                        {titleCase(t)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value as RefundRequest['priority'])}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea rows={3} placeholder="Describe why this refund is being requested" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button variant="primary" className="w-full" disabled={!valid} onClick={submit}>
                Create refund case for {money(amt || 0)}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
