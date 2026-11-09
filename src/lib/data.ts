import { supabase } from './supabase'

export type Coach = { user_id: string; name: string; coach_code: string; center_name?: string | null; center_type?: string | null; modules?: string[] | null; cancel_hours?: number; require_plan?: boolean }

export type ClientRow = {
  client_id: string; display_name: string; email: string
  status: 'activo' | 'pausa'; next_review: string | null; joined_at: string
  share_workouts: boolean; share_diet: boolean; share_body: boolean; share_photos: boolean
  last_workout_at: string | null; workouts_7d: number | null; workouts_30d: number | null
  last_weight: number | null; last_weight_day: string | null; weight_change_30d: number | null
  last_food_day: string | null; diet_days_7d: number | null; avg_kcal_7d: number | null; avg_protein_7d: number | null
  kcal_goal: number; protein_goal: number
}

export type Alert = { client: ClientRow; kind: 'inactivo' | 'dieta' | 'revision' | 'peso' | 'plan'; text: string; level: 'alta' | 'media' }

export async function loadCoach(): Promise<Coach | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('coaches').select('*').eq('user_id', user.id).maybeSingle()
  return (data as Coach) || null
}

export async function loadClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase.rpc('coach_overview')
  if (error) throw error
  return (data as ClientRow[]) || []
}

/** Días desde una fecha (ISO o AAAA-MM-DD) hasta hoy. */
export function daysSince(d: string | null): number | null {
  if (!d) return null
  const t = d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)
  return Math.floor((Date.now() - t.getTime()) / 86400000)
}

/** Alertas automáticas para el panel. */
export function buildAlerts(clients: ClientRow[]): Alert[] {
  const out: Alert[] = []
  for (const c of clients) {
    if (c.status === 'pausa') continue
    if (c.share_workouts) {
      const d = daysSince(c.last_workout_at)
      if (d === null) out.push({ client: c, kind: 'inactivo', level: 'media', text: 'Aún no ha registrado ningún entreno' })
      else if (d >= 5) out.push({ client: c, kind: 'inactivo', level: d >= 10 ? 'alta' : 'media', text: `Lleva ${d} días sin entrenar` })
    }
    if (c.share_diet) {
      const d = daysSince(c.last_food_day)
      if (d !== null && d >= 3) out.push({ client: c, kind: 'dieta', level: 'media', text: `No apunta comidas desde hace ${d} días` })
      else if (c.avg_kcal_7d && c.kcal_goal && Math.abs(c.avg_kcal_7d - c.kcal_goal) / c.kcal_goal > 0.2)
        out.push({ client: c, kind: 'dieta', level: 'media', text: `Media de ${c.avg_kcal_7d} kcal (objetivo ${c.kcal_goal})` })
    }
    if (c.next_review) {
      const d = daysSince(c.next_review)
      if (d !== null && d >= 0) out.push({ client: c, kind: 'revision', level: d > 0 ? 'alta' : 'media', text: d === 0 ? 'Tiene revisión hoy' : `Revisión pendiente desde hace ${d} días` })
    }
    if (c.share_body && c.weight_change_30d !== null && Math.abs(c.weight_change_30d) >= 3)
      out.push({ client: c, kind: 'peso', level: 'media', text: `Ha cambiado ${c.weight_change_30d > 0 ? '+' : ''}${c.weight_change_30d} kg en 30 días` })
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'alta' ? -1 : 1))
}

export const fmtDay = (d: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  (d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)).toLocaleDateString('es-ES', o)
export const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function relDays(d: string | null) {
  const n = daysSince(d)
  if (n === null) return '—'
  return n <= 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`
}
export function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message || String(e)
  if (m.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
  if (m.includes('Failed to fetch')) return 'Sin conexión'
  return m
}
