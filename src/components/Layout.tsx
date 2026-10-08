import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Building2, ClipboardList, LayoutDashboard, PlusCircle, ScrollText, Settings, Inbox } from 'lucide-react'
import { clsx } from 'clsx'
import { useCurrentUser, useStore } from '../store/useStore'
import { Avatar, RoleBadge } from './ui'
import { money, titleCase } from '../lib/format'
import { OPEN_STATUSES } from '../lib/policy'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/queue', label: 'Refund Queue', icon: Inbox },
  { to: '/new', label: 'New Refund', icon: PlusCircle },
  { to: '/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/merchants', label: 'Merchants', icon: Building2 },
]

export function Layout() {
  const user = useCurrentUser()
  const openCount = useStore((s) => s.refunds.filter((r) => OPEN_STATUSES.includes(r.status)).length)
  const navigate = useNavigate()

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-brand-100 bg-brand-50 text-stone-700">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
            <ClipboardList size={18} />
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight text-brand-900">Refund Admin</div>
            <div className="text-[11px] text-brand-600">AcmePay Operations</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition [&_svg]:text-brand-700',
                  isActive ? 'active bg-brand-700 text-white [&_svg]:text-white' : 'text-stone-700 hover:bg-brand-100 hover:text-brand-900',
                )
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {to === '/queue' && openCount > 0 && (
                <span className="rounded-full bg-brand-200/70 px-1.5 text-[11px] font-semibold text-brand-900 group-[.active]:bg-white/20 group-[.active]:text-white">{openCount}</span>
              )}
            </NavLink>
          ))}
          <div className="pt-4">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">Account</div>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition [&_svg]:text-brand-700',
                  isActive ? 'active bg-brand-700 text-white [&_svg]:text-white' : 'text-stone-700 hover:bg-brand-100 hover:text-brand-900',
                )
              }
            >
              <Settings size={16} />
              Settings & Roles
            </NavLink>
          </div>
        </nav>
        <button
          onClick={() => navigate('/settings')}
          className="m-3 flex items-center gap-3 rounded-lg border border-brand-100 bg-white p-3 text-left transition hover:bg-brand-100/60"
        >
          <Avatar name={user.name} color={user.avatarColor} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-stone-900">{user.name}</div>
            <div className="mt-0.5">
              <RoleBadge role={user.role} />
            </div>
          </div>
        </button>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  )
}

function Toaster() {
  const last = useStore((s) => s.audit[s.audit.length - 1])
  const seen = useRef(last?.id)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!last || last.id === seen.current) return
    seen.current = last.id
    const verb = titleCase(last.action.split('.').pop() ?? last.action)
    setToast([verb, last.refundId, last.amount != null ? money(last.amount) : null].filter(Boolean).join(' · '))
    const t = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(t)
  }, [last])
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
      {toast}
    </div>
  )
}
