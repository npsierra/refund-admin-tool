import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { RefundStatus, RiskFlag, Role } from '../types'
import { STATUS_LABELS } from '../lib/policy'
import { initials, titleCase } from '../lib/format'

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <div className={clsx('rounded-xl border border-stone-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-300',
    success: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
    secondary: 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:text-stone-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
    ghost: 'text-stone-600 hover:bg-stone-100 disabled:text-stone-400',
  }
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

const widthOr = (className?: string) => (className && /\bw-/.test(className) ? '' : 'w-full')

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        widthOr(props.className),
        'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        props.className,
      )}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        widthOr(props.className),
        'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        props.className,
      )}
    />
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        props.className,
      )}
    />
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-stone-600">{children}</label>
}

const STATUS_STYLES: Record<RefundStatus, string> = {
  queued: 'bg-stone-100 text-stone-700 ring-stone-200',
  in_review: 'bg-sky-50 text-sky-700 ring-sky-200',
  pending_second_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-brand-50 text-brand-700 ring-brand-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  executing: 'bg-teal-50 text-teal-700 ring-teal-200',
  completed: 'bg-brand-700 text-white ring-brand-700',
  failed: 'bg-red-50 text-red-700 ring-red-200',
}

export function StatusBadge({ status }: { status: RefundStatus }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[status])}>
      {status === 'executing' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />}
      {STATUS_LABELS[status]}
    </span>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'danger' | 'info' | 'success' }) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-700',
    warn: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-brand-50 text-brand-700',
    success: 'bg-brand-100 text-brand-800',
  }
  return <span className={clsx('inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

export function RiskFlagBadge({ flag }: { flag: RiskFlag }) {
  const danger: RiskFlag[] = ['chargeback_open', 'amount_mismatch', 'velocity']
  return <Badge tone={danger.includes(flag) ? 'danger' : 'warn'}>{titleCase(flag)}</Badge>
}

export function RoleBadge({ role }: { role: Role }) {
  const tones: Record<Role, 'neutral' | 'info' | 'success'> = { analyst: 'neutral', supervisor: 'info', admin: 'success' }
  return <Badge tone={tones[role]}>{titleCase(role)}</Badge>
}

export function Avatar({ name, color, size = 'md' }: { name: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs'
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', sz)} style={{ backgroundColor: color ?? '#64748b' }}>
      {initials(name)}
    </span>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'danger' | 'success' | 'warn' }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className={clsx('mt-2 text-2xl font-semibold tracking-tight', tone === 'danger' ? 'text-rose-600' : tone === 'success' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-stone-900')}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-stone-900">{children}</dd>
    </div>
  )
}
