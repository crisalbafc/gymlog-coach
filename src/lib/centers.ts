// Tipos de centro y módulos de la plataforma.
// Un tipo de centro = una lista de módulos por defecto + su vocabulario.
// Añadir un tipo nuevo (p. ej. artes marciales) es añadir una entrada aquí.

export type ModuleId = 'seguimiento' | 'grupos' | 'sesion'
export type CenterType = 'maquinas' | 'reducidas' | 'box' | 'yoga' | 'baile' | 'otro'

export const MODULES: { id: ModuleId; label: string; description: string }[] = [
  { id: 'seguimiento', label: 'Seguimiento individual', description: 'Entrenos, dieta, peso, fotos, notas, rutinas y mensajes de cada cliente.' },
  { id: 'grupos', label: 'Grupos y asistencia', description: 'Grupos con horario y plazas, rutina por grupo y control de asistencia.' },
  { id: 'sesion', label: 'Modo sesión en directo', description: 'Pantalla para la tablet en sala: todos los alumnos, su última vez y apuntar sus series.' },
]

/** Módulos que de momento están en FitBox (se integrarán al pasar FitBox a Supabase). */
export const FITBOX_MODULES = ['Horario de clases y reservas', 'Lista de espera', 'Bonos y pagos', 'WODs y PRs', 'Feed del centro']

export const CENTER_TYPES: Record<CenterType, {
  label: string; description: string; modules: ModuleId[]; people: string; person: string; fitbox?: boolean
}> = {
  maquinas: { label: 'Gimnasio pequeño de máquinas', description: 'Cada cliente entrena por su cuenta con su rutina; tú haces el seguimiento.', modules: ['seguimiento'], people: 'Clientes', person: 'cliente' },
  reducidas: { label: 'Clases reducidas (3-8 personas)', description: 'Grupos fijos con horario, rutina común y seguimiento de cada alumno.', modules: ['seguimiento', 'grupos', 'sesion'], people: 'Alumnos', person: 'alumno' },
  box: { label: 'Box / gimnasio de clases', description: 'Clases con reservas y bonos (FitBox) + seguimiento del rendimiento.', modules: ['seguimiento', 'grupos', 'sesion'], people: 'Socios', person: 'socio', fitbox: true },
  yoga: { label: 'Estudio de yoga / pilates', description: 'Clases por grupos y asistencia, sin kilos ni récords.', modules: ['grupos'], people: 'Alumnos', person: 'alumno', fitbox: true },
  baile: { label: 'Escuela de baile', description: 'Grupos por estilo y nivel, asistencia y avisos.', modules: ['grupos'], people: 'Alumnos', person: 'alumno', fitbox: true },
  otro: { label: 'Otro tipo de centro', description: 'Elige tú los módulos que necesitas.', modules: ['seguimiento'], people: 'Clientes', person: 'cliente' },
}

export function centerOf(c: { center_type?: string | null; modules?: string[] | null }) {
  const type = (c.center_type && c.center_type in CENTER_TYPES ? c.center_type : 'maquinas') as CenterType
  const cfg = CENTER_TYPES[type]
  const modules = (c.modules?.length ? c.modules : cfg.modules) as ModuleId[]
  return { type, cfg, modules, has: (m: ModuleId) => modules.includes(m) }
}
