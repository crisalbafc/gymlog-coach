import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { fmtDay } from '@/lib/data'

type P = { id: string; name: string | null; started_at: string; photo_path: string }

export function PhotosTab({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<P[] | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [big, setBig] = useState<P | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('workouts').select('id,name,started_at,photo_path')
        .eq('user_id', clientId).not('photo_path', 'is', null).order('started_at', { ascending: false }).limit(40)
      const list = (data as P[]) || []
      setItems(list)
      if (list.length) {
        const { data: signed } = await supabase.storage.from('workout-photos').createSignedUrls(list.map((p) => p.photo_path), 3600)
        setUrls(Object.fromEntries((signed || []).filter((s) => s.signedUrl && s.path).map((s) => [s.path!, s.signedUrl as string])))
      }
    })()
  }, [clientId])

  if (!items) return <Skeleton className="h-48 w-full" />
  if (!items.length) return <p className="text-sm text-muted-foreground">No tiene fotos de entrenos.</p>

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((p) => (
          <button key={p.id} onClick={() => setBig(p)} className="rounded-lg overflow-hidden border border-border bg-card text-left">
            {urls[p.photo_path] ? <img src={urls[p.photo_path]} alt="" loading="lazy" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-muted" />}
            <div className="p-2 text-xs text-muted-foreground">{fmtDay(p.started_at, { weekday: 'short', day: 'numeric', month: 'short' })}{p.name ? ` · ${p.name}` : ''}</div>
          </button>
        ))}
      </div>
      <Dialog open={!!big} onOpenChange={(o) => !o && setBig(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{big && fmtDay(big.started_at, { weekday: 'long', day: 'numeric', month: 'long' })}</DialogTitle>
          {big && urls[big.photo_path] && <img src={urls[big.photo_path]} alt="" className="w-full max-h-[75vh] object-contain rounded-md" />}
        </DialogContent>
      </Dialog>
    </>
  )
}
