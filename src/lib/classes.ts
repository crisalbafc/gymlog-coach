import { supabase } from './supabase'

export type ClassTemplate = {
  id: string; name: string; color: string; duration_min: number; capacity: number
  weekdays: number[]; start_time: string | null; active: boolean
}
export type ClassSession = {
  id: string; template_id: string | null; name: string; color: string; starts_at: string
  duration_min: number; capacity: number; status: 'programada' | 'cancelada'
}
export type Booking = {
  id: string; session_id: string; user_id: string; status: 'confirmada' | 'espera' | 'cancelada'
  position: number | null; checked_in_at: string | null; created_at: string
}

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DAYS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export const COLORS = ['#a3e635', '#38bdf8', '#f472b6', '#f59e0b', '#a78bfa', '#34d399', '#f87171']

export function mondayOf(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
export function formatRange(monday: Date) {
  const sun = addDays(monday, 6)
  const f = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${f(monday)} – ${f(sun)}`
}

export async function loadWeek(monday: Date) {
  const { data: sessions, error } = await supabase.from('class_sessions').select('*')
    .gte('starts_at', monday.toISOString()).lt('starts_at', addDays(monday, 7).toISOString()).order('starts_at')
  if (error) throw error
  const ids = (sessions || []).map((s) => s.id)
  const { data: bookings } = ids.length
    ? await supabase.from('bookings').select('*').in('session_id', ids).neq('status', 'cancelada')
    : { data: [] }
  return { sessions: (sessions as ClassSession[]) || [], bookings: (bookings as Booking[]) || [] }
}
