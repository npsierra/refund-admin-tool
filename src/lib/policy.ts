import type { RefundRequest, RefundStatus, Role, User } from '../types'

export const ROLES: Role[] = ['analyst', 'supervisor', 'admin']

export const ROLE_LABELS: Record<Role, string> = {
  analyst: 'Analyst',
  supervisor: 'Supervisor',
  admin: 'Admin',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  analyst: 'Reviews cases and approves refunds up to the analyst limit.',
  supervisor: 'Approves larger refunds and acts as second approver.',
  admin: 'Unlimited approval authority, executes payouts, manages policy.',
}

export interface Policy {
  approvalLimits: Record<Role, number>
  twoPersonThreshold: number
  slaHours: Record<RefundRequest['priority'], number>
}

export const DEFAULT_POLICY: Policy = {
  approvalLimits: {
    analyst: 250,
    supervisor: 2500,
    admin: Number.POSITIVE_INFINITY,
  },
  twoPersonThreshold: 1000,
  slaHours: { low: 120, normal: 72, high: 24 },
}

export const STATUS_LABELS: Record<RefundStatus, string> = {
  queued: 'Queued',
  in_review: 'In Review',
  pending_second_approval: 'Needs 2nd Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  executing: 'Executing',
  completed: 'Completed',
  failed: 'Failed',
}

// Solid fill matching each status pill, for charts/bars.
export const STATUS_BAR: Record<RefundStatus, string> = {
  queued: 'bg-stone-400',
  in_review: 'bg-sky-500',
  pending_second_approval: 'bg-amber-400',
  approved: 'bg-brand-400',
  rejected: 'bg-rose-400',
  executing: 'bg-teal-500',
  completed: 'bg-brand-700',
  failed: 'bg-red-500',
}

export const OPEN_STATUSES: RefundStatus[] = ['queued', 'in_review', 'pending_second_approval', 'approved', 'failed']

export const canApproveAmount = (user: User, amount: number, policy: Policy) =>
  amount <= policy.approvalLimits[user.role]

export const needsSecondApproval = (amount: number, policy: Policy) => amount >= policy.twoPersonThreshold

export const canExecute = (user: User) => user.role === 'admin' || user.role === 'supervisor'

// Any Supervisor or Admin may countersign; the per-role limit applies to the first approval only.
export const canCountersign = (user: User) => user.role === 'admin' || user.role === 'supervisor'

export const canSecondApprove = (user: User, refund: RefundRequest, _policy: Policy) => {
  const first = refund.decisions.find((d) => d.action === 'approve')
  if (!first) return false
  if (first.by === user.id) return false
  return canCountersign(user)
}

export const explainApprovalBlock = (user: User, amount: number, policy: Policy): string | null => {
  const limit = policy.approvalLimits[user.role]
  if (amount > limit) {
    return `Exceeds your ${ROLE_LABELS[user.role]} limit. Escalate to a Supervisor or Admin.`
  }
  return null
}
