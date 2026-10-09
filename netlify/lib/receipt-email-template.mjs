import { emailBrand, emailEscape, emailParagraph, renderEmailLayout } from './email-design.mjs';

// A static paper receipt for email. Amounts come exclusively from the saved record.
export function renderReceiptBlock(site, receipt, language = receipt.language || site.settings?.locale || 'en') {
  const es = language === 'es', e = emailEscape;
  const money = cents => new Intl.NumberFormat(es ? 'es-PR' : 'en-US', {style:'currency',currency:'USD'}).format(Number(cents || 0) / 100);
  const statuses = es ? {paid:'Pagado',paid_in_person:'Pagado presencialmente',refunded:'Reembolsado',partially_refunded:'Reembolso parcial',due:'Pendiente'} : {paid:'Paid',paid_in_person:'Paid in person',refunded:'Refunded',partially_refunded:'Partially refunded',due:'Due'};
  const date = new Date(receipt.createdAt), zone = site.settings?.timezone || 'America/Puerto_Rico';
  const timestamp = Number.isFinite(date.getTime()) ? date.toLocaleString(es ? 'es-PR' : 'en-US',{timeZone:zone}) : '';
  const fields = [[es ? 'Recibo' : 'Receipt',receipt.receiptId],[es ? 'Transacción' : 'Transaction',receipt.transactionId],[es ? 'Fecha' : 'Date',timestamp],[es ? 'Cliente' : 'Customer',receipt.customer?.name || receipt.customer?.email],
    ...(receipt.items || []).map(item => [`${item.name} × ${item.quantity}`,money(item.amount)]),
    ...(typeof receipt.subtotal === 'number' ? [[es ? 'Subtotal' : 'Subtotal',money(receipt.subtotal)]] : []),
    ...(typeof receipt.discounts === 'number' ? [[es ? 'Descuentos' : 'Discounts',money(-receipt.discounts)]] : []),
    ...(typeof receipt.tax === 'number' ? [[es ? 'IVU' : 'Tax',money(receipt.tax)]] : []),
    ...(typeof receipt.tip === 'number' ? [[es ? 'Propina' : 'Tip',money(receipt.tip)]] : []),
    ['Total',money(receipt.total)],[es ? 'Estado' : 'Status',statuses[receipt.paymentStatus] || receipt.paymentStatus],
    ...(receipt.paymentMethod ? [[es ? 'Método' : 'Method',receipt.paymentMethod.replaceAll('_',' ')]] : [])];
  const text = fields.filter(([,v])=>v !== undefined && v !== '').map(([k,v])=>`${k}: ${v}`).join('\n');
  const row = (label,value) => `<tr><td style="padding:8px 6px;border-bottom:1px dashed #c4c4bf;vertical-align:top;overflow-wrap:anywhere">${e(label)}</td><td align="right" style="padding:8px 6px;border-bottom:1px dashed #c4c4bf;vertical-align:top;overflow-wrap:anywhere;${label==='Total'?'font-size:22px;font-weight:bold':''}">${e(value)}</td></tr>`;
  const html = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;background:#fbfbfa;color:#242426;font:14px/1.5 Courier,monospace;border-top:2px dashed #a3a39e;border-bottom:2px dashed #a3a39e;margin:16px 0"><tr><td colspan="2" align="center" style="padding:20px 12px;font-size:17px;font-weight:bold;letter-spacing:1px">${es?'RECIBO DE PAGO':'PAYMENT RECEIPT'}</td></tr>${fields.filter(([,v])=>v !== undefined && v !== '').map(([k,v])=>row(k,v)).join('')}</table>`;
  return {html,text};
}
export function renderReceiptEmail(site, receipt) {
  const language = receipt.language || site.settings?.locale || 'en', es = language === 'es', brand = emailBrand(site,language);
  const title = es ? 'Tu recibo' : 'Your receipt', block = renderReceiptBlock(site,receipt,language);
  const greeting = receipt.customer?.name ? `${es?'Hola':'Hello'} ${receipt.customer.name},` : '';
  return {subject:`${brand.name} — ${title} ${receipt.receiptId || ''}`.trim(), text:[brand.name,title,greeting,block.text,site.business?.email,site.business?.phone].filter(Boolean).join('\n'),
    html:renderEmailLayout({brand,language,title,bodyHtml:(greeting?emailParagraph(greeting):'')+block.html+emailParagraph([site.business?.email,site.business?.phone].filter(Boolean).join('\n'))})};
}
