// Offline fixtures only. Does not import the SMTP transport or read tenant stores.
import {mkdir, writeFile, copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {emailEscape} from '../netlify/lib/email-design.mjs';
import {renderBookingEmail} from '../netlify/lib/booking-email-template.mjs';
import {renderCommerceEmail} from '../netlify/lib/commerce-email-template.mjs';
import {renderInvitationEmail, renderSecurityResetEmail} from '../netlify/lib/platform-email-template.mjs';
import {renderReviewEmail} from '../netlify/lib/review-processing.mjs';
import {renderContactEmail} from '../netlify/lib/contact-email-template.mjs';

const directory=resolve(process.argv[2] || '.email-preview');
globalThis.Netlify={env:{get:name=>name==='URL'?'https://preview.example.invalid':''}};
await mkdir(directory,{recursive:true});
await copyFile(new URL('../assets/webfactory-pr-logo.png',import.meta.url),resolve(directory,'webfactory-pr-logo.png'));
const samples=[];
for(const language of ['es','en']){
  for(const [slug,name,primary,secondary] of [['barber-demo','Northline Demo','#182A36','#FFCA70'],['beauty-demo','Aura Demo','#402B53','#D9B8F0'],['fitness-demo','Pulse Demo','#142926','#92F0B6']]){
    await writeFile(resolve(directory,`${slug}-logo.svg`),`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${secondary}"/><text x="48" y="65" text-anchor="middle" font-family="Arial" font-size="52" fill="${primary}">${name[0]}</text></svg>`);
    const site={siteId:slug,slug,business:{name,nameEs:name,nameEn:name,logoUrl:`https://preview.example.invalid/${slug}-logo.svg`,email:'business@example.invalid',phone:'787-555-0100',address:'Dirección de prueba / Test address',mapsUrl:'https://example.invalid/maps'},design:{primary,secondary},settings:{locale:language,timezone:'America/Puerto_Rico'},employees:[{id:'test',name:'Profesional Demo'}]};
    const record={language,kind:'booking',transactionId:'DEMO-ORDER-001',bookingCode:'DEMO0001',calendarToken:'preview-fixture-only',paymentStatus:'due',start:'2026-10-12T14:00:00Z',end:'2026-10-12T14:30:00Z',employeeId:'test',customer:{name:'Cliente Demo',email:'customer@example.invalid'},items:[{name:language==='es'?'Servicio de prueba':'Test service',quantity:1,unitAmount:2500}],amountTotal:2788};
    const add=(type,mail)=>samples.push({id:`${slug}-${language}-${type}`,name:`${name} · ${language.toUpperCase()} · ${type}`,mail});
    for(const change of ['confirmed','rescheduled','cancelled','reminder'])add(`booking-${change}`,renderBookingEmail(site,record,{change,hours:24}));
    add('booking-business',renderBookingEmail(site,record,{audience:'business'}));
    add('order',renderCommerceEmail(site,record));
    add('order-business',renderCommerceEmail(site,record,{audience:'business'}));
    const receipt={...record,receiptId:'DEMO-RECEIPT-001',createdAt:'2026-10-08T20:00:00Z',paymentStatus:'paid',paymentMethod:'stripe',items:[{name:language==='es'?'Servicio Demo':'Demo service',quantity:1,amount:2500}],subtotal:2500,discounts:0,total:2788,tax:288,tip:0};
    add('receipt',renderCommerceEmail(site,receipt,{receipt:true}));
    add('booking-paid-receipt',renderBookingEmail(site,{...record,paymentStatus:'paid'},{receipt}));
    add('review',renderReviewEmail({...site,reviewSettings:{postalAddress:'Dirección de prueba'}},{reviewRequestId:'demo-review',customer:record.customer,reviewUrl:'https://example.invalid/review'},'https://example.invalid/unsubscribe'));
    add('contact',renderContactEmail(site,{language,name:'Cliente Demo',email:'customer@example.invalid',phone:'787-555-0100',message:'Mensaje ficticio para revisar el diseño. / Fictional message to preview the design.'}));
  }
  for(const kind of ['trial','complimentary'])samples.push({id:`platform-${language}-${kind}`,name:`WebFactory · ${language.toUpperCase()} · ${kind}`,mail:renderInvitationEmail({kind,language,builderUrl:`https://example.invalid/builder?${kind}_invite=preview-fixture-only`})});
}
samples.push({id:'platform-security',name:'WebFactory · ES/EN · security',mail:renderSecurityResetEmail({requestId:'DEMO-AUDIT-001',at:'2026-10-03T03:45:27Z'})});
const previews={};
for(const sample of samples){
  const html=sample.mail.html.replace('https://preview.example.invalid/assets/webfactory-pr-logo.png','webfactory-pr-logo.png').replaceAll('https://preview.example.invalid/','').replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="robots" content="noindex,nofollow">');
  previews[sample.id]=html;
  await writeFile(resolve(directory,`${sample.id}.html`),html);await writeFile(resolve(directory,`${sample.id}.txt`),sample.mail.text);
}
const rows=samples.map(sample=>`<option value="${sample.id}">${emailEscape(sample.name)}</option>`).join('');
const index=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>WebFactory · Email preview</title><style>body{margin:0;background:#0b1529;color:#fff;font:16px Arial}header{padding:20px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}h1{font-size:20px;margin:0}label,select,button,a{font:inherit}select{max-width:100%;padding:10px}button{padding:10px;border:0;border-radius:8px;cursor:pointer}a{color:#9cc8ff}iframe{display:block;background:#f3f6fb;width:100%;height:calc(100vh - 180px);border:0;margin:auto}p{margin:0 20px 16px;color:#b7c6df}.mobile{width:min(390px,100%)}</style></head><body><header><h1>WebFactory · Correos</h1><label>Ejemplo <select id="sample">${rows}</select></label><button id="size">Ver móvil</button><a id="plain" href="${samples[0].id}.txt" target="_blank">Texto plano</a></header><p>Vista local con datos ficticios · No envía correos · Los enlaces son de prueba.</p><iframe id="email" title="Previsualización del correo" sandbox="allow-same-origin" srcdoc="${emailEscape(previews[samples[0].id])}"></iframe><script src="gallery.js" defer></script></body></html>`;
await writeFile(resolve(directory,'gallery.js'),`const previews=${JSON.stringify(previews).replace(/<\/script/gi,'<\\/script')};const s=document.getElementById('sample'),f=document.getElementById('email'),p=document.getElementById('plain');s.addEventListener('change',()=>{f.srcdoc=previews[s.value];p.href=s.value+'.txt'});document.getElementById('size').addEventListener('click',e=>{f.classList.toggle('mobile');e.target.textContent=f.classList.contains('mobile')?'Ver escritorio':'Ver móvil'});`);
await writeFile(resolve(directory,'index.html'),index);
console.log(`Generated ${samples.length} offline email previews: ${resolve(directory,'index.html')}`);
