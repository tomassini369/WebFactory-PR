import './receipt-paper.css'

export type ReceiptRecord = {
  receiptId: string; transactionId: string; total: number; paymentStatus: string; createdAt: string
  customer: { name: string; email: string }
  items?: Array<{ name: string; quantity: number; unitAmount: number; amount: number }>
  subtotal?: number; discounts?: number; tax?: number; tip?: number; paymentMethod?: string
}

export default function ReceiptPaper({ receipt, lang, timeZone = 'America/Puerto_Rico' }: {
  receipt: ReceiptRecord; lang: 'es' | 'en'; timeZone?: string
}) {
  const es = lang === 'es'
  const money = (cents: number) => new Intl.NumberFormat(es ? 'es-PR' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  const status: Record<string, string> = es ? { paid: 'Pagado', paid_in_person: 'Pagado presencialmente', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial', due: 'Pendiente' } : { paid: 'Paid', paid_in_person: 'Paid in person', refunded: 'Refunded', partially_refunded: 'Partially refunded', due: 'Due' }
  const date = new Date(receipt.createdAt)
  return <div className="wf-receipt-printer">
    <div className="wf-receipt-slot" aria-hidden="true"><i /></div>
    <article className="wf-receipt-paper" aria-label={es ? 'Detalle del recibo' : 'Receipt details'}>
      <header><small>{es ? 'RECIBO DE PAGO' : 'PAYMENT RECEIPT'}</small><h3>{es ? 'Recibo' : 'Receipt'}</h3><span>{receipt.receiptId}</span><time dateTime={receipt.createdAt}>{Number.isFinite(date.getTime()) ? date.toLocaleString(es ? 'es-PR' : 'en-US', { timeZone }) : receipt.createdAt}</time></header>
      <div className="wf-receipt-customer"><strong>{receipt.customer?.name || receipt.customer?.email}</strong>{receipt.customer?.name && <span>{receipt.customer.email}</span>}</div>
      {!!receipt.items?.length && <ul>{receipt.items.map((item, index) => <li key={index}><span>{item.name}<small>{item.quantity} × {money(item.unitAmount)}</small></span><b>{money(item.amount)}</b></li>)}</ul>}
      <dl>{[
        [es ? 'Subtotal' : 'Subtotal', receipt.subtotal],
        [es ? 'Descuentos' : 'Discounts', receipt.discounts === undefined ? undefined : -receipt.discounts],
        [es ? 'Impuestos' : 'Tax', receipt.tax], [es ? 'Propina' : 'Tip', receipt.tip],
      ].map(([label, value]) => typeof value === 'number' && <div key={String(label)}><dt>{label}</dt><dd>{money(value)}</dd></div>)}
        <div className="wf-receipt-total"><dt>Total USD</dt><dd>{money(receipt.total)}</dd></div>
      </dl>
      <footer><strong>{status[receipt.paymentStatus] || receipt.paymentStatus}</strong>{receipt.paymentMethod && <span>{receipt.paymentMethod.replaceAll('_', ' ')}</span>}<small>{es ? 'Transacción' : 'Transaction'}<br />{receipt.transactionId}</small></footer>
    </article>
  </div>
}
