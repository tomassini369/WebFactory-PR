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
// Licensed-free color tokens derived from owner-provided references; no image or font assets are bundled.
// These recipes are optional drafts and never alter an existing saved design by themselves.
export const premiumKioskPalettes=[
 {id:'mocha-earth',name:'Mocha Earth',primary:'#1A120E',secondary:'#A88462',from:'#1A120E',to:'#6B4A2E',swatches:["#1A120E","#3A2418","#6B4A2E","#A88462","#D5C4AE","#4A4A46"]},
 {id:'purple-haze',name:'Purple Haze',primary:'#0E0B1D',secondary:'#8B7CC7',from:'#0E0B1D',to:'#5A3B8C',swatches:["#0E0B1D","#2A1E4D","#5A3B8C","#8B7CC7","#C9C2E3","#3A3A52"]},
 {id:'forest-glow',name:'Forest Glow',primary:'#0F1F17',secondary:'#6B7F67',from:'#0F1F17',to:'#3E5A3F',swatches:["#0F1F17","#1E3A2E","#3E5A3F","#6B7F67","#C7CBB8","#3D4337"]},
 {id:'arctic-blue',name:'Arctic Blue',primary:'#0B132B',secondary:'#5BC0DE',from:'#0B132B',to:'#3A506B',swatches:["#0B132B","#1C2541","#3A506B","#5BC0DE","#F4D6B0","#D97706"]},
 {id:'neon-pop',name:'Neon Pop',primary:'#121212',secondary:'#64748B',from:'#121212',to:'#334155',swatches:["#121212","#1F2937","#334155","#64748B","#F1F5F9","#EC4899"]},
 {id:'ocean-teal',name:'Ocean Teal',primary:'#0A0F14',secondary:'#7FB3B8',from:'#0A0F14',to:'#2E6F73',swatches:["#0A0F14","#0F3D3E","#2E6F73","#7FB3B8","#EADCC8","#C6601F"]},
 {id:'rose-blush',name:'Rose Blush',primary:'#1A0F2E',secondary:'#D6598F',from:'#1A0F2E',to:'#7A2E6F',swatches:["#1A0F2E","#3B1B4F","#7A2E6F","#D6598F","#F4D7D4","#FF6B6B"]},
 {id:'sunset-fusion',name:'Sunset Fusion',primary:'#1A1A1F',secondary:'#A678B9',from:'#1A1A1F',to:'#6A5ACD',swatches:["#1A1A1F","#2D2B55","#6A5ACD","#A678B9","#F0D9B5","#F4A62A"]},
 {id:'olive-luxe',name:'Olive Luxe',primary:'#0B0F0D',secondary:'#8CA98C',from:'#0B0F0D',to:'#3E5A3F',swatches:["#0B0F0D","#1F2A1F","#3E5A3F","#8CA98C","#D9C7A3","#B08D57"]},
 {id:'aurora-premium',name:'Aurora',primary:'#3B82F6',secondary:'#FBCFE8',from:'#3B82F6',to:'#A78BFA',swatches:["#3B82F6","#60A5FA","#A78BFA","#FBCFE8"]},
 {id:'sunset-premium',name:'Sunset',primary:'#EA6113',secondary:'#FFE3B3',from:'#EA6113',to:'#FBB931',swatches:["#EA6113","#F88F22","#FBB931","#FFE3B3"]},
 {id:'viola-premium',name:'Viola',primary:'#800B9C',secondary:'#FFE6CC',from:'#800B9C',to:'#FFC477',swatches:["#800B9C","#C64AAF","#FFC477","#FFE6CC"]},
 {id:'luigi-premium',name:'Luigi',primary:'#FFE3B3',secondary:'#30B155',from:'#FFE3B3',to:'#79CE67',swatches:["#FFE3B3","#C2DD6C","#79CE67","#30B155"]},
 {id:'midnight-premium',name:'Midnight',primary:'#06141B',secondary:'#4A5C6A',from:'#06141B',to:'#253745',swatches:["#06141B","#11212D","#253745","#4A5C6A","#9BA8AB","#CCD0CF"]},
 {id:'velvet-premium',name:'Velvet',primary:'#190019',secondary:'#854F6C',from:'#190019',to:'#522B5B',swatches:["#190019","#2B124C","#522B5B","#854F6C","#DFB6B2","#FBE4D8"]},
 {id:'ocean-blue-premium',name:'Ocean Blue',primary:'#021024',secondary:'#5483B3',from:'#021024',to:'#16498A',swatches:["#021024","#052659","#16498A","#5483B3","#7DA0CA","#C1E8FF"]},
 {id:'pastel-breeze',name:'Pastel Breeze',primary:'#F7CBCA',secondary:'#D5E5E5',from:'#F7CBCA',to:'#F1F7F7',swatches:["#F7CBCA","#DDD3D3","#F1F7F7","#D5E5E5","#B0D7D8","#5D6B6B"]},
] as const

export const kioskRecipes:Array<{id:string;name:string;es:string;en:string;appearance:KioskAppearance}>=[
 {id:'original',name:'Classic',es:'La apariencia original, con tus colores.',en:'Original appearance with your colors.',appearance:kioskAppearance()},
 {id:'studio',name:'Studio Matte',es:'Servicios en lista y superficies mate.',en:'Service list and matte surfaces.',appearance:kioskAppearance({skinId:'barber-luxury',primary:'#20242a',secondary:'#dbe0e7',layout:'list',finish:'matte',cards:'square',welcome:'banner'})},
 {id:'bistro',name:'Bistro Gloss',es:'Menú fotográfico y brillo en los controles.',en:'Photographic menu and glossy controls.',appearance:kioskAppearance({skinId:'restaurant-touch',primary:'#482b22',secondary:'#e4b391',layout:'gallery',finish:'gloss',welcome:'hero'})},
 {id:'aurora',name:'Aurora Glass',es:'Degradado y paneles de cristal.',en:'Gradient and glass panels.',appearance:kioskAppearance({skinId:'glass-premium',primary:'#102038',secondary:'#b4d0ed',colorMode:'gradient',gradientFrom:'#102038',gradientTo:'#385a83',finish:'glass',welcome:'hero'})},
 {id:'boutique',name:'Boutique Copper',es:'Catálogo compacto y acabado metálico.',en:'Compact catalog and metallic finish.',appearance:kioskAppearance({skinId:'retail-minimal',primary:'#482b22',secondary:'#e4b391',layout:'compact',finish:'metallic',buttons:'square'})},
 {id:'garden',name:'Garden Waves',es:'Patrón suave y espacio entre elementos.',en:'Soft pattern and spacious elements.',appearance:kioskAppearance({primary:'#143d30',secondary:'#b2dbc0',colorMode:'pattern',pattern:'waves',finish:'matte',density:'spacious',welcome:'banner'})},
]
