import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MERCHANTS, USERS, generateSeed } from '../data/seed'
import {
  DEFAULT_POLICY,
  canApproveAmount,
  canExecute,
  canSecondApprove,
  needsSecondApproval,
  type Policy,
} from '../lib/policy'
import { uid } from '../lib/format'
import type {
  AuditAction,
  AuditEntry,
  Customer,
  Merchant,
  Purchase,
  RefundRequest,
  RefundStatus,
  RefundTrigger,
  RiskFlag,
  User,
} from '../types'

export interface State {
  users: User[]
  merchants: Merchant[]
  customers: Customer[]
  purchases: Purchase[]
  refunds: RefundRequest[]
  audit: AuditEntry[]
  policy: Policy
  currentUserId: string
  seededAt: string
}

export interface Actions {
  currentUser: () => User
  switchUser: (userId: string) => void
  resetData: () => void
  createRefund: (input: {
    purchaseId: string
    amount: number
    trigger: RefundTrigger
    reason: string
    priority: RefundRequest['priority']
  }) => string
  assignToMe: (refundId: string) => void
  startReview: (refundId: string) => void
  approve: (refundId: string, amount: number, reason: string) => { ok: boolean; error?: string }
  secondApprove: (refundId: string, reason: string) => { ok: boolean; error?: string }
  reject: (refundId: string, reason: string) => { ok: boolean; error?: string }
  escalate: (refundId: string, reason: string) => void
  addNote: (refundId: string, text: string) => void
  execute: (refundId: string) => { ok: boolean; error?: string }
  retry: (refundId: string) => { ok: boolean; error?: string }
  resumeExecuting: () => void
}

