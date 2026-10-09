import { useEffect, useRef, useState } from 'react'
import ReceiptPaper, { type ReceiptRecord } from './ReceiptPaper'
import ReceiptDetails from './receipt-original/Receipt'
import './buyer-receipt.css'

export function demoReceipt(businessName: string, items: NonNullable<ReceiptRecord['items']>, paymentMethod: string, customer = { name: 'Demo', email: '' }, logoUrl = ''): ReceiptRecord {
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const id = `demo-${crypto.randomUUID()}`
  if(!logoUrl){const initials=businessName.split(/\s+/).slice(0,2).map(word=>word[0]||'').join('').replace(/[<>&\"']/g,'');logoUrl=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="90" viewBox="0 0 180 90"><rect width="180" height="90" rx="16" fill="#17263b"/><text x="90" y="59" text-anchor="middle" font-family="sans-serif" font-size="44" fill="white">${initials}</text></svg>`)}`}
  return { receiptId: id, transactionId: id, createdAt: new Date().toISOString(), paymentStatus: 'demo', total, subtotal: total, tax: 0, discounts: 0, tip: 0, paymentMethod, customer, items, businessName, logoUrl, demo: true }
}

export default function BuyerReceipt({ receipt, lang, timeZone, onClose }: { receipt: ReceiptRecord; lang: 'es' | 'en'; timeZone?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const es = lang === 'es'
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  const download = async () => {
    setBusy(true); setError('')
    try {
      const { downloadReceiptPdf } = await import('./receiptPdf')
      await downloadReceiptPdf(receipt, lang, timeZone, dialog.current!.ownerDocument)
    } catch { setError(es ? 'No se pudo descargar el PDF. Puedes usar Imprimir / Guardar PDF.' : 'Could not download PDF. You can use Print / Save PDF.') }
    finally { setBusy(false) }
  }
  return <dialog ref={dialog} className="wf-buyer-receipt" aria-label={es ? 'Recibo de compra' : 'Purchase receipt'} onClose={()=>{if(!dialog.current?.open)onClose()}}>
    <header><div><small>{receipt.demo ? (es ? 'DEMOSTRACIÓN · SIN COBROS NI EMAILS' : 'DEMO · NO CHARGES OR EMAILS') : (['paid','paid_in_person'].includes(receipt.paymentStatus) ? (es ? 'PAGO CONFIRMADO' : 'PAYMENT CONFIRMED') : (es ? 'RECIBO DE COMPRA' : 'PURCHASE RECEIPT'))}</small><h2>{receipt.businessName || (es ? 'Tu recibo' : 'Your receipt')}</h2></div><button autoFocus type="button" onClick={() => dialog.current?.close()} aria-label={es ? 'Cerrar recibo' : 'Close receipt'}>×</button></header>
    <div className="wf-buyer-receipt-animation"><ReceiptPaper receipt={receipt} lang={lang} timeZone={timeZone}/></div>
    <nav aria-label={es ? 'Opciones del recibo' : 'Receipt options'}><button type="button" onClick={() => dialog.current?.ownerDocument.defaultView?.print()}>{es ? 'Imprimir / Guardar PDF' : 'Print / Save PDF'}</button><button type="button" disabled={busy} onClick={download}>{busy ? (es ? 'Preparando…' : 'Preparing…') : (es ? 'Descargar PDF' : 'Download PDF')}</button></nav>
    {error && <p role="alert">{error}</p>}
    <div className="wf-buyer-receipt-print"><ReceiptDetails receipt={receipt} lang={lang} timeZone={timeZone}/></div>
  </dialog>
}
