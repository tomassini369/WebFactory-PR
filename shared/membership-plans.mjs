export const membershipPlans = Object.freeze({
  basic: Object.freeze({name:'Básico',nameEn:'Basic',monthly:30,annual:300}),
  standard: Object.freeze({name:'Standard',nameEn:'Standard',monthly:49,annual:490}),
  premium: Object.freeze({name:'Premium',nameEn:'Premium',monthly:79,annual:790}),
});
export const membershipIds = Object.freeze(Object.keys(membershipPlans));
export const membershipTrialDays = 14;
export const membershipConsentVersion = 'membership-v1';
export const isMembershipId = value => typeof value === 'string' && Object.hasOwn(membershipPlans,value);
export const membershipPriceEnv = (tier,interval) => `STRIPE_PRICE_WEBFACTORY_${tier.toUpperCase()}_${interval.toUpperCase()}`;
export const membershipEnabled = () => globalThis.Netlify?.env?.get('WEBFACTORY_TIERED_PLANS_ENABLED') === 'true';
export const basicProfessional = site => (site.employees || []).find(member=>member.active!==false && member.serviceIds?.length)?.id;
export const isBasicMembership = site => site?.servicePlan?.tier==='basic';
export function membershipAllowsCapability(site, capability) {
  const tier=site?.servicePlan?.tier;
  if(tier==='basic' && ['payments','refunds','collect','pos','kitchen','orders','analytics'].includes(capability))return false;
  if(tier==='standard' && ['pos','kitchen','collect'].includes(capability))return false;
  return true;
}
