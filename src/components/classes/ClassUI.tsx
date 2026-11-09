// Adaptado de FitBox (components/classes/WeekNavigator, OccupancyBar, SessionCard)
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatRange, hhmm, type ClassSession } from '@/lib/classes'

export function WeekNavigator({ monday, onPrev, onNext, onToday }: { monday: Date; onPrev: () => void; onNext: () => void; onToday: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrev} aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" strokeWidth={1.5} /></Button>
      <Button variant="outline" size="icon" onClick={onNext} aria-label="Semana siguiente"><ChevronRight className="h-4 w-4" strokeWidth={1.5} /></Button>
      <Button variant="ghost" onClick={onToday} className="h-9">Hoy</Button>
      <div className="ml-2 text-sm text-muted-foreground">{formatRange(monday)}</div>
    </div>
  )
}

export function OccupancyBar({ confirmed, capacity, className }: { confirmed: number; capacity: number; className?: string }) {
  const pct = capacity === 0 ? 0 : Math.min(100, Math.round((confirmed / capacity) * 100))
  const color = confirmed >= capacity ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function SessionCard({ session, confirmed, waiting, onClick }: { session: ClassSession; confirmed: number; waiting: number; onClick?: () => void }) {
  const cancelled = session.status === 'cancelada'
  return (
    <button type="button" onClick={onClick}
      className={cn('w-full text-left rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/40', cancelled && 'opacity-60')}>
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: session.color }} />
        <span className="text-sm font-semibold truncate">{session.name}</span>
        {cancelled && <span className="ml-auto text-[10px] uppercase tracking-wide text-red-400 font-medium">Cancelada</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" strokeWidth={1.5} />{hhmm(session.starts_at)} · {session.duration_min} min
      </div>
      {!cancelled && (
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Ocupación</span>
            <span className="font-medium">{confirmed}/{session.capacity}{waiting > 0 && <span className="text-muted-foreground"> · +{waiting} lista</span>}</span>
          </div>
          <OccupancyBar confirmed={confirmed} capacity={session.capacity} />
        </div>
      )}
    </button>
  )
}
