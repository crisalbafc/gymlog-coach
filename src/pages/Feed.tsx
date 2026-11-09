// Adaptado de FitBox (routes/feed + components/feed/PostCard, PostFormDialog)
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pin, PinOff, Trash2, Heart, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { errMsg, fmtDay, type Coach } from '@/lib/data'

type Post = { id: string; type: 'aviso' | 'consejo' | 'receta' | 'wod'; title: string; content: string; image_path: string | null; pinned: boolean; created_at: string; post_likes: { user_id: string }[] }
const TYPE_LABEL: Record<Post['type'], string> = { aviso: 'Aviso', consejo: 'Consejo', receta: 'Receta', wod: 'WOD' }

async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.82))
}

export default function Feed({ coach }: { coach: Coach }) {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('posts').select('*, post_likes(user_id)').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50)
    if (error) return setError(errMsg(error))
    const list = (data as Post[]) || []
    setPosts(list)
    const paths = list.map((p) => p.image_path).filter(Boolean) as string[]
    if (paths.length) {
      const { data: s } = await supabase.storage.from('center-posts').createSignedUrls(paths, 3600)
      setUrls(Object.fromEntries((s || []).filter((x) => x.signedUrl && x.path).map((x) => [x.path!, x.signedUrl as string])))
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function togglePin(p: Post) { await supabase.from('posts').update({ pinned: !p.pinned }).eq('id', p.id); load() }
  async function remove(p: Post) {
    if (!confirm('¿Borrar esta publicación?')) return
    if (p.image_path) await supabase.storage.from('center-posts').remove([p.image_path])
    await supabase.from('posts').delete().eq('id', p.id); load()
  }

  if (error?.includes('posts')) return <p className="text-sm text-muted-foreground">Falta activar el feed en el servidor (016-wods-marcas-feed.sql).</p>

  return (
    <div className="max-w-2xl">
      <PageHeader title="Novedades" description="Lo que publiques aquí lo ven tus socios en GymLog">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" strokeWidth={1.5} /> Publicar</Button>
      </PageHeader>
      {posts?.length === 0 && <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">El feed está vacío. Crea la primera publicación.</div>}
      <div className="space-y-4">
        {posts?.map((p) => (
          <article key={p.id} className="rounded-lg border border-border bg-card overflow-hidden">
            {p.image_path && urls[p.image_path] && <img src={urls[p.image_path]} alt="" className="w-full max-h-96 object-cover" />}
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{TYPE_LABEL[p.type]}</Badge>
                {p.pinned && <span className="flex items-center gap-1 text-brand"><Pin className="h-3 w-3" /> Fijado</span>}
                <span className="ml-auto">{fmtDay(p.created_at, { day: 'numeric', month: 'short' })}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
              {p.content && <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{p.content}</p>}
              <div className="mt-4 flex items-center gap-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1 mr-auto"><Heart className="h-4 w-4" /> {p.post_likes.length}</span>
                <Button variant="ghost" size="sm" onClick={() => togglePin(p)}>{p.pinned ? <><PinOff className="h-4 w-4" /> Desfijar</> : <><Pin className="h-4 w-4" /> Fijar</>}</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <PostDialog open={open} coachId={coach.user_id} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load() }} />
    </div>
  )
}

function PostDialog({ open, coachId, onClose, onSaved }: { open: boolean; coachId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ type: 'aviso' as Post['type'], title: '', content: '', pinned: false, notify: true })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) { setF({ type: 'aviso', title: '', content: '', pinned: false, notify: true }); setFile(null) } }, [open])

  async function save() {
    setBusy(true)
    try {
      let image_path: string | null = null
      if (file) {
        image_path = `${coachId}/${crypto.randomUUID()}.jpg`
        const up = await supabase.storage.from('center-posts').upload(image_path, await compress(file), { contentType: 'image/jpeg' })
        if (up.error) throw up.error
      }
      const { error } = await supabase.from('posts').insert({ type: f.type, title: f.title.trim(), content: f.content.trim(), pinned: f.pinned, image_path })
      if (error) throw error
      if (f.notify) await supabase.rpc('notify_members', { p_title: `📣 ${f.title.trim()}`, p_body: f.content.trim() })
      toast.success(f.notify ? 'Publicado y aviso enviado a tus socios' : 'Publicado'); onSaved()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva publicación</DialogTitle><DialogDescription>La verán todos tus socios en GymLog.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as Post['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TYPE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2"><Label htmlFor="ptt">Título</Label><Input id="ptt" placeholder="Ej. Este sábado no hay clase" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="ptc">Texto</Label><Textarea id="ptc" rows={4} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
          <div>
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button variant="outline" onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" /> {file ? file.name : 'Añadir foto (opcional)'}</Button>
          </div>
          <label className="flex items-center justify-between"><span className="text-sm">Fijar arriba</span><Switch checked={f.pinned} onCheckedChange={(v) => setF({ ...f, pinned: v })} /></label>
          <label className="flex items-center justify-between"><span className="text-sm">Avisar a los socios en el móvil</span><Switch checked={f.notify} onCheckedChange={(v) => setF({ ...f, notify: v })} /></label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={busy || !f.title.trim()}>{busy ? 'Publicando…' : 'Publicar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
