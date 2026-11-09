# GymLog Coach

Panel web para entrenadores conectado a la base de datos de [GymLog](https://crisalbafc.github.io/gym-app/).
Diseño y componentes reutilizados de FitBox (fitbox-core-foundation): tema, barra lateral, cabecera,
navegación móvil, tarjetas KPI, gráficas y componentes shadcn/ui.

- El entrenador entra con su cuenta de GymLog y activa el modo entrenador (recibe un código).
- Los clientes meten ese código en GymLog → Ajustes → Mi entrenador y eligen qué comparten.
- Panel con KPIs y alertas, lista de clientes, ficha con entrenos, dieta, cuerpo, fotos,
  notas privadas, estado/revisión, objetivos de dieta, rutinas asignadas y mensajes.

Base de datos: `gym-app/supabase/012-entrenador.sql`.

- Local: `npm install` y `npm run dev`
- Publicar: `npm run deploy`
