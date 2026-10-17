import assert from 'node:assert/strict';
const origin=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
if(!/^https:\/\/deploy-preview-\d+--webfactorypr\.netlify\.app$/.test(origin)&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Select an explicit WebFactory Deploy Preview or local fixture server.');
for(const language of ['es','en']){
 const base=`${origin}/email-preview/barber-demo-${language}-booking-confirmed`;
 const html=await fetch(base+'.html',{signal:AbortSignal.timeout(30000)});assert.equal(html.status,200);assert.match(html.headers.get('content-type')||'',/text\/html/);
 const plain=await fetch(base+'.txt',{signal:AbortSignal.timeout(30000)});assert.equal(plain.status,200);
 const body=await html.text(),text=await plain.text();
 const pin=text.match(language==='es'?/PIN privado del kiosco:\s*(\d{6})/:/Private kiosk PIN:\s*(\d{6})/)?.[1];assert(pin,'customer preview must contain a private six-digit demo PIN');
 assert(body.includes('D3A00001')&&text.includes('D3A00001')&&body.includes(pin),'HTML and plain text must contain the same demo code and PIN');
 assert.match(body,/Northline Demo/);assert.doesNotMatch(text,/BEGIN:VCALENDAR/);
 console.log('PASS published offline confirmation: matching Booking ID + PIN in HTML and plain text',language);
}
