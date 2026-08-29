import type { JSX } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { Wordmark } from './Logo'
import {
  IconClass,
  IconFlag,
  IconHomework,
  IconLesson,
  IconNotice,
  IconRegister,
  IconSettings,
  IconSignOut,
  IconToday,
} from './Icons'

/* ---------------------------------------------------------------------------
   Two shells in one component.

   Phone: ink top bar, thumb-zone bottom nav, single column.
   Desktop (lg+): fixed ink sidebar, wider content column, no bottom nav.

   Same routes, same components. Only the chrome changes.
--------------------------------------------------------------------------- */

type Item = {
  to: string
  label: string
  Icon: (p: { className?: string }) => JSX.Element
  /** false keeps it out of the phone bottom bar, which only fits four. */
  mobile?: boolean
}

const NAV: Record<string, Item[]> = {
  admin: [
    { to: '/admin', label: 'Today', Icon: IconToday },
    { to: '/teacher', label: 'Register', Icon: IconRegister },
    { to: '/teacher/lesson', label: 'Lesson', Icon: IconLesson },
    { to: '/admin/flagged', label: 'Flagged', Icon: IconFlag },
    { to: '/admin/classes', label: 'Classes', Icon: IconClass, mobile: false },
    { to: '/admin/teachers', label: 'Teachers', Icon: IconClass, mobile: false },
    { to: '/admin/notices', label: 'Notices', Icon: IconNotice, mobile: false },
  ],
  teacher: [
    { to: '/teacher', label: 'Register', Icon: IconRegister },
    { to: '/teacher/lesson', label: 'Lesson', Icon: IconLesson },
  ],
  parent: [
    { to: '/parent', label: 'Today', Icon: IconToday },
    { to: '/parent/homework', label: 'Homework', Icon: IconHomework },
    { to: '/parent/notices', label: 'Notices', Icon: IconNotice },
    { to: '/parent/settings', label: 'Settings', Icon: IconSettings, mobile: false },
  ],
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, school, signOut } = useAuth()
  const navigate = useNavigate()
  const items = NAV[profile?.role ?? 'parent'] ?? []
  const settingsPath = items.find((i) => i.label === 'Settings')?.to

  async function out() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-paper">
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] bg-ink text-ink-invert
                   flex-col z-20"
      >
        <div className="px-6 py-6">
          <Wordmark size="sm" className="text-ink-invert" />
        </div>

        <div className="px-6 pb-5">
          <div className="text-[13px] font-semibold truncate">{school?.name ?? ''}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45 mt-0.5">
            {profile?.role}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split('/').length === 2}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-md text-[14px] transition-colors
                 ${isActive
                   ? 'bg-ink-invert/10 text-ink-invert font-semibold'
                   : 'text-ink-invert/60 hover:text-ink-invert hover:bg-ink-invert/6'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'text-brass' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-5">
          <button
            onClick={out}
            className="flex items-center gap-3 h-10 w-full px-3 rounded-md text-[14px]
                       text-ink-invert/50 hover:text-ink-invert hover:bg-ink-invert/6 transition-colors"
          >
            <IconSignOut />
            Sign out
          </button>
        </div>
      </aside>

      {/* ---------- Phone top bar ---------- */}
      <header className="lg:hidden sticky top-0 z-10 bg-ink text-ink-invert">
        <div className="px-4 h-14 flex items-center gap-3">
          <Wordmark size="xs" className="text-ink-invert shrink-0" />
          <span className="h-5 w-px bg-ink-invert/20 shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight truncate">
              {school?.name ?? ''}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-invert/50">
              {profile?.role}
            </div>
          </div>
          {settingsPath && (
            <NavLink
              to={settingsPath}
              className="ml-auto p-2 text-ink-invert/55 hover:text-brass transition-colors"
              aria-label="Settings"
            >
              <IconSettings />
            </NavLink>
          )}
          <button
            onClick={out}
            className={`p-2 -mr-2 text-ink-invert/55 hover:text-brass transition-colors ${settingsPath ? '' : 'ml-auto'}`}
            aria-label="Sign out"
          >
            <IconSignOut />
          </button>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-3xl px-4 lg:px-10 py-5 lg:py-10 pb-24 lg:pb-12">
          {children}
        </div>
      </main>

      {/* ---------- Phone bottom nav ---------- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-rule z-10">
        <div className="flex pb-[env(safe-area-inset-bottom)]">
          {items.filter((i) => i.mobile !== false).map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split('/').length === 2}
              className={({ isActive }) =>
                `flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[10px]
                 font-mono uppercase tracking-[0.1em] border-t-2 transition-colors
                 ${isActive
                   ? 'border-brass text-ink'
                   : 'border-transparent text-ink-faint hover:text-ink-soft'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'text-brass' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

