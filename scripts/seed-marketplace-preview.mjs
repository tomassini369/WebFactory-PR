import {getDeployStore} from '@netlify/blobs';
import {readFile} from 'node:fs/promises';

export async function seedMarketplacePreview(env=process.env,store=getDeployStore) {
  if (env.CONTEXT!=='deploy-preview' || env.REVIEW_ID!=='152' || (env.HEAD||env.BRANCH)!=='feat/marketplace-catalog-journeys') return;
  const draft=JSON.parse(await readFile(new URL('../preview/fixtures/faro-norte/builder-draft.json',import.meta.url),'utf8'));
  const siteId='site-qa-marketplace-152',slug='faro-norte-qa-152';
  const service=draft.catalog.find(item=>item.requiresAppointment);
  const product={id:'pomada-qa',type:'product',name:'Pomada de prueba',nameEn:'Test pomade',nameEs:'Pomada de prueba',price:12,active:true,requiresAppointment:false};
  const site={siteId,slug,status:'active',previewFixture:'marketplace-152',revision:1,members:[],
    servicePlan:{billingModel:'complimentary',subscriptionStatus:'complimentary'},business:{...draft.business,name:'Faro Norte · QA',nameEs:'Faro Norte · QA',nameEn:'Faro Norte · QA',email:'',phone:'',locations:[{id:'arecibo-preview',name:'Arecibo QA',address:'Arecibo, Puerto Rico',active:true,hours:draft.hours}]},
    catalog:[{...service,active:true},product],features:{...draft.features,products:true,stripe:false},
    design:{...draft.design,mode:'template_base',templateCategory:'Barber',templateRoute:'/templates/northline-barber',preserveTemplateStructure:true},
    hours:draft.hours,employees:draft.team.map(member=>({...member,active:true,serviceIds:[service.id],locationIds:['arecibo-preview'],schedule:draft.hours})),
    paymentRules:{},settings:{locale:'es',timezone:'America/Puerto_Rico',currency:'usd'}};
  const sites=store('webfactory-client-sites',{consistency:'strong'});
  await sites.setJSON('sites/'+siteId+'.json',site,{onlyIfNew:true});
  await sites.setJSON('slugs/'+slug+'.json',{siteId,slug},{onlyIfNew:true});
  const now=Date.now();
  const offers=store('webfactory-client-commerce',{consistency:'strong'});
  await offers.setJSON('marketplace/organic/'+siteId+'/'+product.id,{siteId,itemId:product.id,title:'Pomada de prueba · QA',terms:'Oferta de demostración en el preview.',price:12,start:now,end:now+7*86400000,revision:1},{onlyIfNew:true});
}
