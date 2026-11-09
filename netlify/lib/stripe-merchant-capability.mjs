// Accounts v1 is Stripe's supported compatibility view for v1 and v2 merchants.
// Payment readiness must not depend on access to an expanded v2 configuration.
export async function verifyMerchantCapability(accountId,{secretKey=globalThis.Netlify?.env?.get('STRIPE_SECRET_KEY')||'',fetcher=fetch}={}){
  if(!/^acct_[A-Za-z0-9]+$/.test(accountId||''))throw Object.assign(new Error('Online payments are not connected for this business.'),{status:409});
  const response=await fetcher(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`,{
    headers:{Authorization:`Bearer ${secretKey}`,'Stripe-Version':'2026-08-26.dahlia'},signal:AbortSignal.timeout(15000),
  });
  const account=await response.json().catch(()=>null);
  if(!response.ok){
    // Provider messages can echo credentials or private merchant data.
    const message=response.status===401?'Stripe connection could not be authenticated. Review the API key for this environment.'
      :response.status===403?'Stripe permissions do not allow verifying this business. Review the connected account access.'
      :response.status===400||response.status===404?'Stripe could not find or verify this connected business. Review the account connection.'
      :'Stripe account status is temporarily unavailable. Try again later.';
    throw Object.assign(new Error(message),{status:[400,401,403,404].includes(response.status)?409:503});
  }
  if(!account||account.id!==accountId)throw Object.assign(new Error('Stripe returned an unexpected business account.'),{status:502});
  const capability=account.capabilities?.card_payments||'pending';
  return capability==='active'?(account.charges_enabled===true?'active':'pending'):capability;
}
