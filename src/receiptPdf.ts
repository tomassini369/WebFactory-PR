import type { ReceiptRecord } from './ReceiptPaper'

export async function downloadReceiptPdf(receipt: ReceiptRecord, lang: 'es' | 'en', timeZone = 'America/Puerto_Rico', doc = document) {
  const { PDFDocument, StandardFonts } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  let page = pdf.addPage([612, 792]), y = 742
  const safe = (value: string) => Array.from(value).map(char => { try { font.encodeText(char); return char } catch { return '?' } }).join('')
  const line = (value: string) => {
    // Wrap long item names and include every line across as many pages as needed.
    const text = safe(value)
    let chunk = ''
    const draw = () => { if (y < 50) { page = pdf.addPage([612, 792]); y = 742 } page.drawText(chunk, { x: 48, y, size: 11, font }); y -= 18; chunk = '' }
    for (const char of text) { if (font.widthOfTextAtSize(chunk + char, 11) > 516) draw(); chunk += char }
    draw()
  }
  const money = (cents: number) => new Intl.NumberFormat(lang === 'es' ? 'es-PR' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  if (receipt.logoUrl) {
    // Logos are same-origin business assets or the locally generated demo monogram.
    const url = new URL(receipt.logoUrl, doc.baseURI)
    if(url.origin === new URL(doc.baseURI).origin || receipt.demo && url.protocol === 'data:') {
      try {
        const image = doc.createElement('img'); image.src = url.href
        await Promise.race([image.decode(), new Promise((_, reject)=>setTimeout(()=>reject(new Error('logo-timeout')),3000))])
        const canvas = doc.createElement('canvas'); canvas.width=360;canvas.height=180
        const context=canvas.getContext('2d')!
        const scale=Math.min(360/image.naturalWidth,180/image.naturalHeight)
        const w=image.naturalWidth*scale,h=image.naturalHeight*scale
        context.drawImage(image,(360-w)/2,(180-h)/2,w,h)
        const logo=await pdf.embedPng(canvas.toDataURL('image/png'))
        page.drawImage(logo,{x:48,y:y-90,width:180,height:90});y-=110
      } catch { /* A failed optional logo never prevents download of the saved amounts. */ }
    }
  }
  line(receipt.businessName || 'WebFactory PR')
  if (receipt.demo) line(lang === 'es' ? 'DEMOSTRACION - SIN COBROS NI EMAILS' : 'DEMO - NO CHARGES OR EMAILS')
  line(`${lang === 'es' ? 'Recibo' : 'Receipt'}: ${receipt.receiptId}`)
  line(new Date(receipt.createdAt).toLocaleString(lang === 'es' ? 'es-PR' : 'en-US', { timeZone }))
  line(`${receipt.customer.name} ${receipt.customer.email}`)
  line(`${lang === 'es' ? 'Transaccion' : 'Transaction'}: ${receipt.transactionId}`)
  line(`${lang === 'es' ? 'Estado' : 'Status'}: ${receipt.paymentStatus}`)
  line(`${lang === 'es' ? 'Metodo' : 'Method'}: ${receipt.paymentMethod || '-'}`)
  for (const item of receipt.items || []) line(`${item.name} - ${item.quantity} x ${money(item.unitAmount)} = ${money(item.amount)}`)
  for (const [label, value] of [['Subtotal', receipt.subtotal], [lang === 'es' ? 'Descuentos' : 'Discounts', receipt.discounts === undefined ? undefined : -receipt.discounts], [lang === 'es' ? 'Impuestos' : 'Tax', receipt.tax], [lang === 'es' ? 'Propina' : 'Tip', receipt.tip]] as const) if (typeof value === 'number') line(`${label}: ${money(value)}`)
  line(`TOTAL USD: ${money(receipt.total)}`)
  const bytes = await pdf.save()
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
  const anchor = doc.createElement('a'); anchor.href = url; anchor.download = `${receipt.demo ? 'demo-' : ''}receipt.pdf`; doc.body.appendChild(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
