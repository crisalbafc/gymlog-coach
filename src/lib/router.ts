import { useEffect, useState } from 'react'

// Navegación muy simple con "#/ruta" (funciona en GitHub Pages sin servidor)
export function useRoute(): string {
  const get = () => location.hash.replace(/^#/, '') || '/'
  const [path, setPath] = useState(get)
  useEffect(() => {
    const on = () => { setPath(get()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}
export const navigate = (to: string) => { location.hash = to }