const initialState = (): State => {
  const now = new Date()
  const seed = generateSeed(now)
  return {
    users: USERS,
    merchants: MERCHANTS,
    customers: seed.customers,
    purchases: seed.purchases,
    refunds: seed.refunds,
    audit: seed.audit,
    policy: DEFAULT_POLICY,
    currentUserId: USERS[0].id,
    seededAt: now.toISOString(),
  }
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const nowIso = () => new Date().toISOString()

      const log = (entry: Omit<AuditEntry, 'id' | 'at' | 'actorId' | 'actorName' | 'actorRole'> & Partial<Pick<AuditEntry, 'actorId' | 'actorName' | 'actorRole'>>) => {
        const u = get().currentUser()
        const full: AuditEntry = {
          id: uid('aud'),
          at: nowIso(),
          actorId: entry.actorId ?? u.id,
          actorName: entry.actorName ?? u.name,
          actorRole: entry.actorRole ?? u.role,
          ...entry,
        }
        set((s) => ({ audit: [...s.audit, full] }))
      }

      const updateRefund = (id: string, fn: (r: RefundRequest) => RefundRequest) =>
        set((s) => ({ refunds: s.refunds.map((r) => (r.id === id ? fn(r) : r)) }))

      const findRefund = (id: string) => get().refunds.find((r) => r.id === id)

      const transition = (
        refund: RefundRequest,
        to: RefundStatus,
        action: AuditAction,
        extra: Partial<AuditEntry> = {},
      ) => {
        log({ action, refundId: refund.id, merchantId: refund.merchantId, before: refund.status, after: to, ...extra })
      }

      const inFlight = new Set<string>()
      // Simulate an async processor call. ~12% of attempts fail so the retry path is demoable.
      const scheduleSettlement = (refundId: string) => {
        if (inFlight.has(refundId)) return
        inFlight.add(refundId)
        window.setTimeout(() => {
          inFlight.delete(refundId)
          const current = findRefund(refundId)
          if (!current || current.status !== 'executing' || !current.execution) return
          const { amount, processor } = current.execution
          const completedAt = nowIso()
          const system = { actorId: 'system', actorName: 'System', actorRole: 'admin' as const }
          if (Math.random() < 0.12) {
            const failureReason = 'Processor declined: issuer unavailable (try again)'
            updateRefund(refundId, (x) => ({
              ...x,
              status: 'failed',
              execution: { ...x.execution!, status: 'failed', completedAt, failureReason },
            }))
            log({ action: 'refund.execution_failed', refundId, merchantId: current.merchantId, amount, before: 'executing', after: 'failed', reason: failureReason, ...system })
          } else {
            const processorRef = `${processor.slice(0, 2).toLowerCase()}_re_${Math.random().toString(36).slice(2, 12)}`
            updateRefund(refundId, (x) => ({
              ...x,
              status: 'completed',
              execution: { ...x.execution!, status: 'settled', completedAt, processorRef },
            }))
            set((s) => ({
              purchases: s.purchases.map((p) => (p.id === current.purchaseId ? { ...p, refundedAmount: Math.round((p.refundedAmount + amount) * 100) / 100 } : p)),
            }))
            log({ action: 'refund.execution_settled', refundId, merchantId: current.merchantId, amount, before: 'executing', after: 'completed', metadata: { processorRef }, ...system })
          }
        }, 1800 + Math.random() * 1500)
      }

      return {
        ...initialState(),

        currentUser: () => {
          const s = get()
          return s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]
        },

        switchUser: (userId) => {
          const from = get().currentUser()
          const to = get().users.find((u) => u.id === userId)
          if (!to || to.id === from.id) return
          set({ currentUserId: userId })
          log({ action: 'user.role_switched', before: `${from.name} (${from.role})`, after: `${to.name} (${to.role})`, actorId: to.id, actorName: to.name, actorRole: to.role })
        },

        resetData: () => {
          const u = get().currentUser()
          const fresh = initialState()
          set({ ...fresh, currentUserId: u.id })
          log({ action: 'system.data_reset', reason: 'Demo data reset to seed' })
          get().resumeExecuting()
        },

        createRefund: ({ purchaseId, amount, trigger, reason, priority }) => {
          const s = get()
          const purchase = s.purchases.find((p) => p.id === purchaseId)!
          const merchant = s.merchants.find((m) => m.id === purchase.merchantId)!
          const customer = s.customers.find((c) => c.id === purchase.customerId)!
          const ageDays = (Date.now() - new Date(purchase.purchasedAt).getTime()) / 86400000
          const flags: RiskFlag[] = []
          if (ageDays > merchant.refundPolicyDays) flags.push('outside_policy_window')
          if (customer.priorRefunds >= 3) flags.push('repeat_refunder')
          if (amount >= 1000) flags.push('high_value')
          if (amount > purchase.amount - purchase.refundedAmount) flags.push('amount_mismatch')
          if (trigger === 'chargeback') flags.push('chargeback_open')
          const maxSeq = s.refunds.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, '')) || 0), 1041)
          const id = `RF-${maxSeq + 1}`
          const createdAt = nowIso()
          const refund: RefundRequest = {
            id,
            purchaseId,
            merchantId: merchant.id,
            customerId: customer.id,
            trigger,
            reason,
            requestedAmount: amount,
            status: 'queued',
            priority,
            createdAt,
            slaDueAt: new Date(Date.now() + s.policy.slaHours[priority] * 3600000).toISOString(),
            riskFlags: flags,
            decisions: [],
            notes: [],
          }
          set((st) => ({ refunds: [refund, ...st.refunds] }))
          log({ action: 'refund.created', refundId: id, merchantId: merchant.id, amount, after: 'queued', reason: `Trigger: ${trigger}. ${reason}` })
          return id
        },

        assignToMe: (refundId) => {
          const r = findRefund(refundId)
          const u = get().currentUser()
          if (!r || r.assigneeId === u.id) return
          updateRefund(refundId, (x) => ({ ...x, assigneeId: u.id }))
          log({ action: 'refund.assigned', refundId, merchantId: r.merchantId, before: r.assigneeId ?? 'unassigned', after: u.name })
        },

        startReview: (refundId) => {
          const r = findRefund(refundId)
          if (!r || r.status !== 'queued') return
          const u = get().currentUser()
          updateRefund(refundId, (x) => ({ ...x, status: 'in_review', assigneeId: x.assigneeId ?? u.id }))
          if (!r.assigneeId) log({ action: 'refund.assigned', refundId, merchantId: r.merchantId, before: 'unassigned', after: u.name })
          transition(r, 'in_review', 'refund.review_started')
        },

        approve: (refundId, amount, reason) => {
          const r = findRefund(refundId)
          const { policy } = get()
          const u = get().currentUser()
          if (!r) return { ok: false, error: 'Refund not found' }
          if (!['queued', 'in_review'].includes(r.status)) return { ok: false, error: `Cannot approve from status ${r.status}` }
          if (amount <= 0 || amount > r.requestedAmount) return { ok: false, error: 'Amount must be between $0 and the requested amount' }
          if (!canApproveAmount(u, amount, policy)) return { ok: false, error: `Amount exceeds your approval limit` }
          const to: RefundStatus = needsSecondApproval(amount, policy) ? 'pending_second_approval' : 'approved'
          const partial = amount < r.requestedAmount
          updateRefund(refundId, (x) => ({
            ...x,
            status: to,
            approvedAmount: amount,
            assigneeId: x.assigneeId ?? u.id,
            decisions: [...x.decisions, { action: 'approve', by: u.id, byName: u.name, role: u.role, at: nowIso(), amount, reason }],
          }))
          transition(r, to, partial ? 'refund.partially_approved' : 'refund.approved', { amount, reason })
          return { ok: true }
        },

        secondApprove: (refundId, reason) => {
          const r = findRefund(refundId)
          const { policy } = get()
          const u = get().currentUser()
          if (!r || r.status !== 'pending_second_approval') return { ok: false, error: 'Not awaiting second approval' }
          if (!canSecondApprove(u, r, policy)) {
            const first = r.decisions.find((d) => d.action === 'approve')
            if (first?.by === u.id) return { ok: false, error: 'Second approver must be a different person' }
            return { ok: false, error: 'Amount exceeds your approval limit' }
          }
          const amount = r.approvedAmount ?? r.requestedAmount
          updateRefund(refundId, (x) => ({
            ...x,
            status: 'approved',
            decisions: [...x.decisions, { action: 'approve', by: u.id, byName: u.name, role: u.role, at: nowIso(), amount, reason }],
          }))
          transition(r, 'approved', 'refund.second_approval', { amount, reason })
          return { ok: true }
        },

        reject: (refundId, reason) => {
          const r = findRefund(refundId)
          const u = get().currentUser()
          if (!r) return { ok: false, error: 'Refund not found' }
          if (!['queued', 'in_review', 'pending_second_approval'].includes(r.status)) return { ok: false, error: `Cannot reject from status ${r.status}` }
          if (!reason.trim()) return { ok: false, error: 'A reason is required to reject' }
          updateRefund(refundId, (x) => ({
            ...x,
            status: 'rejected',
            decisions: [...x.decisions, { action: 'reject', by: u.id, byName: u.name, role: u.role, at: nowIso(), amount: 0, reason }],
          }))
          transition(r, 'rejected', 'refund.rejected', { amount: 0, reason })
          return { ok: true }
        },

        escalate: (refundId, reason) => {
          const r = findRefund(refundId)
          const u = get().currentUser()
          if (!r) return
          const highSla = new Date(new Date(r.createdAt).getTime() + get().policy.slaHours.high * 3600000).toISOString()
          updateRefund(refundId, (x) => ({
            ...x,
            priority: 'high',
            slaDueAt: x.priority === 'high' ? x.slaDueAt : highSla,
            status: x.status === 'queued' ? 'in_review' : x.status,
            decisions: [...x.decisions, { action: 'escalate', by: u.id, byName: u.name, role: u.role, at: nowIso(), amount: x.requestedAmount, reason }],
          }))
          log({ action: 'refund.escalated', refundId, merchantId: r.merchantId, amount: r.requestedAmount, before: r.priority, after: 'high', reason })
        },

        addNote: (refundId, text) => {
          const r = findRefund(refundId)
          const u = get().currentUser()
          if (!r || !text.trim()) return
          updateRefund(refundId, (x) => ({
            ...x,
            notes: [...x.notes, { id: uid('note'), by: u.id, byName: u.name, at: nowIso(), text }],
          }))
          log({ action: 'refund.note_added', refundId, merchantId: r.merchantId, reason: text })
        },

        execute: (refundId) => {
          const r = findRefund(refundId)
          const u = get().currentUser()
          if (!r) return { ok: false, error: 'Refund not found' }
          if (r.status !== 'approved') return { ok: false, error: 'Only approved refunds can be executed' }
          if (!canExecute(u)) return { ok: false, error: 'Only Supervisors and Admins can execute refunds' }
          const merchant = get().merchants.find((m) => m.id === r.merchantId)!
          const amount = r.approvedAmount ?? r.requestedAmount
          const startedAt = nowIso()
          updateRefund(refundId, (x) => ({
            ...x,
            status: 'executing',
            execution: { startedAt, processor: merchant.processor, amount, status: 'processing' },
          }))
          transition(r, 'executing', 'refund.execution_started', { amount, metadata: { processor: merchant.processor } })
          scheduleSettlement(refundId)
          return { ok: true }
        },

        resumeExecuting: () => {
          // Timers die with the page; re-arm the simulated processor for any case still "executing".
          get().refunds.filter((r) => r.status === 'executing').forEach((r) => scheduleSettlement(r.id))
        },

        retry: (refundId) => {
          const r = findRefund(refundId)
          if (!r || r.status !== 'failed') return { ok: false, error: 'Only failed refunds can be retried' }
          if (!canExecute(get().currentUser())) return { ok: false, error: 'Only Supervisors and Admins can retry execution' }
          updateRefund(refundId, (x) => ({ ...x, status: 'approved', execution: undefined }))
          transition(r, 'approved', 'refund.retried', { amount: r.approvedAmount, reason: r.execution?.failureReason })
          return get().execute(refundId)
        },
      }
    },
    {
      name: 'refund-admin-tool.v1',
      partialize: (s) => ({
        customers: s.customers,
        purchases: s.purchases,
        refunds: s.refunds,
        audit: s.audit,
        policy: s.policy,
        currentUserId: s.currentUserId,
        seededAt: s.seededAt,
      }),
      onRehydrateStorage: () => (state) => state?.resumeExecuting(),
      merge: (persisted, current) => {
        const p = persisted as Partial<State>
        // Approval limits persist Infinity as null; restore it.
        const policy = p.policy
          ? { ...p.policy, approvalLimits: { ...p.policy.approvalLimits, admin: Number.POSITIVE_INFINITY } }
          : current.policy
        return { ...current, ...p, policy, users: USERS, merchants: MERCHANTS }
      },
    },
  ),
)

export const useCurrentUser = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0])
