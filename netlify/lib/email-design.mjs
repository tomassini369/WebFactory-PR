import { publicBaseUrl } from './platform-utils.mjs';

export const emailEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function safeEmailUrl(value, base) {
  if (!String(value || '').trim()) return '';
  try {
    const url = base ? new URL(String(value || ''), base) : new URL(String(value || ''));
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
const color = (value, fallback) => /^#[\da-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
export function emailContrast(value) {
  const channels = value.slice(1).match(/../g).map(part => {
    const v = parseInt(part, 16) / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  return luminance > .179 ? '#000000' : '#ffffff';
}
export function emailBrand(site, language = 'en') {
  const base = publicBaseUrl();
  if (!site) return { name:'WebFactory PR', primary:'#0B1529', accent:'#0089E8', logo:`${base}/assets/webfactory-pr-logo.png`, website:base, platform:true };
  const business = site.business || {}, es = language === 'es';
  const name = (es ? business.nameEs || business.name || business.nameEn : business.nameEn || business.name || business.nameEs) || (es ? 'Tu negocio' : 'Your business');
  const assetKey = String(business.logoAssetKey || '');
  const storedLogo = site.siteId && assetKey.startsWith(`sites/${site.siteId}/`)
    ? `${base}/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(assetKey)}` : '';
  return { name, primary:color(site.design?.primary, '#0B1529'), accent:color(site.design?.secondary, '#2866cf'),
    logo:storedLogo || safeEmailUrl(business.logoUrl, base), website:site.slug ? `${base}/sites/${encodeURIComponent(site.slug)}` : '', platform:false };
}
export function emailButton(brand, url, label, primary = true) {
  const href = safeEmailUrl(url);
  if (!href) return '';
  const background = primary ? brand.accent : '#ffffff', foreground = primary ? emailContrast(background) : '#0B1529';
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 12px;width:100%"><tr><td bgcolor="${background}" style="border:1px solid ${primary ? background : '#cbd5e1'};border-radius:12px;text-align:center"><a href="${emailEscape(href)}" style="display:block;padding:15px 18px;color:${foreground};font:700 16px Arial,sans-serif;text-decoration:none;overflow-wrap:anywhere">${emailEscape(label)}</a></td></tr></table>`;
}
export function emailFields(fields) {
  return fields.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => `<tr><td style="padding:0 0 18px;overflow-wrap:anywhere;word-break:break-word"><span style="display:block;font-size:13px;line-height:20px;color:#53637a">${emailEscape(label)}</span><strong style="font-size:17px;line-height:25px;color:#0B1529">${emailEscape(value)}</strong></td></tr>`).join('');
}
export function emailParagraph(text) {
  return `<p style="margin:0 0 18px;font-size:16px;line-height:25px;overflow-wrap:anywhere;word-break:break-word">${emailEscape(text).replace(/\n/g, '<br>')}</p>`;
}
// bodyHtml is composed only by server-side templates; caller data must be escaped.
export function renderEmailLayout({brand = emailBrand(), language = 'en', title, bodyHtml, footer}) {
  const e = emailEscape, es = language === 'es', headText = emailContrast(brand.primary);
  const identity = brand.logo ? `<img src="${e(brand.logo)}" width="${brand.platform ? '180' : '72'}" alt="${e(brand.name)}" style="display:block;max-width:100%;height:auto;max-height:100px;object-fit:contain;margin:0 0 16px;border:0;${brand.platform ? 'background:#ffffff;padding:10px;border-radius:8px;' : ''}">` : '';
  const footerText = footer || (brand.platform ? (es ? 'Mensaje de WebFactory PR.' : 'A message from WebFactory PR.') : (es ? `Mensaje de ${brand.name}. Tecnología de WebFactory PR.` : `A message from ${brand.name}. Powered by WebFactory PR.`));
  return `<!doctype html><html lang="${es ? 'es' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(title)}</title></head><body style="margin:0;padding:0;background:#f3f6fb;color:#0B1529;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f3f6fb"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;table-layout:fixed"><tr><td bgcolor="${brand.primary}" style="padding:28px 24px;border-radius:20px 20px 0 0;border-bottom:4px solid ${brand.accent};color:${headText}">${identity}<p style="margin:0;font-size:22px;font-weight:700;line-height:30px;overflow-wrap:anywhere">${e(brand.name)}</p></td></tr><tr><td bgcolor="#ffffff" style="padding:28px 24px;border-radius:0 0 20px 20px"><h1 style="margin:0 0 24px;font-size:27px;line-height:35px;overflow-wrap:anywhere;word-break:break-word;color:#0B1529">${e(title)}</h1>${bodyHtml || ''}</td></tr><tr><td align="center" style="padding:20px 12px;font-size:12px;line-height:20px;color:#53637a;overflow-wrap:anywhere">${e(footerText)}</td></tr></table></td></tr></table></body></html>`;
}
export function renderTextEmail({site, language = 'en', subject, text, actions = [], footer}) {
  const brand = emailBrand(site, language);
  const paragraphs = String(text || '').split(/\n\s*\n/).map(emailParagraph).join('');
  return {subject, text, html:renderEmailLayout({brand, language, title:subject, bodyHtml:paragraphs + actions.map(action => emailButton(brand, action.url, action.label, action.primary !== false)).join(''), footer})};
}
