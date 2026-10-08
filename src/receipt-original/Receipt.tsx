import { useId } from "react";
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
  const es = lang === 'es', artId = useId().replaceAll(':', '')
  const money = (cents: number) => new Intl.NumberFormat(es ? 'es-PR' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  const statuses: Record<string, string> = es ? { paid: 'Pagado', paid_in_person: 'Pagado presencialmente', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial', due: 'Pendiente' } : { paid: 'Paid', paid_in_person: 'Paid in person', refunded: 'Refunded', partially_refunded: 'Partially refunded', due: 'Due' }
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
        {/* Reference Image Photo Banner */}
        <div className="receipt-photo-banner">
          <div className="receipt-photo-inner">
            <svg
              viewBox="0 0 280 90"
              className="banner-art-svg"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={artId + "silkBgGrad"} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ea580c" />
                  <stop offset="35%" stopColor="#dc2626" />
                  <stop offset="70%" stopColor="#b91c1c" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>
                <linearGradient id={artId + "foldSheen1"} x1="30%" y1="0%" x2="70%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="0.9" />
                  <stop offset="45%" stopColor="#ef4444" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#991b1b" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id={artId + "foldSheen2"} x1="0%" y1="40%" x2="100%" y2="60%">
                  <stop offset="0%" stopColor="#f87171" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#dc2626" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#450a0a" stopOpacity="0.9" />
                </linearGradient>
                <radialGradient id={artId + "silkHighlight"} cx="45%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.85" />
                  <stop offset="40%" stopColor="#f97316" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="280" height="90" fill={`url(#${artId}silkBgGrad)`} />
              <path
                d="M-20,100 C30,25 65,80 110,12 C155,-20 185,60 225,8 C260,-15 280,35 300,100 Z"
                fill={`url(#${artId}foldSheen1)`}
              />
              <path
                d="M10,100 C55,10 105,55 145,5 C185,60 235,12 295,65 L295,100 Z"
                fill={`url(#${artId}foldSheen2)`}
              />
              <path
                d="M70,100 C95,40 135,48 165,24 C195,8 225,48 255,100 Z"
                fill="#991b1b"
                opacity="0.65"
              />
              <circle cx="120" cy="35" r="60" fill={`url(#${artId}silkHighlight)`} />
              <path
                d="M75,90 C105,35 128,25 155,12 C150,16 130,40 102,90 Z"
                fill="#ffedd5"
                opacity="0.5"
              />
              <path
                d="M165,90 C190,30 215,20 240,10 C236,13 218,38 196,90 Z"
                fill="#fee2e2"
                opacity="0.4"
              />
            </svg>
            <span className="photo-banner-tag">★ {es ? "RECIBO DE PAGO" : "PAYMENT RECEIPT"} ★</span>
          </div>
        </div>

        {/* Header */}
        <div className="receipt-header">
          <div className="receipt-brand-badge">{es ? "RECIBO DE PAGO" : "PAYMENT RECEIPT"}</div>
          <h2 className="receipt-store-title">{es ? "Recibo" : "Receipt"}</h2>
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
