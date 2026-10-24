// Recreate an owner-requested sample in this deploy's existing stores only.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {getDeployStore} from '@netlify/blobs';
import {memberIndexKey} from '../netlify/lib/member-index.mjs';
import {validateKioskAppearance} from '../netlify/lib/kiosk-skins.mjs';

export const fixtureSiteId='site-preview-faro-norte';
const fixtureRoot=new URL('../preview/fixtures/faro-norte/',import.meta.url);
export function previewBarberEnabled(env){
  return env.CONTEXT==='deploy-preview'&&(env.HEAD||env.BRANCH)==='feat/kiosk-skin-engine'
    &&env.REVIEW_ID==='125'&&env.WF_PREVIEW_TEST_BUSINESS==='faro-norte-v1';
}
export async function previewBarberData(ownerEmail,accountId='',now=new Date()){
  const email=String(ownerEmail||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.endsWith('.invalid'))throw new Error('Configure the existing preview owner email.');
  if(accountId&&!/^acct_[A-Za-z0-9]+$/.test(accountId))throw new Error('Invalid sandbox merchant.');
  const draft=JSON.parse(await readFile(new URL('builder-draft.json',fixtureRoot),'utf8'));
  const template=JSON.parse(await readFile(new URL('kiosk-configuration.json',fixtureRoot),'utf8'));
  const assetKey=name=>`sites/${fixtureSiteId}/faro-norte/${name}.webp`;
  const backgroundKey=`sites/${fixtureSiteId}/kiosk-backgrounds/67a395f5-f756-4f44-b774-f18b75bbcd7d.webp`;
  const locationId='arecibo-preview';
  const createdAt=now.toISOString();
  const site={siteId:fixtureSiteId,slug:draft.business.slug,status:'active',revision:1,createdAt,updatedAt:createdAt,
    previewFixture:'faro-norte-v1',members:[{email,role:'owner'}],
    business:{...draft.business,email:'faro-norte@example.invalid',contactName:'Equipo de pruebas WebFactory PR',logoAssetKey:assetKey('logo'),heroAssetKey:assetKey('logo'),galleryAssetKeys:[],
      locations:[{id:locationId,name:'Arecibo · PRUEBAS',active:true,address:'Arecibo, Puerto Rico · ubicación de prueba',phone:'',mapsUrl:'',hours:draft.hours}]},
    design:{...draft.design,mode:'template_base',templateCategory:'Barber',templateName:'Northline Barber Studio',templateRoute:'/templates/northline-barber',preserveTemplateStructure:true},
    features:draft.features,hours:draft.hours,
    catalog:draft.catalog.map(item=>({...item,active:true,bufferMinutes:5,taxable:false,imageAssetKey:assetKey(item.imageName.replace('.webp',''))})),
    employees:draft.team.map(member=>({...member,active:true,calendarId:'',dailyLimit:12,schedule:draft.hours,timeOff:[],locationIds:[locationId]})),
    paymentRules:{...draft.payments,stripeConnectedAccountId:accountId,stripeCapabilityStatus:accountId?'active':'not_started'},
    // Amounts deliberately exclude tax in this fictional fixture; no tax advice.
    taxConfig:{enabled:false,stateRate:10.5,municipalRate:1,defaultTaxable:false,pricesIncludeTax:false},
    settings:{locale:'es',timezone:'America/Puerto_Rico',currency:'usd'},
    googleCalendar:{connected:false,calendarEmail:'',employeeCalendars:{}},
    businessEmail:{provider:'',connected:false,connectedEmail:''},
    servicePlan:{code:'preview-fixture',name:'Barbería de pruebas · Preview',billingModel:'complimentary',subscriptionStatus:'complimentary',fixtureOnly:true},
  };
  const appearance=validateKioskAppearance({...template.appearance,backgroundAssetKey:backgroundKey},fixtureSiteId);
  const configuration={...template,appearance,devices:[],operations:{cashierEnabled:true,displayEnabled:true,profile:'barber',revision:1},
    appearancePresets:[{id:'faro-norte-original',name:'Faro Norte · Glass',appearance}],
    backgroundAssets:[{key:backgroundKey,name:'Faro Norte · Logo',size:0}],updatedAt:now.getTime(),updatedBy:'preview-build'};
  return {site,configuration,assetKey,backgroundKey,email};
}

export async function seedPreviewBarber({env=process.env,store=getDeployStore,loadAsset=name=>readFile(new URL(`images/${name}.webp`,fixtureRoot)),now=new Date()}={}){
  if(!previewBarberEnabled(env))return {seeded:false,reason:'disabled'};
  const {site,configuration,assetKey,backgroundKey,email}=await previewBarberData(env.WF_PREVIEW_TEST_OWNER_EMAIL,env.WF_PREVIEW_STRIPE_ACCOUNT||'',now);
  // No getStore, Identity creation, OAuth tokens, payments or seeded paid bookings.
  const sites=store('webfactory-client-sites',{consistency:'strong'});
  const assets=store('webfactory-client-assets',{consistency:'strong'});
  const commerce=store('webfactory-client-commerce',{consistency:'strong'});
  const existing=await sites.get(`sites/${fixtureSiteId}.json`,{type:'json'});
  if(existing&&(existing.previewFixture!=='faro-norte-v1'||!existing.members?.some(m=>m.email===email&&m.role==='owner')))throw new Error('Preview fixture ownership conflict.');
  const slugKey=`slugs/${site.slug}.json`,slug=await sites.get(slugKey,{type:'json'});
  if(slug&&slug.siteId!==fixtureSiteId)throw new Error('Preview fixture slug conflict.');
  if(!existing){
    for(const name of ['logo','corte-clasico','corte-barba','barba','ritual-toalla']){
      const bytes=await loadAsset(name);
      const metadata={contentType:'image/webp',originalName:`${name}.webp`,size:bytes.length,fixtureOnly:true};
      await assets.set(assetKey(name),bytes,{metadata,onlyIfNew:true});
      if(name==='logo'){
        await assets.set(backgroundKey,bytes,{metadata:{...metadata,kioskBackground:true},onlyIfNew:true});
        configuration.backgroundAssets[0].size=bytes.length;
      }
    }
    await commerce.setJSON(`${fixtureSiteId}/pos-kiosk/config.json`,configuration,{onlyIfNew:true});
    const saved=await sites.setJSON(`sites/${fixtureSiteId}.json`,site,{onlyIfNew:true});
    if(!saved.modified)throw new Error('Preview fixture changed during creation.');
  }
  await sites.setJSON(slugKey,{siteId:fixtureSiteId,slug:site.slug},{onlyIfNew:true});
  await sites.setJSON(memberIndexKey(email,fixtureSiteId),{siteId:fixtureSiteId,email,revision:Number(existing?.revision||1),active:true,role:'owner'},{onlyIfNew:true});
  return {seeded:!existing,siteId:fixtureSiteId,slug:site.slug,services:site.catalog.length,appearance:configuration.appearance.skinId};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=await seedPreviewBarber();
  console.log('Preview barber fixture:',JSON.stringify(result));
  if(process.env.CONTEXT==='deploy-preview'&&process.env.REVIEW_ID==='125'){
    const report={...result,context:process.env.CONTEXT,branch:process.env.HEAD||process.env.BRANCH||'',reviewId:process.env.REVIEW_ID,enabled:process.env.WF_PREVIEW_TEST_BUSINESS==='faro-norte-v1'};
    await mkdir('dist/design-preview',{recursive:true});
    await writeFile('dist/design-preview/faro-norte-status.json',JSON.stringify(report));
  }
}
