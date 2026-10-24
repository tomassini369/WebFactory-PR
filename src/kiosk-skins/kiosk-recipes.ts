import {kioskAppearance,type KioskAppearance} from '../../netlify/lib/kiosk-skins.mjs'
// Original WebFactory recipes; no paid templates, remote CSS or fonts.
export const kioskPalettes=[
 {id:'navy',name:'Navy',primary:'#102038',secondary:'#78a7e4',from:'#102038',to:'#385a83'},
 {id:'sand',name:'Sand',primary:'#c8b99e',secondary:'#785832',from:'#c8b99e',to:'#7a624b'},
 {id:'forest',name:'Forest',primary:'#143d30',secondary:'#b2dbc0',from:'#143d30',to:'#40826b'},
 {id:'berry',name:'Berry',primary:'#4b193b',secondary:'#efb7d0',from:'#4b193b',to:'#885272'},
 {id:'copper',name:'Copper',primary:'#482b22',secondary:'#e4b391',from:'#482b22',to:'#b57a50'},
 {id:'mono',name:'Mono',primary:'#20242a',secondary:'#dbe0e7',from:'#20242a',to:'#677482'},
]
export const kioskRecipes:Array<{id:string;name:string;es:string;en:string;appearance:KioskAppearance}>=[
 {id:'original',name:'Classic',es:'La apariencia original, con tus colores.',en:'Original appearance with your colors.',appearance:kioskAppearance()},
 {id:'studio',name:'Studio Matte',es:'Servicios en lista y superficies mate.',en:'Service list and matte surfaces.',appearance:kioskAppearance({skinId:'barber-luxury',primary:'#20242a',secondary:'#dbe0e7',layout:'list',finish:'matte',cards:'square',welcome:'banner'})},
 {id:'bistro',name:'Bistro Gloss',es:'Menú fotográfico y brillo en los controles.',en:'Photographic menu and glossy controls.',appearance:kioskAppearance({skinId:'restaurant-touch',primary:'#482b22',secondary:'#e4b391',layout:'gallery',finish:'gloss',welcome:'hero'})},
 {id:'aurora',name:'Aurora Glass',es:'Degradado y paneles de cristal.',en:'Gradient and glass panels.',appearance:kioskAppearance({skinId:'glass-premium',primary:'#102038',secondary:'#b4d0ed',colorMode:'gradient',gradientFrom:'#102038',gradientTo:'#385a83',finish:'glass',welcome:'hero'})},
 {id:'boutique',name:'Boutique Copper',es:'Catálogo compacto y acabado metálico.',en:'Compact catalog and metallic finish.',appearance:kioskAppearance({skinId:'retail-minimal',primary:'#482b22',secondary:'#e4b391',layout:'compact',finish:'metallic',buttons:'square'})},
 {id:'garden',name:'Garden Waves',es:'Patrón suave y espacio entre elementos.',en:'Soft pattern and spacious elements.',appearance:kioskAppearance({primary:'#143d30',secondary:'#b2dbc0',colorMode:'pattern',pattern:'waves',finish:'matte',density:'spacious',welcome:'banner'})},
]
