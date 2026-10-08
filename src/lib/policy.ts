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

export const OPEN_STATUSES: RefundStatus[] = ['queued', 'in_review', 'pending_second_approval', 'approved', 'failed']

export const canApproveAmount = (user: User, amount: number, policy: Policy) =>
  amount <= policy.approvalLimits[user.role]

export const needsSecondApproval = (amount: number, policy: Policy) => amount >= policy.twoPersonThreshold

export const canExecute = (user: User) => user.role === 'admin' || user.role === 'supervisor'

export const canSecondApprove = (user: User, refund: RefundRequest, policy: Policy) => {
  const first = refund.decisions.find((d) => d.action === 'approve')
  if (!first) return false
  if (first.by === user.id) return false
  const amount = refund.approvedAmount ?? refund.requestedAmount
  return canApproveAmount(user, amount, policy)
}

export const explainApprovalBlock = (user: User, amount: number, policy: Policy): string | null => {
  const limit = policy.approvalLimits[user.role]
  if (amount > limit) {
    return `Exceeds your ${ROLE_LABELS[user.role]} limit. Escalate to a Supervisor or Admin.`
  }
  return null
}
