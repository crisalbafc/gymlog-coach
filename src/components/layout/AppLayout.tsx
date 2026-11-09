// Adaptado de FitBox (components/layout/*): misma estructura de barra lateral,
// cabecera y navegación inferior en móvil.
import type { ReactNode } from 'react'
import { LayoutDashboard, Users, Settings, LogOut, User as UserIcon, ChevronDown, UsersRound } from 'lucide-react'
import { centerOf } from '@/lib/centers'
import { cn } from '@/lib/utils'
import { navigate } from '@/lib/router'
import { supabase } from '@/lib/supabase'
import type { Coach } from '@/lib/data'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function navFor(coach: Coach) {
  const c = centerOf(coach)
  return [
    { label: 'Panel', to: '/', icon: LayoutDashboard },
    { label: c.cfg.people, to: '/clientes', icon: Users },
    ...(c.has('grupos') ? [{ label: 'Grupos', to: '/grupos', icon: UsersRound }] : []),
    { label: 'Ajustes', to: '/ajustes', icon: Settings },
  ]
}

const isActive = (path: string, to: string) => (to === '/' ? path === '/' : path.startsWith(to))

export function AppLayout({ coach, email, path, children }: { coach: Coach; email: string; path: string; children: ReactNode }) {
  const NAV = navFor(coach)
  const center = centerOf(coach)
  return (
    <div className="min-h-dvh flex bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-background sticky top-0 h-dvh">
        <div className="h-14 flex items-center gap-2 px-6 border-b border-border">
          <img src="./icon-192.png" alt="" className="h-6 w-6 rounded" />
          <span className="font-semibold tracking-tight truncate">{coach.center_name || 'GymLog Coach'}</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.to}
                href={`#${item.to}`}
                className={cn(
                  'flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors',
                  isActive(path, item.to) ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span>{item.label}</span>
              </a>
            )
          })}
        </nav>
        <div className="p-4 text-xs text-muted-foreground border-t border-border">{center.cfg.label}<br />GymLog Coach</div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between gap-3 border-b border-border px-3 sm:px-4 md:px-6 bg-background sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span aria-hidden className="h-6 w-1 rounded-full shrink-0 bg-brand" />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{coach.name}</div>
              <div className="text-xs text-muted-foreground truncate">{coach.center_name ? `${coach.center_name} · ` : ''}código {coach.coach_code}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Menú de cuenta">
                <UserIcon className="h-4 w-4" strokeWidth={1.5} />
                <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm font-medium">{coach.name}</div>
                <div className="text-xs text-muted-foreground">{email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/ajustes')}>
                <Settings className="h-4 w-4 mr-2" strokeWidth={1.5} /> Ajustes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => supabase.auth.signOut()}>
                <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">{children}</main>

        <div className="md:hidden h-16" aria-hidden />
        <nav aria-label="Navegación principal" className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-border bg-background/95 backdrop-blur">
          <ul className="grid h-full" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <a
                    href={`#${item.to}`}
                    className={cn('flex flex-col items-center justify-center h-full gap-1 text-[11px] font-medium', isActive(path, item.to) ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function KpiCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
