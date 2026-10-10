export type PosItem = {id:string;type:'product'|'service';name?:string;nameEn?:string;nameEs?:string;description?:string;descriptionEn?:string;descriptionEs?:string;price:number;active?:boolean;inventory?:number|null;trackInventory?:boolean;allowBackorder?:boolean;taxable?:boolean;taxRateOverride?:number|null;imageAssetKey?:string;requiresAppointment?:boolean}
export type PosLine = {id:string;quantity:number}
export type PosTax = {enabled?:boolean;stateRate?:number;municipalRate?:number;pricesIncludeTax?:boolean}
export function posItemName(item:PosItem,lang:'es'|'en') {return (lang==='es'?item.nameEs||item.nameEn||item.name:item.nameEn||item.name||item.nameEs)||item.id}
export function posQuantityLimit(item:PosItem){return item.type==='product'&&item.trackInventory&&item.inventory!=null&&!item.allowBackorder?Math.max(0,Math.min(20,Math.floor(Number(item.inventory)||0))):20}
const clampRate=(rate:number)=>Number.isFinite(rate)?Math.min(100,Math.max(0,Math.round(rate*10000)/10000)):0
export function estimatePosTotals(catalog:PosItem[],cart:PosLine[],discountCents:number,tipCents:number,config:PosTax={}){
 const lines=cart.map(line=>({line,item:catalog.find(item=>item.id===line.id&&item.active!==false)}))
 const invalid=lines.some(({line,item})=>!item||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>posQuantityLimit(item)||!Number.isFinite(item.price)||item.price<0)||!Number.isSafeInteger(discountCents)||discountCents<0||!Number.isSafeInteger(tipCents)||tipCents<0
 const subtotal=lines.reduce((s,{line,item})=>s+Math.round(Number(item?.price||0)*100)*line.quantity,0)
 const discount=Math.max(0,Math.min(subtotal,discountCents||0)),tip=Math.max(0,tipCents||0),base=Math.max(0,subtotal-discount)
 const tax=lines.reduce((sum,{line,item})=>{
  if(!item||config.enabled===false||item.taxable===false||subtotal<=0)return sum
  const amount=Math.max(0,Math.round(base*(Math.round(item.price*100)*line.quantity/subtotal)))
  const rate=item.taxRateOverride==null?clampRate(Number(config.stateRate??10.5))+clampRate(Number(config.municipalRate??1)):clampRate(Number(item.taxRateOverride))
  return sum+(config.pricesIncludeTax?amount-Math.round(amount/(1+rate/100)):Math.round(amount*rate/100))
 },0)
 return {subtotal,discount,tip,tax,total:Math.max(0,base+(config.pricesIncludeTax?0:tax)+tip),invalid:invalid||!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(base+tax+tip)}
}
export function posBrandPair(value:string){
 const luminance=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
 const color=/^#[a-f\d]{6}$/i.test(value)?value:'#285fa6',l=luminance(color),ink=luminance('#0b1529')
 if(1.05/(l+.05)>=4.5)return {background:color,foreground:'#ffffff'}
 if((l+.05)/(ink+.05)>=4.5)return {background:color,foreground:'#0b1529'}
 return {background:'#285fa6',foreground:'#ffffff'}
}
