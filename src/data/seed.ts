import merchantsJson from './merchants.json'
import usersJson from './users.json'
import type {
  AuditEntry,
  Customer,
  Decision,
  Merchant,
  PaymentMethod,
  Purchase,
  PurchaseItem,
  RefundRequest,
  RefundStatus,
  RefundTrigger,
  RiskFlag,
  User,
} from '../types'
import { DEFAULT_POLICY, canApproveAmount, canCountersign, needsSecondApproval } from '../lib/policy'

export const MERCHANTS = merchantsJson as Merchant[]
export const USERS = usersJson as User[]

// Deterministic PRNG so every fresh load shows the same demo data.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = ['Avery', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Quinn', 'Harper', 'Rowan', 'Emerson', 'Sloane', 'Hayden', 'Noor', 'Mateo', 'Imani', 'Kenji', 'Leila', 'Tobias', 'Zara', 'Felix', 'Anika', 'Luca', 'Maren', 'Omar', 'Greta', 'Idris', 'Nadia', 'Soren', 'Yara', 'Ezra']
const LAST = ['Whitfield', 'Okafor', 'Lindqvist', 'Castellano', 'Nakamura', 'Brennan', 'Delacroix', 'Abernathy', 'Petrova', 'Mbeki', 'Fitzgerald', 'Haddad', 'Kowalski', 'Sandoval', 'Thornbury', 'Ahmadi', 'Vanterpool', 'Osei', 'Marchetti', 'Blackwood']
const COUNTRIES = ['US', 'US', 'US', 'US', 'CA', 'GB', 'US', 'AU']

const CATALOG: Record<string, PurchaseItem[]> = {
  Apparel: [
    { sku: 'NW-JKT-01', name: 'Alpine Shell Jacket', qty: 1, unitPrice: 189 },
    { sku: 'NW-BOOT-07', name: 'Trail Boots', qty: 1, unitPrice: 145 },
    { sku: 'NW-TEE-12', name: 'Merino Tee (3-pack)', qty: 1, unitPrice: 84 },
    { sku: 'NW-PNT-03', name: 'Canvas Work Pants', qty: 2, unitPrice: 68 },
  ],
  'Home & Living': [
    { sku: 'LM-LAMP-2', name: 'Arc Floor Lamp', qty: 1, unitPrice: 229 },
    { sku: 'LM-RUG-8', name: 'Wool Area Rug 8x10', qty: 1, unitPrice: 540 },
    { sku: 'LM-CDL-1', name: 'Soy Candle Set', qty: 2, unitPrice: 32 },
    { sku: 'LM-SHT-Q', name: 'Linen Sheet Set (Queen)', qty: 1, unitPrice: 178 },
  ],
  Electronics: [
    { sku: 'VT-HP-900', name: 'Noise-Cancelling Headphones', qty: 1, unitPrice: 349 },
    { sku: 'VT-MON-32', name: '32" 4K Monitor', qty: 1, unitPrice: 679 },
    { sku: 'VT-CBL-C', name: 'USB-C Cable 2m', qty: 3, unitPrice: 19 },
    { sku: 'VT-SPK-M', name: 'Portable Speaker', qty: 1, unitPrice: 129 },
    { sku: 'VT-LAP-14', name: '14" Ultrabook', qty: 1, unitPrice: 1499 },
  ],
  'Sporting Goods': [
    { sku: 'SP-BK-GRV', name: 'Gravel Bike', qty: 1, unitPrice: 2150 },
    { sku: 'SP-HLM-2', name: 'Road Helmet', qty: 1, unitPrice: 120 },
    { sku: 'SP-TUBE', name: 'Inner Tube', qty: 4, unitPrice: 9 },
    { sku: 'SP-LGT-R', name: 'Rear Light', qty: 1, unitPrice: 45 },
  ],
  Cosmetics: [
    { sku: 'AU-SER-30', name: 'Vitamin C Serum', qty: 1, unitPrice: 68 },
    { sku: 'AU-KIT-01', name: 'Skincare Starter Kit', qty: 1, unitPrice: 142 },
    { sku: 'AU-SPF-50', name: 'Mineral SPF 50', qty: 2, unitPrice: 36 },
  ],
  Travel: [
    { sku: 'TW-FLT-DOM', name: 'Domestic Flight (round trip)', qty: 1, unitPrice: 486 },
    { sku: 'TW-HTL-3N', name: 'Hotel, 3 nights', qty: 1, unitPrice: 712 },
    { sku: 'TW-PKG-7', name: '7-night Vacation Package', qty: 1, unitPrice: 3240 },
    { sku: 'TW-INS', name: 'Trip Insurance', qty: 1, unitPrice: 59 },
  ],
  'SaaS Subscriptions': [
    { sku: 'KS-PRO-M', name: 'Pro Plan (monthly)', qty: 1, unitPrice: 49 },
    { sku: 'KS-TEAM-Y', name: 'Team Plan (annual)', qty: 1, unitPrice: 1188 },
    { sku: 'KS-SEAT', name: 'Additional Seat', qty: 5, unitPrice: 15 },
  ],
  Furniture: [
    { sku: 'HF-SOFA-3', name: '3-Seat Sofa', qty: 1, unitPrice: 1890 },
    { sku: 'HF-CHR-DN', name: 'Dining Chair (set of 4)', qty: 1, unitPrice: 640 },
    { sku: 'HF-TBL-CF', name: 'Coffee Table', qty: 1, unitPrice: 420 },
    { sku: 'HF-SHLF', name: 'Bookshelf', qty: 1, unitPrice: 310 },
  ],
}

