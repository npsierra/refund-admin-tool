import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Button, Empty, Input, PageHeader, RoleBadge, Select } from '../components/ui'
import { fullDateTime, money, titleCase } from '../lib/format'
import type { AuditAction } from '../types'

const ACTION_TONE = (a: AuditAction): 'neutral' | 'warn' | 'danger' | 'info' | 'success' => {
  if (a.includes('rejected') || a.includes('failed')) return 'danger'
  if (a.includes('approved') || a.includes('approval') || a.includes('settled')) return 'success'
  if (a.includes('escalated') || a.includes('info_requested')) return 'warn'
  if (a.startsWith('user.') || a.startsWith('system.')) return 'info'
  return 'neutral'
}

export function AuditLog() {
  const audit = useStore((s) => s.audit)
  const users = useStore((s) => s.users)
  const merchants = useStore((s) => s.merchants)
  const [q, setQ] = useState('')
  const [actor, setActor] = useState('all')
  const [action, setAction] = useState('all')
  const [merchant, setMerchant] = useState('all')

  const actions = useMemo(() => Array.from(new Set(audit.map((a) => a.action))).sort(), [audit])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return [...audit]
      .reverse()
      .filter((e) => (actor === 'all' ? true : e.actorId === actor))
      .filter((e) => (action === 'all' ? true : e.action === action))
      .filter((e) => (merchant === 'all' ? true : e.merchantId === merchant))
      .filter((e) => (!needle ? true : [e.refundId, e.actorName, e.reason, e.before, e.after, e.action].some((v) => v?.toLowerCase().includes(needle))))
  }, [audit, q, actor, action, merchant])

  const exportCsv = () => {
    const header = ['id', 'timestamp', 'actor', 'role', 'action', 'refund_id', 'merchant', 'amount', 'before', 'after', 'reason']
    const esc = (v: unknown) => {
      const str = String(v ?? '')
      // Neutralise spreadsheet formula injection (=, +, -, @, tab, CR).
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
      return `"${safe.replace(/"/g, '""')}"`
    }
    const lines = rows.map((e) =>
      [e.id, e.at, e.actorName, e.actorRole, e.action, e.refundId, merchants.find((m) => m.id === e.merchantId)?.name, e.amount, e.before, e.after, e.reason].map(esc).join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Append-only record of every decision and state transition: who, what, when, and how much."
        action={
          <Button onClick={exportCsv}>
            <Download size={14} /> Export CSV ({rows.length})
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-stone-400" />
          <Input placeholder="Search case ID, reason, actor…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={actor} onChange={(e) => setActor(e.target.value)} className="w-44">
          <option value="all">All actors</option>
          <option value="system">System</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-52">
          <option value="all">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={merchant} onChange={(e) => setMerchant(e.target.value)} className="w-52">
          <option value="all">All merchants</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <Empty>No audit entries match.</Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Transition</th>
                <th className="px-4 py-3">Reason / details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((e) => (
                <tr key={e.id} className="align-top hover:bg-stone-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-stone-500">{fullDateTime(e.at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-stone-800">{e.actorName}</div>
                    {e.actorId !== 'system' && <RoleBadge role={e.actorRole} />}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={ACTION_TONE(e.action)}>{e.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {e.refundId ? (
                      <Link to={`/refunds/${e.refundId}`} className="font-medium text-brand-600 hover:underline">
                        {e.refundId}
                      </Link>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-stone-800">{e.amount != null ? money(e.amount) : <span className="text-stone-300">—</span>}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-stone-600">
                    {e.before || e.after ? (
                      <>
                        {e.before ? titleCase(e.before) : '∅'} <span className="text-stone-400">→</span> {e.after ? titleCase(e.after) : '∅'}
                      </>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-2.5 text-xs text-stone-600">
                    {e.reason}
                    {e.metadata && (
                      <div className="mt-0.5 font-mono text-[11px] text-stone-400">
                        {Object.entries(e.metadata)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(' ')}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
