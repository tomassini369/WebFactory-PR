// Canonical design-token catalogue shared by dashboard, POS and kiosk.
// Palette IDs and original colors remain stable; all entries have six swatches.
export const colorPalettes=Object.freeze([
 {id:'navy',name:'Navy',primary:'#102038',secondary:'#78a7e4',from:'#102038',to:'#385a83',swatches:['#102038','#1B3351','#385A83','#5C82B2','#78A7E4','#DDE9F9']},
 {id:'sand',name:'Sand',primary:'#c8b99e',secondary:'#785832',from:'#c8b99e',to:'#7a624b',swatches:['#5C442E','#785832','#7A624B','#AB9472','#C8B99E','#EEE2CE']},
 {id:'forest',name:'Forest',primary:'#143d30',secondary:'#b2dbc0',from:'#143d30',to:'#40826b',swatches:['#143D30','#24533F','#40826B','#6AA58E','#B2DBC0','#E6F4E9']},
 {id:'berry',name:'Berry',primary:'#4b193b',secondary:'#efb7d0',from:'#4b193b',to:'#885272',swatches:['#4B193B','#67294D','#885272','#B8799D','#EFB7D0','#F8E0EA']},
 {id:'copper',name:'Copper',primary:'#482b22',secondary:'#e4b391',from:'#482b22',to:'#b57a50',swatches:['#482B22','#613C2E','#82533E','#B57A50','#E4B391','#F4DCC5']},
 {id:'mono',name:'Mono',primary:'#20242a',secondary:'#dbe0e7',from:'#20242a',to:'#677482',swatches:['#20242A','#323C47','#4C5B67','#677482','#AAB6C4','#DBE0E7']},
 {id:'mocha-earth',name:'Mocha Earth',primary:'#1A120E',secondary:'#A88462',from:'#1A120E',to:'#6B4A2E',swatches:['#1A120E','#3A2418','#6B4A2E','#A88462','#D5C4AE','#4A4A46']},
 {id:'purple-haze',name:'Purple Haze',primary:'#0E0B1D',secondary:'#8B7CC7',from:'#0E0B1D',to:'#5A3B8C',swatches:['#0E0B1D','#2A1E4D','#5A3B8C','#8B7CC7','#C9C2E3','#3A3A52']},
 {id:'forest-glow',name:'Forest Glow',primary:'#0F1F17',secondary:'#6B7F67',from:'#0F1F17',to:'#3E5A3F',swatches:['#0F1F17','#1E3A2E','#3E5A3F','#6B7F67','#C7CBB8','#3D4337']},
 {id:'arctic-blue',name:'Arctic Blue',primary:'#0B132B',secondary:'#5BC0DE',from:'#0B132B',to:'#3A506B',swatches:['#0B132B','#1C2541','#3A506B','#5BC0DE','#F4D6B0','#D97706']},
 {id:'neon-pop',name:'Neon Pop',primary:'#121212',secondary:'#64748B',from:'#121212',to:'#334155',swatches:['#121212','#1F2937','#334155','#64748B','#F1F5F9','#EC4899']},
 {id:'ocean-teal',name:'Ocean Teal',primary:'#0A0F14',secondary:'#7FB3B8',from:'#0A0F14',to:'#2E6F73',swatches:['#0A0F14','#0F3D3E','#2E6F73','#7FB3B8','#EADCC8','#C6601F']},
 {id:'rose-blush',name:'Rose Blush',primary:'#1A0F2E',secondary:'#D6598F',from:'#1A0F2E',to:'#7A2E6F',swatches:['#1A0F2E','#3B1B4F','#7A2E6F','#D6598F','#F4D7D4','#FF6B6B']},
 {id:'sunset-fusion',name:'Sunset Fusion',primary:'#1A1A1F',secondary:'#A678B9',from:'#1A1A1F',to:'#6A5ACD',swatches:['#1A1A1F','#2D2B55','#6A5ACD','#A678B9','#F0D9B5','#F4A62A']},
 {id:'olive-luxe',name:'Olive Luxe',primary:'#0B0F0D',secondary:'#8CA98C',from:'#0B0F0D',to:'#3E5A3F',swatches:['#0B0F0D','#1F2A1F','#3E5A3F','#8CA98C','#D9C7A3','#B08D57']},
 {id:'aurora-premium',name:'Aurora',primary:'#3B82F6',secondary:'#FBCFE8',from:'#3B82F6',to:'#A78BFA',swatches:['#3B82F6','#60A5FA','#818CF8','#A78BFA','#D8B4FE','#FBCFE8']},
 {id:'sunset-premium',name:'Sunset',primary:'#EA6113',secondary:'#FFE3B3',from:'#EA6113',to:'#FBB931',swatches:['#EA6113','#F88F22','#FBB931','#FFC96B','#FFDDA5','#FFE3B3']},
 {id:'viola-premium',name:'Viola',primary:'#800B9C',secondary:'#FFE6CC',from:'#800B9C',to:'#FFC477',swatches:['#800B9C','#A630A4','#C64AAF','#E9A5B8','#FFC477','#FFE6CC']},
 {id:'luigi-premium',name:'Luigi',primary:'#FFE3B3',secondary:'#30B155',from:'#FFE3B3',to:'#79CE67',swatches:['#FFE3B3','#DCEAA2','#C2DD6C','#9EDB6C','#79CE67','#30B155']},
 {id:'midnight-premium',name:'Midnight',primary:'#06141B',secondary:'#4A5C6A',from:'#06141B',to:'#253745',swatches:['#06141B','#11212D','#253745','#4A5C6A','#9BA8AB','#CCD0CF']},
 {id:'velvet-premium',name:'Velvet',primary:'#190019',secondary:'#854F6C',from:'#190019',to:'#522B5B',swatches:['#190019','#2B124C','#522B5B','#854F6C','#DFB6B2','#FBE4D8']},
 {id:'ocean-blue-premium',name:'Ocean Blue',primary:'#021024',secondary:'#5483B3',from:'#021024',to:'#16498A',swatches:['#021024','#052659','#16498A','#5483B3','#7DA0CA','#C1E8FF']},
 {id:'pastel-breeze',name:'Pastel Breeze',primary:'#F7CBCA',secondary:'#D5E5E5',from:'#F7CBCA',to:'#F1F7F7',swatches:['#F7CBCA','#DDD3D3','#F1F7F7','#D5E5E5','#B0D7D8','#5D6B6B']},
].map(item=>Object.freeze({...item,swatches:Object.freeze(item.swatches)})))

export const findColorPalette=id=>colorPalettes.find(p=>p.id===id)
