import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {emailBrand, emailContrast, renderTextEmail} from './email-design.mjs';
import {renderBookingEmail} from './booking-email-template.mjs';
import {renderCommerceEmail} from './commerce-email-template.mjs';
import {renderInvitationEmail, renderSecurityResetEmail} from './platform-email-template.mjs';
import {renderReviewEmail} from './review-processing.mjs';
import {sendEmail} from './email.mjs';

const site={siteId:'tenant-a',slug:'tenant-a',business:{name:'Studio A',nameEs:'Estudio A',email:'owner@example.invalid',logoAssetKey:'sites/tenant-a/logo.png'},design:{primary:'#182A36',secondary:'#FFCA70'},settings:{locale:'es',timezone:'America/Puerto_Rico'}};
const record={language:'es',transactionId:'order-a',bookingCode:'DEMO0001',calendarToken:'fixture-only',customer:{name:'Cliente <script>alert(1)</script>',email:'customer@example.invalid'},items:[{name:'Corte & barba',quantity:1,unitAmount:2500}],amountTotal:2788,paymentStatus:'due',start:'2026-10-12T14:00:00Z',end:'2026-10-12T14:30:00Z'};

test('tenant branding resolves scoped stored logos, localized names and readable color contrasts',()=>{
  const a=emailBrand(site,'es'),b=emailBrand({...site,siteId:'tenant-b',business:{name:'Studio B',logoAssetKey:'sites/tenant-a/logo.png',logoUrl:'javascript:alert(1)'},design:{primary:'red;display:none',secondary:'#fff" onload="bad'}});
  assert.equal(a.name,'Estudio A');assert.match(a.logo,/siteId=tenant-a&key=sites%2Ftenant-a%2Flogo.png/);
  assert.equal(b.logo,'');assert.equal(b.primary,'#0B1529');assert.equal(b.accent,'#2866cf');
  assert.equal(emailContrast('#FFCA70'),'#000000');assert.equal(emailContrast('#182A36'),'#ffffff');
  assert.equal(emailBrand({business:{name:'No logo'}}).logo,'');
});
test('bookings preserve management/calendar URLs and cancellation rules while escaping tenant data',()=>{
  const mail=renderBookingEmail(site,record);
  assert.match(mail.html,/<html lang="es"/);assert.match(mail.html,/#FFCA70/);assert.match(mail.html,/Corte &amp; barba/);assert.match(mail.text,/Pago al llegar/);
  assert.match(mail.html,/manage-booking\?token=fixture-only/);assert.match(mail.html,/booking-calendar-file\?token=fixture-only/);
  const canceled=renderBookingEmail(site,record,{change:'cancelled',audience:'business'});
  assert.match(canceled.html,/&lt;script&gt;/);assert.doesNotMatch(canceled.html,/<script>/);assert.doesNotMatch(canceled.html,/Añadir al calendario/);assert.match(canceled.text,/no realiza un reembolso automático/);
});
test('commerce and receipts distinguish outstanding payments and preserve item/tax/total amounts',()=>{
  const order=renderCommerceEmail(site,record);assert.match(order.text,/Pago pendiente/);assert.doesNotMatch(order.text,/Total paid|Stripe/);assert.match(order.html,/Estudio A/);
  const receipt=renderCommerceEmail(site,{...record,receiptId:'receipt-a',items:[{name:'Corte',quantity:1,amount:2500}],tax:288,total:2788},{receipt:true});
  assert.match(receipt.text,/IVU: \$2.88/);assert.match(receipt.text,/Total: \$27.88/);assert.match(receipt.html,/receipt-a/);
  const other=renderCommerceEmail({...site,business:{name:'Studio B'},design:{secondary:'#83EBCC'}},{...record,language:'en'});
  assert.match(other.html,/Studio B/);assert.doesNotMatch(other.html,/Estudio A|tenant-a%2Flogo|FFCA70/);
});
test('platform invitations and security stay WebFactory-branded, and invalid actions are omitted',()=>{
  const invite=renderInvitationEmail({kind:'trial',builderUrl:'https://webfactorypr.com/builder?trial_invite=fixture&x=1',language:'es'});
  assert.match(invite.html,/WebFactory PR/);assert.match(invite.html,/trial_invite=fixture&amp;x=1/);assert.match(invite.text,/30 días/);assert.match(invite.text,/No necesitas tarjeta/);
  const security=renderSecurityResetEmail({requestId:'audit-fixture',at:'2026-10-03T03:45:27Z'});
  assert.match(security.text,/passkey/);assert.match(security.html,/audit-fixture/);assert.doesNotMatch(security.html,/Estudio A/);
  assert.doesNotMatch(renderTextEmail({subject:'Test',text:'<img onerror="bad">',actions:[{url:'javascript:bad',label:'BAD ACTION'}]}).html,/<img onerror|BAD ACTION/);
});
test('review templates retain unsubscribe evidence and tenant identity',()=>{
  const mail=renderReviewEmail({...site,reviewSettings:{postalAddress:'Test address'}},{reviewRequestId:'review-a',customer:record.customer,reviewUrl:'https://example.invalid/review'},'https://example.invalid/unsubscribe?token=fixture');
  assert.equal(mail.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');assert.match(mail.text,/Test address/);assert.match(mail.html,/Cancelar emails de reseñas/);assert.match(mail.html,/Estudio A/);assert.doesNotMatch(mail.html,/<script>/);
});
test('SMTP still uses configured Gmail sender, recipients, reply-to, attachments and headers',async t=>{
  const previous=globalThis.Netlify;t.after(()=>{globalThis.Netlify=previous});
  globalThis.Netlify={env:{get:name=>({WEBFACTORY_EMAIL_PROVIDER:'gmail',WEBFACTORY_GMAIL_USER:'sender@example.invalid',WEBFACTORY_GMAIL_APP_PASSWORD:'fixture',WEBFACTORY_EMAIL_FROM_TEAM:'team@example.invalid'})[name]||''}};
  let actual;
  t.mock.method(nodemailer,'createTransport',()=>({sendMail:async mail=>{actual=mail;return {accepted:mail.to}},close:()=>{}}));
  const attachments=[{filename:'appointment.ics',content:'fixture'}],headers={'Message-ID':'<fixture@example.invalid>'};
  await sendEmail({to:'client@example.invalid',subject:'Platform test',text:'Original text',attachments,headers});
  assert.equal(actual.text,'Original text');assert.match(actual.from,/sender@example.invalid/);assert.equal(actual.replyTo,'team@example.invalid');assert.deepEqual(actual.to,['client@example.invalid']);assert.equal(actual.attachments,attachments);assert.equal(actual.headers,headers);assert.match(actual.html,/WebFactory PR/);
  const booking=renderBookingEmail(site,record);await sendEmail({to:'client@example.invalid',...booking});assert.equal(actual.html,booking.html);
});
