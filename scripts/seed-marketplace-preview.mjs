import {getDeployStore} from '@netlify/blobs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {consumerKey} from '../netlify/lib/marketplace.mjs';
import {CONSUMER_POLICY_VERSION} from '../netlify/lib/consumer-policy.mjs';
import {readFile,writeFile} from 'node:fs/promises';

export async function seedMarketplacePreview(env=process.env,store=getDeployStore) {
  if (env.CONTEXT!=='deploy-preview' || env.REVIEW_ID!=='152' || (env.HEAD||env.BRANCH)!=='feat/marketplace-catalog-journeys') return;
  const draft=JSON.parse(await readFile(new URL('../preview/fixtures/faro-norte/builder-draft.json',import.meta.url),'utf8'));
  const siteId='site-qa-marketplace-152',slug='faro-norte-qa-152';
  const service=draft.catalog.find(item=>item.requiresAppointment);
  const product={id:'pomada-qa',type:'product',name:'Pomada de prueba',nameEn:'Test pomade',nameEs:'Pomada de prueba',price:12,active:true,requiresAppointment:false};
  const site={siteId,slug,status:'active',previewFixture:'marketplace-152',revision:1,members:[],
    servicePlan:{billingModel:'complimentary',subscriptionStatus:'complimentary'},business:{...draft.business,name:'Faro Norte · QA',nameEs:'Faro Norte · QA',nameEn:'Faro Norte · QA',email:'',phone:'',locations:[{id:'arecibo-preview',name:'Arecibo QA',address:'Arecibo, Puerto Rico',active:true,hours:draft.hours}]},
    catalog:[{...service,active:true,description:'Corte de prueba con pago presencial simulado.',descriptionEn:'Test haircut with simulated in-person payment.',descriptionEs:'Corte de prueba con pago presencial simulado.'},product],features:{...draft.features,products:true,stripe:false},
    design:{...draft.design,mode:'template_base',templateCategory:'Barber',templateRoute:'/templates/northline-barber',preserveTemplateStructure:true},
    hours:draft.hours,employees:draft.team.map(member=>({...member,active:true,serviceIds:[service.id],locationIds:['arecibo-preview'],schedule:draft.hours})),
    paymentRules:{methods:{inPerson:true},productPayment:'in_person',bookingPayment:'in_person'},settings:{locale:'es',timezone:'America/Puerto_Rico',currency:'usd'}};
  const sites=store('webfactory-client-sites',{consistency:'strong'});
  await sites.setJSON('sites/'+siteId+'.json',site,{onlyIfNew:true});
  await sites.setJSON('slugs/'+slug+'.json',{siteId,slug},{onlyIfNew:true});
  const now=Date.now();
  const offers=store('webfactory-client-commerce',{consistency:'strong'});
  await offers.setJSON('marketplace/organic/'+siteId+'/'+product.id,{siteId,itemId:product.id,title:'Pomada de prueba · QA',terms:'Oferta de demostración en el preview.',price:12,start:now,end:now+7*86400000,revision:1},{onlyIfNew:true});

  // Only this explicitly requested build gets the disposable actor.
  const subject=execFileSync('git',['log','-1','--format=%s'],{encoding:'utf8'}).trim();
  if (subject!=='Validate sandbox activation for preview 152') return;
  const actor={id:randomUUID(),name:'Marca Faro · QA',email:'marca-faro@example.invalid',confirmedAt:new Date(now).toISOString()};
  await sites.setJSON(consumerKey(actor.id),{
    status:'active',name:actor.name,municipality:'Arecibo',favorites:[],following:[],revision:1,
    consent:{version:CONSUMER_POLICY_VERSION,fixture:true},previewFixture:'marketplace-152'
  },{onlyIfNew:true});

  // Exercise the application handler in the build process. No HTTP endpoint
  // accepts this identity. Keep even the synthetic tariff in a dedicated store.
  const {createAdsHandler}=await import('../netlify/functions/marketplace-ads.mjs');
  const {offerKey,adKey}=await import('../netlify/lib/marketplace-ads.mjs');
  const qa=store('webfactory-preview-advertiser-qa',{consistency:'strong'});
  const offer={enabled:true,approved:true,taxReviewed:true,version:'qa-only',amount:100,days:1,terms:'Oferta ficticia para el ensayo aislado del despliegue.'};
  await qa.setJSON(offerKey,offer);
  const handler=createAdsHandler({store:()=>qa,profiles:()=>sites,consumer:async()=>actor,admin:async()=>({id:'qa-reviewer'})});
  const url='https://preview.example/.netlify/functions/marketplace-ads';
  const result=await handler(new Request(url,{method:'POST',headers:{Origin:'https://preview.example','Content-Type':'application/json'},
    body:JSON.stringify({scope:'advertiser',action:'apply',brand:actor.name,title:'Campaña de prueba',body:'Ensayo de solicitud de una marca externa.',accepted:true,offerVersion:offer.version})}));
  if(!result.ok)throw new Error('Disposable advertiser could not submit the QA campaign.');
  const response=await handler(new Request(url+'?scope=advertiser'));
  const {campaigns}=await response.json();
  if(campaigns?.length!==1||campaigns[0].status!=='pending_review')throw new Error('Disposable advertiser campaign was not persisted.');
  const campaign=campaigns[0];
  const review=await handler(new Request(url,{method:'POST',headers:{Origin:'https://preview.example','Content-Type':'application/json'},
    body:JSON.stringify({scope:'admin',action:'moderate',id:campaign.id,revision:campaign.revision,decision:'approve',reviewed:true,reason:'Contenido ficticio revisado para la prueba del PR 152.'})}));
  if(!review.ok)throw new Error('Fixture review failed.');
  const row=await qa.get(adKey(campaign.id),{type:'json'});
  if(row.status!=='approved')throw new Error('Missing fixture approval.');
  // Only the reviewed fixture goes into the deploy store read by the webhook.
  await offers.setJSON(adKey(row.id),row,{onlyIfNew:true});
  await writeFile('dist/qa-anunciante-152.json',JSON.stringify({marca:row.brand,entorno:'Preview 152',estadoInicial:row.status,campaignId:row.id,fixtureAccount:row.siteId,importeCentavos:row.offer.amount},null,2));
}
