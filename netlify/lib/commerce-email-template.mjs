import { renderReceiptEmail } from "./receipt-email-template.mjs";
import { emailBrand, emailButton, emailFields, emailParagraph, renderEmailLayout } from './email-design.mjs';
import { publicBaseUrl } from './platform-utils.mjs';

const money = (cents, es) => new Intl.NumberFormat(es ? 'es-PR' : 'en-US', {style:'currency',currency:'USD'}).format(Number(cents || 0) / 100);
export function renderCommerceEmail(site, record, {audience = 'customer', receipt = false} = {}) {
  if (receipt && audience === 'customer') return renderReceiptEmail(site,record);
  const language = record.language || site.settings?.locale || 'en', es = language === 'es', brand = emailBrand(site, language);
  const title = receipt ? (es ? 'Tu recibo' : 'Your receipt') : audience === 'business' ? (es ? 'Nuevo pedido confirmado' : 'New confirmed order') : (es ? 'Tu pedido está confirmado' : 'Your order is confirmed');
  const payment = record.paymentStatus === 'due' ? (es ? 'Pago pendiente en el negocio' : 'Payment due at the business') : record.paymentStatus === 'paid_in_person' || record.paymentMethod === 'manual_ath' ? (es ? 'Pago registrado por el negocio' : 'Payment recorded by the business') : record.paymentStatus === 'paid' ? (es ? 'Pago confirmado' : 'Payment confirmed') : receipt ? (es ? 'Recibo registrado por el negocio' : 'Receipt recorded by the business') : (es ? 'Consulta el estado del pago con el negocio' : 'Contact the business for payment status');
  const fields = [[es ? 'Confirmación' : 'Confirmation',record.transactionId],...(receipt ? [[es ? 'Recibo' : 'Receipt',record.receiptId]] : []),
    ...(audience === 'business' ? [[es ? 'Cliente' : 'Customer',record.customer?.name],['Email',record.customer?.email],[es ? 'Teléfono' : 'Phone',record.customer?.phone]] : []),
    ...(record.items || []).map(item => [`${item.name} × ${item.quantity}`,money(receipt ? item.amount : Number(item.unitAmount || 0) * Number(item.quantity || 0),es)]),
    ...(receipt && record.tax ? [['IVU',money(record.tax,es)]] : []),
    [es ? 'Total' : 'Total',money(receipt ? record.total : record.amountTotal,es)],
    [es ? 'Pago' : 'Payment',payment]];
  const greeting = audience === 'customer' && record.customer?.name ? `${es ? 'Hola' : 'Hello'} ${record.customer.name},` : '';
  const action = audience === 'business' ? {url:`${publicBaseUrl()}/client-admin/`,label:es ? 'Abrir portal del negocio' : 'Open business portal'} : {url:brand.website,label:es ? 'Visitar el negocio' : 'Visit the business'};
  const text=[brand.name,title,greeting,...fields.filter(([,value])=>value !== undefined && value !== '').map(([label,value])=>`${label}: ${value}`),site.business?.email,site.business?.phone,action.url?`${action.label}: ${action.url}`:''].filter(Boolean).join('\n');
  const html=renderEmailLayout({brand,language,title,bodyHtml:(greeting?emailParagraph(greeting):'') + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${emailFields(fields)}</table>` + emailButton(brand,action.url,action.label) + emailParagraph([site.business?.email,site.business?.phone].filter(Boolean).join('\n'))});
  return {subject:`${brand.name} — ${title}${receipt ? ` ${record.receiptId || ''}` : ''}`,text,html};
}
