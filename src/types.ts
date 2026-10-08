export type Role = 'analyst' | 'supervisor' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  team: string
  avatarColor: string
}

export interface Merchant {
  id: string
  name: string
  category: string
  country: string
  processor: 'Stripe' | 'Adyen' | 'Braintree' | 'Checkout.com'
  refundPolicyDays: number
  riskTier: 'low' | 'medium' | 'high'
}

export interface Customer {
  id: string
  name: string
  email: string
  country: string
  joinedAt: string
  lifetimeSpend: number
  priorRefunds: number
}

export type PaymentMethod = 'visa' | 'mastercard' | 'amex' | 'ach' | 'wallet'

export interface PurchaseItem {
  sku: string
  name: string
  qty: number
  unitPrice: number
}

export interface Purchase {
  id: string
  merchantId: string
  customerId: string
  purchasedAt: string
  amount: number
  currency: 'USD'
  paymentMethod: PaymentMethod
  last4: string
  items: PurchaseItem[]
  refundedAmount: number
}

export type RefundTrigger =
  | 'customer_request'
  | 'return_received'
  | 'chargeback'
  | 'merchant_initiated'
  | 'fraud_review'
  | 'manual'

export type RefundStatus =
  | 'queued'
  | 'in_review'
  | 'pending_second_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'

export type RiskFlag =
  | 'outside_policy_window'
  | 'repeat_refunder'
  | 'high_value'
  | 'amount_mismatch'
  | 'new_account'
  | 'chargeback_open'
  | 'velocity'

export interface Decision {
  action: 'approve' | 'reject' | 'escalate' | 'request_info'
  by: string
  byName: string
  role: Role
  at: string
  amount: number
  reason: string
}

export interface Execution {
  startedAt: string
  completedAt?: string
  processor: Merchant['processor']
  processorRef?: string
  amount: number
  status: 'processing' | 'settled' | 'failed'
  failureReason?: string
}

export interface Note {
  id: string
  by: string
  byName: string
  at: string
  text: string
}

export interface RefundRequest {
  id: string
  purchaseId: string
  merchantId: string
  customerId: string
  trigger: RefundTrigger
  reason: string
  requestedAmount: number
  approvedAmount?: number
  status: RefundStatus
  priority: 'low' | 'normal' | 'high'
  createdAt: string
  slaDueAt: string
  assigneeId?: string
  riskFlags: RiskFlag[]
  decisions: Decision[]
  execution?: Execution
  notes: Note[]
}

export type AuditAction =
  | 'refund.created'
  | 'refund.assigned'
  | 'refund.review_started'
  | 'refund.approved'
  | 'refund.partially_approved'
  | 'refund.rejected'
  | 'refund.escalated'
  | 'refund.info_requested'
  | 'refund.second_approval'
  | 'refund.execution_started'
  | 'refund.execution_settled'
  | 'refund.execution_failed'
  | 'refund.retried'
  | 'refund.note_added'
  | 'user.role_switched'
  | 'system.data_reset'

export interface AuditEntry {
  id: string
  at: string
  actorId: string
  actorName: string
  actorRole: Role
  action: AuditAction
  refundId?: string
  merchantId?: string
  amount?: number
  before?: string
  after?: string
  reason?: string
  metadata?: Record<string, string | number | boolean>
}
