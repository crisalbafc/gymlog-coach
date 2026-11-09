// Tipos de centro y módulos de la plataforma.
// Un tipo de centro = una lista de módulos por defecto + su vocabulario.
// Añadir un tipo nuevo (p. ej. artes marciales) es añadir una entrada aquí.

export type ModuleId = 'seguimiento' | 'grupos' | 'sesion' | 'clases' | 'pagos' | 'wods' | 'prs' | 'feed'
export type CenterType = 'maquinas' | 'reducidas' | 'box' | 'yoga' | 'baile' | 'otro'

export const MODULES: { id: ModuleId; label: string; description: string }[] = [
  { id: 'seguimiento', label: 'Seguimiento individual', description: 'Entrenos, dieta, peso, fotos, notas, rutinas y mensajes de cada cliente.' },
  { id: 'grupos', label: 'Grupos y asistencia', description: 'Grupos con horario y plazas, rutina por grupo y control de asistencia.' },
  { id: 'clases', label: 'Clases y reservas', description: 'Horario semanal, reservas desde el móvil, lista de espera, plazo de cancelación y asistencia.' },
  { id: 'pagos', label: 'Planes y pagos', description: 'Mensualidades y bonos de clases (créditos), renovaciones y registro de cobros.' },
  { id: 'wods', label: 'WOD del día', description: 'Entrenamiento diario por bloques (calentamiento, fuerza, MetCon, accesorio) que ven los socios.' },
  { id: 'prs', label: 'Marcas (PRs)', description: 'Movimientos y benchmarks del centro; cada socio apunta sus marcas y hay ranking.' },
  { id: 'feed', label: 'Novedades (feed)', description: 'Avisos, consejos y recetas con foto para tus socios, con "me gusta" y aviso al móvil.' },
  { id: 'sesion', label: 'Modo sesión en directo', description: 'Pantalla para la tablet en sala: todos los alumnos, su última vez y apuntar sus series.' },
]

/** Módulos que de momento están en FitBox (se integrarán al pasar FitBox a Supabase). */
export const FITBOX_MODULES: string[] = []

export const CENTER_TYPES: Record<CenterType, {
  label: string; description: string; modules: ModuleId[]; people: string; person: string; fitbox?: boolean
}> = {
  maquinas: { label: 'Gimnasio pequeño de máquinas', description: 'Cada cliente entrena por su cuenta con su rutina; tú haces el seguimiento.', modules: ['seguimiento', 'pagos', 'feed'], people: 'Clientes', person: 'cliente' },
  reducidas: { label: 'Clases reducidas (3-8 personas)', description: 'Grupos fijos con horario, rutina común y seguimiento de cada alumno.', modules: ['seguimiento', 'grupos', 'sesion', 'pagos', 'feed'], people: 'Alumnos', person: 'alumno' },
  box: { label: 'Box / gimnasio de clases', description: 'Clases con reservas y lista de espera + seguimiento del rendimiento.', modules: ['clases', 'pagos', 'wods', 'prs', 'feed', 'seguimiento', 'grupos', 'sesion'], people: 'Socios', person: 'socio', fitbox: true },
  yoga: { label: 'Estudio de yoga / pilates', description: 'Clases con reservas, grupos y asistencia, sin kilos ni récords.', modules: ['clases', 'pagos', 'feed', 'grupos'], people: 'Alumnos', person: 'alumno', fitbox: true },
  baile: { label: 'Escuela de baile', description: 'Clases por estilo y nivel con reservas, grupos y asistencia.', modules: ['clases', 'pagos', 'feed', 'grupos'], people: 'Alumnos', person: 'alumno', fitbox: true },
  otro: { label: 'Otro tipo de centro', description: 'Elige tú los módulos que necesitas.', modules: ['seguimiento'], people: 'Clientes', person: 'cliente' },
}

export function centerOf(c: { center_type?: string | null; modules?: string[] | null }) {
  const type = (c.center_type && c.center_type in CENTER_TYPES ? c.center_type : 'maquinas') as CenterType
  const cfg = CENTER_TYPES[type]
  const modules = (c.modules?.length ? c.modules : cfg.modules) as ModuleId[]
  return { type, cfg, modules, has: (m: ModuleId) => modules.includes(m) }
}