const REASONS: Record<RefundTrigger, string[]> = {
  customer_request: [
    'Customer reports item arrived damaged',
    'Customer changed their mind within policy window',
    'Wrong size delivered, customer requests refund instead of exchange',
    'Customer says order never arrived; carrier shows delivered',
    'Duplicate order placed by mistake',
  ],
  return_received: [
    'Return received at warehouse, inspection passed',
    'Return received; item shows signs of use',
    'Partial return received (1 of 2 items)',
  ],
  chargeback: [
    'Chargeback filed: "product not as described"',
    'Chargeback filed: "transaction not recognized"',
  ],
  merchant_initiated: [
    'Merchant cancelled order: out of stock',
    'Merchant issued goodwill credit for late shipment',
    'Price adjustment honoring promo code',
  ],
  fraud_review: [
    'Fraud model flagged transaction post-settlement',
    'Account takeover suspected; customer disputes purchase',
  ],
  manual: ['Manually created by operations'],
}

const TRIGGERS: RefundTrigger[] = [
  'customer_request',
  'customer_request',
  'customer_request',
  'return_received',
  'return_received',
  'chargeback',
  'merchant_initiated',
  'fraud_review',
]

export interface SeedData {
  customers: Customer[]
  purchases: Purchase[]
  refunds: RefundRequest[]
  audit: AuditEntry[]
}

