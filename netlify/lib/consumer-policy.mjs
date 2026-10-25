// Preview policy identifier: not a claim that the production documents changed.
export const CONSUMER_POLICY_VERSION='2026-10-25-preview';
export function consumerConsent(payload,now=Date.now()){
 if(payload?.adult!==true||payload?.acceptedTerms!==true||payload?.policyVersion!==CONSUMER_POLICY_VERSION)throw Object.assign(new Error('Adults 18+ must accept the current Terms and Privacy Policy.'),{status:400});
 return {version:CONSUMER_POLICY_VERSION,acceptedAt:new Date(now).toISOString(),adult:true,terms:true,privacy:true};
}
