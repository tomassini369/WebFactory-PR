import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReceiptDetails from './receipt-original/Receipt'
import SlotPrinter from './receipt-original/SlotPrinter'
import { sound } from './receipt-original/audio'
import { feedback } from './feedback/feedback'
import './receipt-original/original.css'
import './receipt-original/integration.css'

export type ReceiptRecord = {
  receiptId: string; transactionId: string; total: number; paymentStatus: string; createdAt: string
  customer: { name: string; email: string }
  businessName?: string; logoUrl?: string; demo?: boolean
  items?: Array<{ name: string; quantity: number; unitAmount: number; amount: number }>
  subtotal?: number; discounts?: number; tax?: number; tip?: number; paymentMethod?: string
}

/** Original printer timeline and 3D interactions, bound to the saved receipt. */
export default function ReceiptPaper(props: { receipt: ReceiptRecord; lang: 'es' | 'en'; timeZone?: string }) {
  // Changing records cancels all pending effects and starts a fresh printer.
  return <ReceiptPrinter key={props.receipt.receiptId + props.receipt.transactionId} {...props} />
}
function ReceiptPrinter(props: { receipt: ReceiptRecord; lang: 'es' | 'en'; timeZone?: string }) {
  const es = props.lang === 'es'
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [printState, setPrintState] = useState('printing')
  const [printProgress, setPrintProgress] = useState(0)
  const [paperHeight, setPaperHeight] = useState(440)
  const [isSoundMuted, setIsSoundMuted] = useState(!feedback.getPreferences().soundEnabled)
  const sheet = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const frame = useRef(0)
  const tearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const feedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const state = useRef(printState)
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const clear = () => {
    cancelAnimationFrame(frame.current)
    clearTimeout(tearTimer.current)
    clearTimeout(feedTimer.current)
    sound.stopPrintSound()
  }
  const startPrint = (userAction = true) => {
    clear()
    dialog.current?.close()
    if (reduced()) { state.current = 'completed'; setPrintState('completed'); setPrintProgress(100); return }
    state.current = 'printing'; setPrintState('printing'); setPrintProgress(0)
    if (userAction) sound.startPrintSound()
    const start = performance.now()
    const tick = (now: number) => {
      // The original 18ms / 0.72% feed takes 2.5 seconds.
      const progress = Math.min(100, (now - start) / 25)
      setPrintProgress(progress)
      if (progress < 100) frame.current = requestAnimationFrame(tick)
      else {
        state.current = 'completed'; setPrintState('completed'); sound.stopPrintSound()
        if (userAction) { sound.playCutterSound(); sound.playSuccessChime() }
      }
    }
    frame.current = requestAnimationFrame(tick)
  }
  const inspect = () => { clearTimeout(tearTimer.current); setInspectorOpen(true) }
  useEffect(() => { if (inspectorOpen && !dialog.current?.open) dialog.current?.showModal() }, [inspectorOpen])
  const tear = () => {
    if (state.current !== 'completed') return
    sound.playTearSound(); state.current = 'torn'; setPrintState('torn')
    tearTimer.current = setTimeout(inspect, reduced() ? 0 : 1100)
  }
  useLayoutEffect(() => {
    if (!sheet.current) return
    // scrollHeight is unaffected by the enclosing 3D projection.
    const measureSheet = () => setPaperHeight(sheet.current!.scrollHeight + 12)
    measureSheet()
    const observer = new ResizeObserver(measureSheet); observer.observe(sheet.current)
    return () => observer.disconnect()
  }, [props.receipt, props.lang])
  useEffect(() => {
    startPrint(false)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => { if (media.matches) { clear(); state.current = 'completed'; setPrintState('completed'); setPrintProgress(100) } }
    media.addEventListener('change', onMotion)
    const unsubscribe = feedback.subscribe(p => {
      sound.isMuted = !p.soundEnabled; setIsSoundMuted(!p.soundEnabled)
      if (!p.soundEnabled) sound.stopPrintSound()
    })
    return () => { clear(); unsubscribe(); media.removeEventListener('change', onMotion) }
  }, [])
  return <div className="wf-original-receipt" data-print-state={printState}>
    <SlotPrinter lang={props.lang} maxPaperHeight={paperHeight} printState={printState} printProgress={printProgress}
      onStartPrint={() => startPrint()} onTearReceipt={tear} onOpenInspector={inspect}
      onFeedPaper={() => { if (state.current === 'printing') return; sound.startPrintSound(); feedTimer.current = setTimeout(() => sound.stopPrintSound(), 200) }}
      onReset={() => { clear(); state.current = 'idle'; setPrintState('idle'); setPrintProgress(0) }}
      isSoundMuted={isSoundMuted} onToggleSound={() => { const enabled = !feedback.getPreferences().soundEnabled; sound.isMuted = !enabled; feedback.setSoundEnabled(enabled); setIsSoundMuted(!enabled); if (enabled) feedback.unlockAudio() }}>
      <div ref={sheet}><ReceiptDetails {...props} /></div>
    </SlotPrinter>
    <span className="wf-receipt-status" role="status">{printState === 'printing' ? (es ? 'Imprimiendo recibo' : 'Printing receipt') : printState === 'torn' ? (es ? 'Recibo desprendido' : 'Receipt detached') : printState === 'idle' ? (es ? 'Listo para imprimir' : 'Ready to print') : (es ? 'Recibo listo' : 'Receipt ready')}</span>
    <dialog ref={dialog} className="inspector-modal" onClose={() => setInspectorOpen(false)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close() }} aria-label={es ? 'Inspeccionar recibo' : 'Inspect receipt'}>
      {inspectorOpen && <>
      <div className="inspector-header"><div className="inspector-title"><h3>{es ? 'Recibo desprendido' : 'Collected receipt'}</h3></div><button type="button" className="inspector-close-btn" autoFocus onClick={() => dialog.current?.close()} aria-label={es ? 'Cerrar' : 'Close'}>✕</button></div>
      <div className="inspector-body"><div className="inspector-receipt-wrapper"><ReceiptDetails {...props} /></div></div>
      <div className="inspector-actions"><button type="button" className="inspector-action-btn secondary" onClick={() => dialog.current?.ownerDocument.defaultView?.print()}>{es ? 'Imprimir / Guardar PDF' : 'Print / Save PDF'}</button><button type="button" className="inspector-action-btn primary" onClick={() => startPrint()}>{es ? 'Reimprimir este recibo' : 'Reprint this receipt'}</button></div>
      </>}
    </dialog>
  </div>
}
