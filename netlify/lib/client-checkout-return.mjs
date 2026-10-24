import {publicBaseUrl} from './platform-utils.mjs';
// kiosk is an internal server option, never a checkout payload field.
export function clientCheckoutReturn({slug,kiosk=false,kioskQr=false,requestUrl,receiptReturn,trackingToken}) {
  if(kiosk&&kioskQr){const hash=new URLSearchParams(receiptReturn);hash.set('slug',slug);const path='/kiosk-receipt#'+hash.toString(),origin=new URL(requestUrl).origin;return {success:origin+path,cancel:origin+path+'&cancelled=1',ath:path};}
  const path=kiosk?'/kiosk':`/sites/${encodeURIComponent(slug)}`;
  const origin=kiosk?new URL(requestUrl).origin:publicBaseUrl();
  const tracking=trackingToken?`&tracking=${encodeURIComponent(trackingToken)}`:'';
  return {success:kiosk?`${origin}${path}`:`${origin}${path}?checkout=success&${receiptReturn}&session_id={CHECKOUT_SESSION_ID}${tracking}`,
    cancel:`${origin}${path}${kiosk?'':'?checkout=cancelled'}`,ath:kiosk?path:`${path}?${receiptReturn}${tracking}`};
}