export function generateSeed(now = new Date()): SeedData {
  const rand = mulberry32(20261008)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
  const daysAgo = (d: number, jitterHours = 12) =>
    new Date(now.getTime() - d * 86400000 - rand() * jitterHours * 3600000).toISOString()
  const addHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3600000).toISOString()
  // History events never land in the future: they must read as "ago" right after a reset. Deadlines use addHours.
  const hoursAfter = (iso: string, h: number) =>
    new Date(Math.min(now.getTime() - 60000, new Date(addHours(iso, h)).getTime())).toISOString()

  const customers: Customer[] = []
  for (let i = 0; i < 48; i++) {
    const first = pick(FIRST)
    const last = pick(LAST)
    const name = `${first} ${last}`
    customers.push({
      id: `c_${String(i + 1).padStart(3, '0')}`,
      name,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      country: pick(COUNTRIES),
      joinedAt: daysAgo(int(5, 900)),
      lifetimeSpend: 0,
      priorRefunds: int(0, 4),
    })
  }

  const purchases: Purchase[] = []
  const methods: PaymentMethod[] = ['visa', 'visa', 'mastercard', 'amex', 'ach', 'wallet']
  for (let i = 0; i < 140; i++) {
    const merchant = pick(MERCHANTS)
    const customer = pick(customers)
    const catalog = CATALOG[merchant.category]
    const count = rand() < 0.6 ? 1 : 2
    const items: PurchaseItem[] = []
    for (let k = 0; k < count; k++) {
      const base = pick(catalog)
      if (!items.find((x) => x.sku === base.sku)) items.push({ ...base, unitPrice: base.unitPrice + int(0, 99) / 100 })
    }
    const amount = Math.round(items.reduce((s, it) => s + it.qty * it.unitPrice, 0) * 100) / 100
    customer.lifetimeSpend = Math.round((customer.lifetimeSpend + amount) * 100) / 100
    purchases.push({
      id: `ord_${(100000 + i * 37 + int(0, 9)).toString(36).toUpperCase()}`,
      merchantId: merchant.id,
      customerId: customer.id,
      purchasedAt: daysAgo(int(1, 120)),
      amount,
      currency: 'USD',
      paymentMethod: pick(methods),
      last4: String(int(1000, 9999)),
      items,
      refundedAmount: 0,
    })
  }

  const refunds: RefundRequest[] = []
  const audit: AuditEntry[] = []
  const agents = USERS.filter((u) => u.role === 'analyst')
  const supervisor = USERS.find((u) => u.role === 'supervisor')!
  const finance = USERS.find((u) => u.role === 'admin')!
  const system = { id: 'system', name: 'System', role: 'admin' as const }

  let auditSeq = 0
  const log = (e: Omit<AuditEntry, 'id'>) => {
    audit.push({ id: `aud_${String(++auditSeq).padStart(5, '0')}`, ...e })
  }

  const statusPlan: RefundStatus[] = [
    ...Array<RefundStatus>(9).fill('queued'),
    ...Array<RefundStatus>(6).fill('in_review'),
    ...Array<RefundStatus>(3).fill('pending_second_approval'),
    ...Array<RefundStatus>(3).fill('approved'),
    ...Array<RefundStatus>(6).fill('rejected'),
    ...Array<RefundStatus>(1).fill('executing'),
    ...Array<RefundStatus>(14).fill('completed'),
    ...Array<RefundStatus>(2).fill('failed'),
  ]

  const used = new Set<string>()
  const minTwoPerson = DEFAULT_POLICY.twoPersonThreshold + 50
  statusPlan.forEach((planned, i) => {
    let status = planned
    // Cases seeded as "pending second approval" need a purchase large enough to cross the two-person threshold.
    const needsBig = status === 'pending_second_approval'
    const eligible = purchases.filter((p) => !used.has(p.id) && (!needsBig || p.amount >= minTwoPerson))
    const purchase = eligible.length ? pick(eligible) : pick(purchases.filter((p) => !used.has(p.id)))
    if (needsBig && purchase.amount < minTwoPerson) status = 'approved'
    used.add(purchase.id)
    const merchant = MERCHANTS.find((m) => m.id === purchase.merchantId)!
    const customer = customers.find((c) => c.id === purchase.customerId)!
    const trigger = pick(TRIGGERS)
    const reason = pick(REASONS[trigger])
    const isPartial = status !== 'pending_second_approval' && rand() < 0.3
    const requestedAmount = isPartial ? Math.round(purchase.amount * (0.25 + rand() * 0.5) * 100) / 100 : purchase.amount

    const purchaseAgeDays = (now.getTime() - new Date(purchase.purchasedAt).getTime()) / 86400000
    const flags: RiskFlag[] = []
    if (purchaseAgeDays > merchant.refundPolicyDays) flags.push('outside_policy_window')
    if (customer.priorRefunds >= 3) flags.push('repeat_refunder')
    if (requestedAmount >= 1000) flags.push('high_value')
    if (trigger === 'chargeback') flags.push('chargeback_open')
    if ((now.getTime() - new Date(customer.joinedAt).getTime()) / 86400000 < 30) flags.push('new_account')
    if (rand() < 0.08) flags.push('velocity')

    const isTerminal = ['completed', 'rejected', 'failed', 'executing', 'approved'].includes(status)
    const createdDaysAgo = isTerminal ? int(3, 40) : int(1, 3)
    const createdAt = daysAgo(createdDaysAgo, 20)
    const priority: RefundRequest['priority'] =
      trigger === 'chargeback' || flags.includes('high_value') ? 'high' : rand() < 0.2 ? 'low' : 'normal'
    const slaDueAt = addHours(createdAt, DEFAULT_POLICY.slaHours[priority])

    const refund: RefundRequest = {
      id: `RF-${String(1042 + i).padStart(4, '0')}`,
      purchaseId: purchase.id,
      merchantId: merchant.id,
      customerId: customer.id,
      trigger,
      reason,
      requestedAmount,
      status,
      priority,
      createdAt,
      slaDueAt,
      riskFlags: flags,
      decisions: [],
      notes: [],
    }

    log({
      at: createdAt,
      actorId: system.id,
      actorName: system.name,
      actorRole: system.role,
      action: 'refund.created',
      refundId: refund.id,
      merchantId: merchant.id,
      amount: requestedAmount,
      after: 'queued',
      reason: `Trigger: ${trigger}`,
    })

    const agent = pick(agents)
    let t = hoursAfter(createdAt, 0.5 + rand() * 6)

    if (status !== 'queued') {
      refund.assigneeId = agent.id
      log({ at: t, actorId: agent.id, actorName: agent.name, actorRole: agent.role, action: 'refund.assigned', refundId: refund.id, merchantId: merchant.id, after: agent.name })
      t = hoursAfter(t, 0.2 + rand() * 2)
      log({ at: t, actorId: agent.id, actorName: agent.name, actorRole: agent.role, action: 'refund.review_started', refundId: refund.id, merchantId: merchant.id, before: 'queued', after: 'in_review' })
    }

    if (status === 'in_review' && rand() < 0.5) {
      refund.notes.push({
        id: `note_${i}a`,
        by: agent.id,
        byName: agent.name,
        at: hoursAfter(t, 0.3),
        text: pick([
          'Waiting on carrier tracking confirmation before deciding.',
          'Customer sent photos of damage; looks legitimate.',
          'Asked merchant to confirm restock before approving.',
        ]),
      })
    }

    const decide = (action: Decision['action'], by: User, amount: number, dreason: string) => {
      t = hoursAfter(t, 0.5 + rand() * 8)
      const d: Decision = { action, by: by.id, byName: by.name, role: by.role, at: t, amount, reason: dreason }
      refund.decisions.push(d)
      return d
    }

    if (['pending_second_approval', 'approved', 'executing', 'completed', 'failed'].includes(status)) {
      const approvedAmount =
        status !== 'pending_second_approval' && rand() < 0.15 ? Math.round(requestedAmount * 0.5 * 100) / 100 : requestedAmount
      refund.approvedAmount = approvedAmount
      const needsSecond = needsSecondApproval(approvedAmount, DEFAULT_POLICY)
      if (needsSecond && !refund.riskFlags.includes('high_value')) refund.riskFlags.push('high_value')
      const eligibleFirst = [agent, supervisor, finance].filter((u) => canApproveAmount(u, approvedAmount, DEFAULT_POLICY))
      // Prefer the lowest role that can sign; sometimes let a senior sign so pending cases vary in who must countersign.
      const first = rand() < 0.35 ? pick(eligibleFirst) : eligibleFirst[0]
      decide('approve', first, approvedAmount, approvedAmount < requestedAmount ? 'Partial approval: restocking fee applied' : 'Within policy; evidence verified')
      log({
        at: t,
        actorId: first.id,
        actorName: first.name,
        actorRole: first.role,
        action: approvedAmount < requestedAmount ? 'refund.partially_approved' : 'refund.approved',
        refundId: refund.id,
        merchantId: merchant.id,
        amount: approvedAmount,
        before: 'in_review',
        after: needsSecond ? 'pending_second_approval' : 'approved',
        reason: refund.decisions[0].reason,
      })
      if (needsSecond && status !== 'pending_second_approval') {
        const second = USERS.find((u) => u.id !== first.id && canCountersign(u))
        if (second) {
          decide('approve', second, approvedAmount, 'Second approval: amount above two-person threshold')
          log({ at: t, actorId: second.id, actorName: second.name, actorRole: second.role, action: 'refund.second_approval', refundId: refund.id, merchantId: merchant.id, amount: approvedAmount, before: 'pending_second_approval', after: 'approved' })
        } else {
          // Nobody else is allowed to countersign this amount; leave it waiting.
          status = 'pending_second_approval'
          refund.status = status
        }
      }
    }

    if (status === 'rejected') {
      const rreason = pick([
        'Outside refund policy window',
        'Item returned shows heavy use; not eligible',
        'Carrier confirms delivery with signature',
        'Duplicate of RF-' + String(1000 + int(1, 40)).padStart(4, '0'),
      ])
      decide('reject', rand() < 0.7 ? agent : supervisor, 0, rreason)
      const d = refund.decisions[refund.decisions.length - 1]
      log({ at: t, actorId: d.by, actorName: d.byName, actorRole: d.role, action: 'refund.rejected', refundId: refund.id, merchantId: merchant.id, amount: 0, before: 'in_review', after: 'rejected', reason: rreason })
    }

    if (['executing', 'completed', 'failed'].includes(status)) {
      t = hoursAfter(t, 0.2 + rand() * 3)
      const amount = refund.approvedAmount!
      const execStatus = status === 'executing' ? 'processing' : status === 'completed' ? 'settled' : 'failed'
      refund.execution = {
        startedAt: t,
        processor: merchant.processor,
        amount,
        status: execStatus,
        processorRef: execStatus === 'processing' ? undefined : `${merchant.processor.slice(0, 2).toLowerCase()}_re_${Math.floor(rand() * 1e12).toString(36)}`,
        failureReason: execStatus === 'failed' ? pick(['Card expired; issuer declined credit', 'Processor timeout (504)']) : undefined,
      }
      log({ at: t, actorId: finance.id, actorName: finance.name, actorRole: finance.role, action: 'refund.execution_started', refundId: refund.id, merchantId: merchant.id, amount, before: 'approved', after: 'executing', metadata: { processor: merchant.processor } })
      if (execStatus !== 'processing') {
        t = hoursAfter(t, 0.05 + rand() * 0.5)
        refund.execution.completedAt = t
        log({
          at: t,
          actorId: system.id,
          actorName: system.name,
          actorRole: system.role,
          action: execStatus === 'settled' ? 'refund.execution_settled' : 'refund.execution_failed',
          refundId: refund.id,
          merchantId: merchant.id,
          amount,
          before: 'executing',
          after: execStatus === 'settled' ? 'completed' : 'failed',
          reason: refund.execution.failureReason,
          metadata: refund.execution.processorRef ? { processorRef: refund.execution.processorRef } : undefined,
        })
        if (execStatus === 'settled') purchase.refundedAmount = amount
      }
    }

    refunds.push(refund)
  })

  audit.sort((a, b) => a.at.localeCompare(b.at))
  refunds.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { customers, purchases, refunds, audit }
}
