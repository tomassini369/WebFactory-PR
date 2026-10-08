import groups from '../../shared/website-fields.json' with {type:'json'};
import {cleanText} from './platform-utils.mjs';
export function websiteContent(value={},current={}) {
 const out={};
 for(const {fields} of groups)for(const [key] of fields)for(const suffix of ['', 'En','Es'])out[key+suffix]=cleanText(value[key+suffix]??current[key+suffix],key==='aboutText'||key.endsWith('Intro')?6000:500);
 for(const key of ['trust','highlights'])for(const suffix of ['', 'En','Es']){
  const list=value[key+suffix]??current[key+suffix];
  out[key+suffix]=Array.isArray(list)?list.slice(0,20).map(x=>cleanText(x,220)).filter(Boolean):[];
 }
 return out;
}
export function catalogPresentation(item={}) {
 return {
  presentationType:['product','service','class','listing'].includes(item.presentationType)?item.presentationType:(item.type==='service'?'service':'product'),
  badge:cleanText(item.badge,120),badgeEn:cleanText(item.badgeEn,120),badgeEs:cleanText(item.badgeEs,120),
  displayPrice:cleanText(item.displayPrice,120),displayPriceEn:cleanText(item.displayPriceEn,120),displayPriceEs:cleanText(item.displayPriceEs,120),
  groupCapacity:Math.max(1,Math.min(500,Math.floor(Number(item.groupCapacity)||1))),
  deposit:item.deposit===null||item.deposit===undefined||item.deposit===''?null:Math.min(Math.max(0,Number(item.price)||0),Math.max(0,Number(item.deposit)||0)),
  purchasable:item.purchasable!==false,
 };
}
