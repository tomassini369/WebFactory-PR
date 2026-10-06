import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeClientSection} from '../functions/client-admin.mjs';
import {publicClientSite} from './client-store.mjs';
import {sanitizeBuilderRequest} from './builder-request.mjs';
import {slotsForSchedule} from './booking-engine.mjs';
const site={siteId:'demo',design:{templateSlug:'balance-wellness',style:'Luxury'},business:{},catalog:[],servicePlan:{subscriptionStatus:'active'}};
const normalize=(section,value)=>normalizeClientSection(site,section,value,{email:'owner@example.com'},{role:'owner'});
test('portal persists bilingual template content and public projection includes it',()=>{
 const business=normalize('business',{headlineEn:'Headline',headlineEs:'Título',aboutTextEs:'Nuestra historia',trustEs:['Profesionales'],heroAssetKey:'sites/demo/hero',galleryAssetKeys:['sites/demo/gallery'],address:'Camuy'});
 const publicSite=publicClientSite({...site,business});assert.equal(publicSite.business.headlineEs,'Título');assert.equal(publicSite.business.aboutTextEs,'Nuestra historia');assert.deepEqual(publicSite.business.trustEs,['Profesionales']);assert.equal(publicSite.business.address,'Camuy');assert.match(publicSite.business.heroUrl,/sites%2Fdemo%2Fhero/);assert.equal(publicSite.business.galleryUrls.length,1);
 assert.throws(()=>normalize('business',{heroAssetKey:'sites/another-business/hero'}),/belong/);
});
test('Builder retains template content and catalog presentation; template identity locks visual style',()=>{
 const order=sanitizeBuilderRequest({draftId:'draft-12345678901234567890',orderData:{client:{name:'Owner',email:'owner@example.com'},business:{name:'Studio',headlineEs:'Título',aboutTitleEn:'Our story'},design:{templateSlug:'balance-wellness',style:'Luxury'},catalog:[{id:'class',type:'service',presentationType:'class',price:50,deposit:10,groupCapacity:12,badgeEs:'Nuevo',requiresAppointment:true}],payments:{methods:{inPerson:true}}}});
 assert.equal(order.business.headlineEs,'Título');assert.equal(order.design.style,'Minimal');assert.equal(order.catalog[0].groupCapacity,12);assert.equal(order.catalog[0].deposit,10);assert.equal(normalize('design',{style:'Luxury'}).style,'Minimal');
});
test('portal and public catalog preserve classes, labels, deposits and informational listings',()=>{
 const catalog=normalize('catalog',[{id:'class',type:'service',presentationType:'class',price:50,deposit:10,groupCapacity:12,badgeEs:'Nuevo',requiresAppointment:true},{id:'house',type:'product',presentationType:'listing',price:300000,purchasable:false,displayPrice:'From $300,000'}]);
 const projected=publicClientSite({...site,catalog}).catalog;assert.equal(projected[0].presentationType,'class');assert.equal(projected[0].badgeEs,'Nuevo');assert.equal(projected[0].groupCapacity,12);assert.equal(projected[0].deposit,10);assert.equal(projected[1].purchasable,false);
});
test('group slots admit exact same session until capacity and block other overlapping services',()=>{
 const options={date:'2028-02-01',schedule:{enabled:true,open:'10:00',close:'11:00'},service:{id:'yoga',duration:60,groupCapacity:2},timeZone:'America/Puerto_Rico'};
 const seat={start:Date.parse('2028-02-01T14:00:00Z'),end:Date.parse('2028-02-01T15:00:00Z'),serviceId:'yoga'};
 assert.equal(slotsForSchedule({...options,blocks:[seat]}).length,1);assert.equal(slotsForSchedule({...options,blocks:[seat,seat]}).length,0);assert.equal(slotsForSchedule({...options,blocks:[{...seat,serviceId:'massage'}]}).length,0);
});
