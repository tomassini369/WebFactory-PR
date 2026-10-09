import {readFileSync,writeFileSync} from 'node:fs'
import postcss from 'postcss'
const login='html body #root :is(.ca-login,.wfa-login)'
const dashboard='html body #root :is(.ca-dashboard,.wfa-dashboard.wfa-premium)'
const fields={'.glass-card::before':login+'::before','.form2-pill-input':login+' input:not([type=checkbox])','.form2-pill-input:focus':login+' input:not([type=checkbox]):focus','.form2-submit-btn:hover':login+' form>button:hover:not(:disabled)','.form2-submit-btn:active':login+' form>button:active:not(:disabled)','.btn-shine':login+' .btn-shine','.submit-btn:hover .btn-shine':login+' form>button:hover .btn-shine','.input-line':login+' .input-line','.input-group.focused .input-line':login+' label:focus-within>.input-line','.input-group input:focus ~ .input-line':login+' label:focus-within>.input-line',
 '.gd-glass-console::before':dashboard+' :is(.ca-sidebar,.wfa-sidebar)::before','.gd-corner-chip':dashboard+' .gd-corner-chip','.gd-chip-tl':dashboard+' .gd-chip-tl','.gd-chip-tr':dashboard+' .gd-chip-tr','.gd-chip-bl':dashboard+' .gd-chip-bl','.gd-chip-br':dashboard+' .gd-chip-br',
 '.gd-dock-icon-item':dashboard+' :is(.ca-sidebar,.wfa-sidebar) nav button','.gd-dock-icon-item:hover':dashboard+' :is(.ca-sidebar,.wfa-sidebar) nav button:hover','.gd-dock-icon-item.active':dashboard+' :is(.ca-sidebar,.wfa-sidebar) nav button.active','.gd-quick-card:hover':dashboard+' .bcc-action-grid button:hover','.gd-primary-btn:hover':dashboard+' :is(.ca-primary,.wfa-primary):hover:not(:disabled)','.gd-export-btn:hover':dashboard+' :is(.wf-panel-tools button,.wfa-top button):hover:not(:disabled)'}
const shape=new Set(['content','position','inset','top','left','right','bottom','width','height','padding','border-radius','pointer-events','z-index','border-right','border-bottom','border-top','border-left','border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius'])
const effects=new Set(['background','background-color','border','border-color','box-shadow','filter','transform','transition','backdrop-filter','-webkit-backdrop-filter','-webkit-mask','-webkit-mask-composite','mask-composite','opacity'])
fields['.form2-glass-card']=login
fields['.gd-card']=dashboard+' :is(.ca-panel,.wfa-card,.wfa-stat,.bcc-card,.bcc-metrics article,.bcc-action-grid button)'
fields['.gd-glass-console']=dashboard+' :is(.ca-sidebar,.wfa-sidebar)'
const result=postcss.root()
result.append(postcss.rule({selector:'.wf-original-console-details'}).append({prop:'background',value:'none',important:true},{prop:'padding',value:'0',important:true}))
for(const file of ['form1.css','form2.css','glassydashbord.css'])postcss.parse(readFileSync('docs/design/original-sources/'+file,'utf8')).walkRules(rule=>{
 const selectors=rule.selectors.filter(s=>fields[s]);if(!selectors.length)return
 const clone=postcss.rule({selector:[...new Set(selectors.map(s=>fields[s]))].join(',')})
 const decorative=selectors.some(s=>s.includes('::before')||s.includes('chip')||s.includes('shine')||s.includes('input-line'))
 rule.walkDecls(decl=>{if(!effects.has(decl.prop)&&!(decorative&&shape.has(decl.prop)))return
  let value=decl.value.replace(/#[0-9a-f]{3,8}\b/ig,color=>/^(#fff|#ffffff|#000|#000000)$/i.test(color)?color:'var(--pg-accent)')
  value=value.replace(/rgba\((?:236,\s*72,\s*153|107,\s*33,\s*168|168,\s*85,\s*247|255,\s*214,\s*0|99,\s*102,\s*241|6,\s*182,\s*212),\s*([\d.]+)\)/g,(_,opacity)=>`color-mix(in srgb,var(--pg-accent) ${Number(opacity)*100}%,transparent)`)
  if(value.includes('var(--gd-')){value=value.replaceAll('var(--gd-gold-glow)','color-mix(in srgb,var(--pg-accent) 45%,transparent)').replaceAll('var(--gd-gold)','var(--pg-accent)')}
  value=value.replaceAll('var(--gd-glass-border)','var(--pg-line)').replaceAll('var(--gd-shadow-card)','0 8px 24px -4px #0003,0 4px 10px -2px #0002').replaceAll('var(--gd-shadow-console)','0 30px 70px #0004,0 12px 30px #0002')
  // Reference's form2 input surface and login gradients must keep the approved platform tones.
  if((decl.prop==='background'||decl.prop==='background-color')&&!decorative)return
  clone.append({prop:decl.prop,value,important:decl.prop==='box-shadow'||decl.prop==='border-color'})
 });if(clone.nodes.length)result.append(clone)
})
writeFileSync('src/glassy-original-effects.css','/* Derived declarations from original source; selectors bind to production controls. */\n'+result.toString()+`\n${login}{position:relative;isolation:isolate}${login}::before{border-radius:inherit;z-index:0}${login} form>label:not(.portal-remember){position:relative}${login} .input-line{bottom:-2px;left:0;height:2px}${login} form>button{position:relative;overflow:hidden}${login} form>button .btn-shine{pointer-events:none}${dashboard}{--gd-transition-smooth:all .25s cubic-bezier(.16,1,.3,1);--gd-transition-fast:all .15s ease}${dashboard} :is(.ca-sidebar,.wfa-sidebar){position:relative}${dashboard} :is(.ca-sidebar,.wfa-sidebar) nav button{transform-origin:left center}${dashboard} :is(.ca-sidebar,.wfa-sidebar) nav button:hover{transform:translateY(-3px) scale(1.025)}.wf-original-console-details{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit}.wf-original-console-details .gd-dock-curve-svg{position:absolute;right:0;top:0;width:10px;height:100%;opacity:.3;pointer-events:none}${dashboard} .gd-corner-chip{border-color:color-mix(in srgb,var(--pg-accent) 35%,transparent)}\n@media(prefers-reduced-motion:reduce){${login} *,${dashboard} nav button,${dashboard} .bcc-action-grid button{transition:none!important;transform:none!important}}\n`)
