import {templateStyle} from './template-identity.mjs';
import {z} from 'zod';
import {isPlatformAdmin,authorizeSiteUser,siteRoleCapabilities} from './client-auth.mjs';
import {getClientSite,publicClientSite,clientCommerceStore,clientSiteStore} from './client-store.mjs';
import {oauthError} from './chatgpt-oauth.mjs';
import {accountingReport,emptyLedger} from './business-accounting.mjs';
import {loadAccountingTransactions} from '../functions/client-business-accounting.mjs';
import {sanitizeFactoryProposal,factoryDesignOptions} from '../functions/builder-ai.mjs';
const value=z.record(z.string(),z.unknown());
const entryBase={date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),note:z.string().max(300).optional()};
const cents=z.number().int().min(0).max(100000000).describe('USD cents; 1250 means $12.50'),employeeId=z.string().min(1).max(120),targetId=z.string().min(1).max(120);
const accountingEntry=z.discriminatedUnion('type',[
 z.object({...entryBase,type:z.literal('rate'),employeeId,hourlyCents:cents}),
 z.object({...entryBase,type:z.literal('work'),employeeId,regularMinutes:z.number().int().min(0).max(1440),overtimeMinutes:z.number().int().min(0).max(1440).default(0),overtimeHourlyCents:cents.default(0),commissionCents:cents.default(0),tipCents:cents.default(0)}),
 z.object({...entryBase,type:z.literal('approve'),targetId}),
 z.object({...entryBase,type:z.literal('payment'),targetId,amountCents:cents}),
 z.object({...entryBase,type:z.literal('expense'),category:z.enum(['operations','material_consumption','inventory_purchase']),description:z.string().min(1).max(300),amountCents:cents,itemId:z.string().max(120).optional(),quantity:z.number().int().min(0).max(1000000).default(0),reference:z.string().max(300).optional(),employeeId:employeeId.optional()}),
 z.object({...entryBase,type:z.literal('allocation'),employeeId,transactionId:z.string().min(1).max(120)}),
 z.object({...entryBase,type:z.literal('void'),targetId,note:z.string().min(1).max(300)})
].map(schema=>schema.strict()));
const redesignInput=z.object({
 business:z.object({nameEn:z.string().max(180).optional(),nameEs:z.string().max(180).optional(),descriptionEn:z.string().max(1800).optional(),descriptionEs:z.string().max(1800).optional(),category:z.string().max(180).optional()}).strict().optional(),
 design:z.object({templateSlug:z.enum(['',...factoryDesignOptions.templates]).optional(),style:z.enum(factoryDesignOptions.styles).optional(),primary:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),secondary:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional()}).strict(),
 features:z.object(Object.fromEntries(factoryDesignOptions.features.map(k=>[k,z.boolean().optional()]))).strict().optional()
}).strict();
export const operations={};
function add(name,capability,endpoint,fields,{action,method='POST',platform=false,owner=false,description='',confirmation='none'}={}){operations[name]={name,capability,endpoint,fields,action,method,platform,owner,description,confirmation};}
for(const [section,capability] of Object.entries({business:'website',design:'website',features:'website',catalog:'catalog',employees:'employees',hours:'employees',paymentRules:'payments',settings:'settings',taxConfig:'settings',reviewSettings:'marketing',members:'settings'}))add('update_'+section,capability,'client-admin',z.object({value:['catalog','employees','members'].includes(section)?z.array(value).max(100):value}).strict(),{method:'PATCH',owner:['members','paymentRules'].includes(section),confirmation:section==='members'?'sensitive':'none',description:`Replace the ${section} settings. Lists replace the complete list; preserve existing items.`});
for(const action of ['complete','cancel','mark_paid','refund','recover_pos','recover_ath','kitchen_status','invite_customer','sync_calendar'])add(action,action==='refund'?'refunds':action==='kitchen_status'?'kitchen':action==='recover_pos'?'pos':'orders','client-commerce-admin',z.object({kind:z.enum(['order','booking']),transactionId:z.string().min(1).max(120),kitchenStatus:z.enum(['received','preparing','ready','completed']).optional(),amount:z.number().positive().describe('Refund amount in USD dollars, e.g. 12.50.').optional()}).strict(),{action,confirmation:['complete','cancel','mark_paid','refund','recover_pos','recover_ath'].includes(action)?'sensitive':'none',description:`${action} one existing order or booking. May affect payments, inventory or send notifications.`});
add('adjust_inventory','catalog','client-v3-admin',z.object({itemId:z.string().max(120),quantityDelta:z.number().int(),reason:z.string().max(80)}).strict(),{action:'adjust_inventory',description:'Adjust physical inventory; this does not record an accounting cost.'});
add('upsert_customer','customers','client-v3-admin',z.object({value}).strict(),{action:'upsert_customer'});
add('create_payment_link','payments','client-v3-admin',z.object({value}).strict(),{action:'create_payment_link'});
add('set_payment_link_active','payments','client-v3-admin',z.object({paymentLinkId:z.string().max(180),active:z.boolean()}).strict(),{action:'set_payment_link_active'});
add('resend_receipt','payments','client-v3-admin',z.object({receiptId:z.string().max(180)}).strict(),{action:'resend_receipt',description:'Send one receipt through the connected business email.'});
for(const action of ['invite','revoke'])add('member_'+action,'settings','client-member-access',z.object({email:z.string().email(),role:z.enum(['manager','employee','cashier']).optional()}).strict(),{action,owner:true,confirmation:action==='revoke'?'sensitive':'none',description:'Change membership in this business only. Invitation recipients set their own credentials.'});
for(const action of ['disconnect_business_email','disconnect_google','disconnect_stripe','disconnect_ath','enable_stripe'])add(action,'integrations','client-integration-management',z.object({}).strict(),{action,owner:true,confirmation:action.startsWith('disconnect_')?'sensitive':'none'});
add('record_pos_sale','pos','client-pos-sale-idempotent',z.object({items:z.array(z.object({id:z.string(),quantity:z.number().int().min(1).max(20)}).strict()).min(1).max(50),customer:value.optional(),discountCents:z.number().int().nonnegative().optional(),tipCents:z.number().int().nonnegative().optional(),paymentMethod:z.enum(['cash','manual_ath','other']),locationId:z.string().optional()}).strict(),{confirmation:'sensitive',description:'Record a sale already paid outside WebFactory; does not charge a card.'});
add('reschedule_booking','bookings','reschedule',z.object({transactionId:z.string().min(1).max(120),start:z.string().datetime({offset:true})}).strict(),{description:'Reschedule one booking using current availability and booking rules. Sends connected business email notifications.'});
add('create_checkout','orders','create-client-checkout',z.object({customer:value,items:z.array(value).optional(),booking:value.optional(),locationId:z.string().optional(),paymentMethod:z.enum(['stripe','ath','in_person']).optional(),lang:z.enum(['en','es']).optional()}).strict(),{confirmation:'sensitive',description:'Create an order/booking using current price, availability and payment rules. External checkout remains manual.'});
add('cancel_subscription_renewal','billing','cancel-subscription-renewal',z.object({}).strict(),{owner:true,confirmation:'sensitive'});
add('accounting_entry','analytics','client-business-accounting',z.object({entry:accountingEntry}).strict(),{owner:true,confirmation:'accounting',description:'Record one salary, hours, approval, cost, payment record, allocation or correction entry. Does not send salary payments.'});
add('redesign','website','redesign',redesignInput,{description:'Apply Factory AI-compatible website configuration. Never replace catalog, employees, transactions or integrations.'});
for(const [name,endpoint] of [['invite_trial','create-trial-invite'],['invite_complimentary','create-complimentary-invite']])add(name,'platform',endpoint,z.object({email:z.string().email(),language:z.enum(['en','es']).optional()}).strict(),{platform:true,description:'Send a platform invitation email.'});
add('revoke_complimentary','platform','manage-complimentary-access',z.object({}).strict(),{platform:true,action:'revoke',confirmation:'sensitive'});
add('delete_business_page','billing','client-delete-account',z.object({}).strict(),{owner:true,action:'delete_site',confirmation:'delete',description:'Permanently delete the selected business page. Requires explicit in-chat confirmation.'});
add('admin_delete_business_page','platform','admin-delete-client-site',z.object({}).strict(),{platform:true,confirmation:'delete',description:'Permanently delete the selected business page. Requires explicit in-chat confirmation.'});
export function assertSafeInput(input,depth=0){if(depth>20)throw oauthError('Input too deeply nested.');if(input&&typeof input==='object')for(const [k,v] of Object.entries(input)){if(/^(?:__proto__|constructor|prototype|password|newPassword|secret|apiKey|accessToken|refreshToken|authorization|command|script|sourceCode|endpoint|urlToFetch)$/i.test(k))throw oauthError('Credentials and executable instructions are not accepted.');if(/(?:password|secret|apikey|accesstoken|refreshtoken|credential|authorization)/i.test(k.replace(/[^a-z]/gi,'')))throw oauthError('Private credentials are not accepted.');assertSafeInput(v,depth+1);}}
export function safeOutput(value,depth=0){if(depth>15)return null;if(Array.isArray(value))return value.slice(0,500).map(v=>safeOutput(v,depth+1));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!/(?:token|secret|password|authorization|credential|api[_-]?key|manageUrl|calendarUrl)/i.test(k)).map(([k,v])=>[k,safeOutput(v,depth+1)]));return typeof value==='string'?value.slice(0,12000):value;}
export async function authorizeGrant(grant,user,siteId='',capability='overview',{owner=false,platform=false}={}){
 if(!user||Date.parse(user.banned_until||'')>Date.now()||user.id!==grant.userId||String(user.email||'').toLowerCase()!==grant.email)throw oauthError('Account unavailable. Reconnect.',401);
 if(grant.platform){if(!isPlatformAdmin(user))throw oauthError('Administrator access revoked.',403);if(!siteId)return {user,membership:{role:'admin'},site:null};}
 else if(platform||!siteId||siteId!==grant.siteId)throw oauthError('This connection cannot access another business or platform administration.',403);
 if(platform&&!grant.platform)throw oauthError('Platform access required.',403);
 const site=await getClientSite(siteId);if(!site||site.siteId!==siteId||site.status==='deleted')throw oauthError('Business unavailable.',404);
 const access=authorizeSiteUser(user,site,['owner']);
 if(access.membership.role!=='admin'&&!siteRoleCapabilities(access.membership.role).includes(capability))throw oauthError('This role cannot perform this operation.',403);
 return access;
}
export function parseOperation(name,input){const op=Object.hasOwn(operations,name)&&operations[name];if(!op)throw oauthError('Operation not available.');assertSafeInput(input);const parsed=op.fields.safeParse(input);if(!parsed.success)throw oauthError('Invalid operation fields: '+parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ').slice(0,600));return {op,input:parsed.data};}
export function operationCapability(op,input){if(['complete','cancel','mark_paid','recover_ath','invite_customer','sync_calendar'].includes(op.name))return input.kind==='booking'?'bookings':'orders';if(op.name==='create_checkout'&&input.booking)return 'bookings';return op.capability;}
export function redesignSite(site,input){
 const proposal=sanitizeFactoryProposal({business:{...site.business,nameEn:site.business?.nameEn||site.business?.name,descriptionEn:site.business?.descriptionEn||site.business?.description,...input.business},design:{...site.design,...input.design},features:{...site.features,...input.features}});
 const {templateSlug,style,primary,secondary}=proposal.design;
 // Deliberately leave all operational entities and integration settings untouched.
 return {...site,business:{...site.business,...proposal.business,name:proposal.business.nameEn||site.business.name,description:proposal.business.descriptionEn||site.business.description},design:{...site.design,templateSlug,templateRoute:templateSlug?`/templates/${templateSlug}`:'',mode:templateSlug?'template_base':'custom',preserveTemplateStructure:Boolean(templateSlug),style:templateStyle(templateSlug)||style,primary,secondary},features:{...site.features,...proposal.features}};
}
export const readCollections={orders:'orders',bookings:'bookings',customers:'customers',receipts:'payments','payment-links':'payments','inventory-movements':'catalog','review-requests':'marketing'};
export async function listRecords(siteId,collection,{limit=50,offset=0}={}){
 if(!Object.hasOwn(readCollections,collection))throw oauthError('Invalid collection.');
 const prefix=`${siteId}/${['orders','bookings'].includes(collection)?'':'v3/'}${collection}/`,store=clientCommerceStore(),rows=[];let index=0,more=false;
 outer:for await(const page of store.list({prefix,paginate:true}))for(const blob of page.blobs||[]){if(index++<offset)continue;if(rows.length>=limit){more=true;break outer;}const row=await store.get(blob.key,{type:'json'});if(row?.siteId&&row.siteId!==siteId)throw oauthError('Invalid tenant record.',409);if(row)rows.push(safeOutput(row));}
 return {records:rows,nextOffset:more?offset+rows.length:null,order:'storage key order'};
}
export async function platformBusinesses(){const rows=[];for await(const page of clientSiteStore().list({prefix:'sites/',paginate:true})){for(const blob of page.blobs||[]){if(rows.length>=1000)throw oauthError('Too many businesses for this report.',413);const s=await clientSiteStore().get(blob.key,{type:'json'});if(s?.siteId)rows.push({siteId:s.siteId,name:s.business?.name,slug:s.slug,status:s.status,subscriptionStatus:s.servicePlan?.subscriptionStatus,billingModel:s.servicePlan?.billingModel,ownerEmail:s.members?.find(m=>m.role==='owner')?.email});}}return rows;}
export async function accountingForSite(site,args){const store=clientCommerceStore();return accountingReport(await store.get(`${site.siteId}/accounting/ledger.json`,{type:'json'})||emptyLedger(),await loadAccountingTransactions(store,site.siteId),site,args.from,args.to,args.employeeId||'');}
export function businessView(site,membership){const publicSite=publicClientSite(site);return safeOutput({...publicSite,configuration:Object.fromEntries(['business','design','features','catalog','employees','hours','paymentRules','settings','taxConfig','members','reviewSettings'].map(k=>[k,site[k]])),revision:site.revision,role:membership.role,integrationStatus:{googleCalendar:Boolean(site.googleCalendar?.connected),businessEmail:Boolean(site.businessEmail?.connected),stripe:Boolean(site.paymentRules?.stripeConnectedAccountId)},subscription:{status:site.servicePlan?.subscriptionStatus,model:site.servicePlan?.billingModel},portalUrl:'/client-admin',credentials:'Only available manually in WebFactory'});}
