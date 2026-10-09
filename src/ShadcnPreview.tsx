import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function ShadcnPreview() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  return <main ref={setPortalContainer} className="wf-shadcn" style={{minHeight:'100dvh',background:'var(--sc-background)',color:'var(--sc-foreground)',padding:'24px',display:'grid',placeItems:'center'}}>
    <div style={{width:'100%',maxWidth:480}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}><a href="/">WebFactory PR</a></div>
      <Card>
        <CardHeader><CardTitle role="heading" aria-level={1}>Shadcn instalado</CardTitle><CardDescription>Componentes reales: Button, Card, Input y Dialog. Esta prueba no guarda datos.</CardDescription></CardHeader>
        <CardContent>
          <form style={{display:'grid',gap:16}} onSubmit={event=>{event.preventDefault();setMessage(name.trim()?`Funciona, ${name.trim()}.`:'El botón funciona.')}}>
            <label htmlFor="component-name">Nombre de prueba</label>
            <Input id="component-name" value={name} onChange={event=>setName(event.target.value)} autoComplete="off" style={{fontSize:16}}/>
            <Button type="submit">Probar componente</Button>
            <p role="status" aria-live="polite">{message}</p>
          </form>
          <Dialog>
            <DialogTrigger asChild><Button type="button" variant="outline" style={{marginTop:16}}>Probar diálogo</Button></DialogTrigger>
            <DialogContent portalContainer={portalContainer}>
              <DialogHeader><DialogTitle>Diálogo de prueba</DialogTitle><DialogDescription>Comprueba el foco, el cierre con Escape y los colores del tema. Esta prueba no modifica tu negocio.</DialogDescription></DialogHeader>
              <DialogFooter><DialogClose asChild><Button type="button">Cerrar diálogo</Button></DialogClose></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      <p style={{fontSize:14,marginTop:20}}>El MCP prepara los siguientes componentes en una rama y PR. La publicación se aprueba aparte.</p>
    </div>
  </main>
}
