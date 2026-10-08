import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { useCurrentUser, useStore } from '../store/useStore'
import { Avatar, Button, Card, Field, Input, Label, PageHeader, RoleBadge } from '../components/ui'
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/policy'
import { fullDateTime, money } from '../lib/format'
import type { Policy } from '../lib/policy'

export function SettingsPage() {
  const users = useStore((s) => s.users)
  const policy = useStore((s) => s.policy)
  const seededAt = useStore((s) => s.seededAt)
  const switchUser = useStore((s) => s.switchUser)
  const resetData = useStore((s) => s.resetData)
  const updatePolicy = useStore((s) => s.updatePolicy)
  const audit = useStore((s) => s.audit)
  const me = useCurrentUser()
  const [confirmReset, setConfirmReset] = useState(false)
  const myActions = audit.filter((a) => a.actorId === me.id).length

  return (
    <div>
      <PageHeader title="Settings & Roles" subtitle="Switch the active user to demo each role's permissions. Every switch is recorded in the audit log." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Signed in as" className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar name={me.name} color={me.avatarColor} size="lg" />
            <div>
              <div className="font-medium text-stone-900">{me.name}</div>
              <div className="text-xs text-stone-500">{me.email}</div>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Role">
              <RoleBadge role={me.role} />
            </Field>
            <Field label="Team">{me.team}</Field>
            <Field label="Approval limit">{Number.isFinite(policy.approvalLimits[me.role]) ? money(policy.approvalLimits[me.role]) : 'Unlimited'}</Field>
            <Field label="Actions logged">{myActions}</Field>
          </dl>
        </Card>

        <Card title="Switch user" className="lg:col-span-2">
          <ul className="divide-y divide-stone-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <Avatar name={u.name} color={u.avatarColor} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-900">{u.name}</div>
                  <div className="text-xs text-stone-500">
                    {ROLE_LABELS[u.role]} · {u.team}
                  </div>
                </div>
                {u.id === me.id ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check size={14} /> Active
                  </span>
                ) : (
                  <Button size="sm" onClick={() => switchUser(u.id)}>
                    Switch
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Roles & approval policy" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="pb-2">Role</th>
                <th className="pb-2">Can approve up to</th>
                <th className="pb-2">Execute payouts</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ROLES.map((r) => (
                <tr key={r}>
                  <td className="py-2.5">
                    <RoleBadge role={r} />
                  </td>
                  <td className="py-2.5 font-medium">{Number.isFinite(policy.approvalLimits[r]) ? money(policy.approvalLimits[r]) : 'Unlimited'}</td>
                  <td className="py-2.5">{r === 'analyst' ? 'No' : 'Yes'}</td>
                  <td className="py-2.5 text-xs text-stone-600">{ROLE_DESCRIPTIONS[r]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
            <span className="font-medium text-stone-800">Two-person rule:</span> refunds of {money(policy.twoPersonThreshold)} or more require a second approval from a different Supervisor or Admin before execution.
          </div>
          <PolicyEditor key={`${policy.approvalLimits.analyst}-${policy.approvalLimits.supervisor}-${policy.twoPersonThreshold}`} isAdmin={me.role === 'admin'} policy={policy} onSave={updatePolicy} />
        </Card>

        <Card title="Demo data">
          <p className="text-sm text-stone-600">All data is synthetic and stored in your browser. Reset to return to the original seed.</p>
          <p className="mt-2 text-xs text-stone-400">Seeded {fullDateTime(seededAt)}</p>
          {confirmReset ? (
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  resetData()
                  setConfirmReset(false)
                }}
              >
                Yes, reset everything
              </Button>
              <Button size="sm" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button className="mt-4" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} /> Reset demo data
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}

function PolicyEditor({
  isAdmin,
  policy,
  onSave,
}: {
  isAdmin: boolean
  policy: Policy
  onSave: (p: { analyst: number; supervisor: number; twoPersonThreshold: number }) => { ok: boolean; error?: string }
}) {
  const [analyst, setAnalyst] = useState(String(policy.approvalLimits.analyst))
  const [supervisor, setSupervisor] = useState(String(policy.approvalLimits.supervisor))
  const [threshold, setThreshold] = useState(String(policy.twoPersonThreshold))
  const [error, setError] = useState<string | null>(null)
  const dirty =
    Number(analyst) !== policy.approvalLimits.analyst || Number(supervisor) !== policy.approvalLimits.supervisor || Number(threshold) !== policy.twoPersonThreshold

  if (!isAdmin) {
    return <p className="mt-3 text-xs text-stone-400">Switch to an Admin to change these limits. Every change is recorded in the audit log.</p>
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Edit policy (Admin)</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <Label>Analyst limit ($)</Label>
          <Input type="number" min={0} step="50" value={analyst} onChange={(e) => setAnalyst(e.target.value)} />
        </div>
        <div>
          <Label>Supervisor limit ($)</Label>
          <Input type="number" min={0} step="50" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
        </div>
        <div>
          <Label>Two-person threshold ($)</Label>
          <Input type="number" min={0} step="50" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={!dirty}
            onClick={() => {
              if ([analyst, supervisor, threshold].some((v) => v.trim() === '')) {
                setError('All three amounts are required')
                return
              }
              const res = onSave({ analyst: Number(analyst), supervisor: Number(supervisor), twoPersonThreshold: Number(threshold) })
              setError(res.ok ? null : (res.error ?? 'Could not save'))
            }}
          >
            <Check size={16} /> Save policy
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <p className="mt-2 text-xs text-stone-400">Takes effect immediately for every open case. Changes are written to the audit log as who changed what, from → to.</p>
    </div>
  )
}
