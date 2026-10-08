import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Badge, Card, PageHeader, StatusBadge } from '../components/ui'
import { money, shortDate } from '../lib/format'

export function Merchants() {
  const merchants = useStore((s) => s.merchants)
  const purchases = useStore((s) => s.purchases)
  const refunds = useStore((s) => s.refunds)
  const customers = useStore((s) => s.customers)
  const [selected, setSelected] = useState(merchants[0]?.id)
  const m = merchants.find((x) => x.id === selected)
  const mPurchases = purchases.filter((p) => p.merchantId === selected).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
  const mRefunds = refunds.filter((r) => r.merchantId === selected)

  return (
    <div>
      <PageHeader title="Merchants" subtitle="Fictional companies in the demo dataset and their purchase history" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {merchants.map((x) => {
            const count = refunds.filter((r) => r.merchantId === x.id).length
            const gross = purchases.filter((p) => p.merchantId === x.id).reduce((s, p) => s + p.amount, 0)
            return (
              <button
                key={x.id}
                onClick={() => setSelected(x.id)}
                className={'w-full rounded-xl border p-4 text-left transition ' + (x.id === selected ? 'border-brand-300 bg-brand-50' : 'border-stone-200 bg-white hover:bg-stone-50')}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-stone-900">{x.name}</div>
                  <Badge tone={x.riskTier === 'high' ? 'danger' : x.riskTier === 'medium' ? 'warn' : 'success'}>{x.riskTier} risk</Badge>
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {x.category} · {x.processor} · {count} refund cases · {money(gross)} GMV
                </div>
              </button>
            )
          })}
        </div>
        {m && (
          <div className="space-y-6 lg:col-span-2">
            <Card title={m.name}>
              <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-xs text-stone-500">Category</dt>
                  <dd className="font-medium">{m.category}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Country</dt>
                  <dd className="font-medium">{m.country}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Processor</dt>
                  <dd className="font-medium">{m.processor}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Refund window</dt>
                  <dd className="font-medium">{m.refundPolicyDays} days</dd>
                </div>
              </dl>
            </Card>
            <Card title={`Refund cases (${mRefunds.length})`}>
              {mRefunds.length === 0 ? (
                <p className="text-sm text-stone-500">No refund cases for this merchant.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {mRefunds.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                      <Link to={`/refunds/${r.id}`} className="font-medium text-brand-600 hover:underline">
                        {r.id}
                      </Link>
                      <span className="text-xs text-stone-500">{customers.find((c) => c.id === r.customerId)?.name}</span>
                      <span className="tabular-nums">{money(r.approvedAmount ?? r.requestedAmount)}</span>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={`Purchases (${mPurchases.length})`}>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-stone-500">
                    <tr>
                      <th className="pb-2">Order</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Items</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {mPurchases.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 font-mono text-xs text-stone-600">{p.id}</td>
                        <td className="py-2">{customers.find((c) => c.id === p.customerId)?.name}</td>
                        <td className="py-2 text-xs text-stone-500">{shortDate(p.purchasedAt)}</td>
                        <td className="py-2 text-xs text-stone-600">{p.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
                        <td className="py-2 text-right tabular-nums">
                          {money(p.amount)}
                          {p.refundedAmount > 0 && <div className="text-xs text-emerald-600">-{money(p.refundedAmount)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
