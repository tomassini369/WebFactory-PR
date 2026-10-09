import { AdaptiveLogo } from "../theme";
import type { ReceiptRecord } from "../ReceiptPaper";
// Crisp vector sawtooth perforated edge
function SawtoothTeeth({ direction = 'top' }: { direction?: string }) {
  const toothWidth = 8;
  const height = 5;
  const teethCount = 50;
  const points = [];

  if (direction === 'top') {
    points.push(`0,${height}`);
    for (let i = 0; i < teethCount; i++) {
      const xMid = i * toothWidth + toothWidth / 2;
      const x2 = (i + 1) * toothWidth;
      points.push(`${xMid},0`);
      points.push(`${x2},${height}`);
    }
  } else {
    points.push(`0,0`);
    for (let i = 0; i < teethCount; i++) {
      const xMid = i * toothWidth + toothWidth / 2;
      const x2 = (i + 1) * toothWidth;
      points.push(`${xMid},${height}`);
      points.push(`${x2},0`);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${teethCount * toothWidth} ${height}`}
      className={`receipt-sawtooth receipt-sawtooth-${direction}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={points.join(' ')} fill="#fbfbfa" />
    </svg>
  );
}

export default function Receipt({ receipt, lang, timeZone = 'America/Puerto_Rico' }: { receipt: ReceiptRecord; lang: 'es' | 'en'; timeZone?: string }) {
  const es = lang === 'es'
  const money = (cents: number) => new Intl.NumberFormat(es ? 'es-PR' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  const statuses: Record<string, string> = es ? { demo: 'Demostración', paid: 'Pagado', paid_in_person: 'Pagado presencialmente', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial', due: 'Pendiente' } : { demo: 'Demo', paid: 'Paid', paid_in_person: 'Paid in person', refunded: 'Refunded', partially_refunded: 'Partially refunded', due: 'Due' }
  const date = new Date(receipt.createdAt)
  const displayTime = Number.isFinite(date.getTime()) ? date.toLocaleString(es ? 'es-PR' : 'en-US', { timeZone }) : receipt.createdAt

  return (
    <div
      className="receipt-sheet wf-receipt-paper" aria-label={es ? "Detalle del recibo" : "Receipt details"}
    >
      {/* Sawtooth / Perforated Top Edge */}
      <SawtoothTeeth direction="top" />

      {/* Fold / Crease effect lines */}
      <div className="receipt-crease receipt-crease-1" aria-hidden="true" />
      <div className="receipt-crease receipt-crease-2" aria-hidden="true" />

      {/* Main Body */}
      <div className="receipt-content">
        <div className="receipt-platform-logo">
          {receipt.logoUrl ? <img src={receipt.logoUrl} alt={receipt.businessName || ''} width={180} style={{height:'auto',objectFit:'contain'}}/> : <AdaptiveLogo variant="light" alt="WebFactory PR" width={180} height={108} />}
        </div>

        {/* Header */}
        <div className="receipt-header">
          <div className="receipt-brand-badge">{receipt.demo ? (es ? "DEMOSTRACIÓN · SIN COBROS" : "DEMO · NO CHARGE") : (es ? "RECIBO DE PAGO" : "PAYMENT RECEIPT")}</div>
          <h2 className="receipt-store-title">{receipt.businessName || (es ? "Recibo" : "Receipt")}</h2>
          <div className="receipt-tagline">{receipt.customer?.name || receipt.customer?.email}</div>
          <div className="receipt-meta-info font-mono-sm">{receipt.customer?.name && receipt.customer.email}</div>
        </div>

        <div className="receipt-divider-stars">* * * * * * * * * * * * * * * *</div>

        {/* Transaction Metadata */}
        <div className="receipt-info-grid">
          <div className="receipt-row-between">
            <span className="lbl">{es ? "RECIBO:" : "RECEIPT:"}</span>
            <span className="val bold">{receipt.receiptId}</span>
          </div>
          <div className="receipt-row-between">
            <span className="lbl">{es ? "FECHA:" : "DATE:"}</span>
            <span className="val">{displayTime}</span>
          </div>
          <div className="receipt-row-between">
            <span className="lbl">{es ? "MÉTODO:" : "METHOD:"}</span>
            <span className="val">{receipt.paymentMethod?.replaceAll("_", " ") || "—"}</span>
          </div>
          <div className="receipt-row-between">
            <span className="lbl">{es ? "ESTADO:" : "STATUS:"}</span>
            <span className="val approved-badge">{statuses[receipt.paymentStatus] || receipt.paymentStatus}</span>
          </div>
        </div>

        <div className="receipt-divider-dashed">---------------------------------</div>

        {/* Itemized list */}
        <div className="receipt-items-table">
          <div className="receipt-table-head">
            <span className="col-qty">{es ? "CANT." : "QTY"}</span>
            <span className="col-item">{es ? "DESCRIPCIÓN" : "ITEM DESCRIPTION"}</span>
            <span className="col-amt">{es ? "IMPORTE" : "AMT"}</span>
          </div>

          <div className="receipt-table-body">
            {(receipt.items || []).map((item, idx) => (
              <div key={idx} className="receipt-item-row">
                <span className="col-qty">{item.quantity}x</span>
                <span className="col-item">{item.name}<small style={{ display: "block", fontSize: 10 }}>{item.quantity} × {money(item.unitAmount)}</small></span>
                <span className="col-amt">
                  {money(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="receipt-divider-dashed">---------------------------------</div>

        {/* Pricing calculations */}
        <div className="receipt-totals-table">
          {[[es ? 'Subtotal' : 'Subtotal', receipt.subtotal], [es ? 'Descuentos' : 'Discounts', receipt.discounts === undefined ? undefined : -receipt.discounts], [es ? 'Impuestos' : 'Tax', receipt.tax], [es ? 'Propina' : 'Tip', receipt.tip]].map(([label, value]) => typeof value === 'number' && <div className="receipt-row-between" key={String(label)}><span>{label}:</span><span>{money(value)}</span></div>)}
          <div className="receipt-divider-double">=================================</div>
          <div className="receipt-row-between receipt-grand-total wf-receipt-total">
            <span>{es ? "TOTAL USD:" : "TOTAL USD:"}</span>
            <span className="total-highlight">{money(receipt.total)}</span>
          </div>
          <div className="receipt-divider-double">=================================</div>
        </div>

        <div className="receipt-codes-container"><span>{es ? 'Transacción' : 'Transaction'}<br />{receipt.transactionId}</span></div>

        {/* Footer info */}
        <div className="receipt-footer">
          <p className="receipt-msg">{statuses[receipt.paymentStatus] || receipt.paymentStatus}</p>
        </div>
      </div>

      {/* Sawtooth / Perforated Bottom Edge */}
      <SawtoothTeeth direction="bottom" />
    </div>
  );
}
