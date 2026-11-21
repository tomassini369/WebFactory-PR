import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPromotion,validatePromotion} from './organic-promotions.mjs';
const site={siteId:'salon',slug:'salon',status:'active',servicePlan:{billingModel:'complimentary'},business:{name:'Salon'},features:{services:true},catalog:[{id:'cut',name:'Cut',type:'service',active:true,price:20}]};
const input={itemId:'cut',title:'Evening cut',terms:'By appointment',start:100,end:200,price:1};
test('only eligible, current offers use current public catalog prices',()=>{
 const offer=validatePromotion(site,input,90);
 assert.equal(offer.price,20);
 for(const now of [99,200]) assert.equal(publicPromotion(site,offer,now),null);
 assert.equal(publicPromotion(site,offer,100).itemId,'cut');
 assert.equal(publicPromotion({...site,siteId:'other'},offer,110),null);
 assert.equal(publicPromotion({...site,status:'suspended'},offer,110),null);
 assert.equal(publicPromotion({...site,catalog:[]},offer,110),null);
 assert.equal(publicPromotion({...site,catalog:[{...site.catalog[0],price:25}]},offer,110),null);
 assert.equal(publicPromotion(site,{...offer,withdrawn:true},110),null);
 assert.equal(validatePromotion(site,{...input,end:80},90),null);
});
