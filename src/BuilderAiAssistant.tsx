import { useState, type Dispatch, type SetStateAction } from 'react'
import { demoConfigs } from './demoData'

type Language='es'|'en'
type ItemType='product'|'service'
type Proposal={
  summaryEn:string
  summaryEs:string
  business:{nameEn:string;nameEs:string;descriptionEn:string;descriptionEs:string;category:string}
  design:{templateSlug:string;customLayout:'split'|'centered'|'editorial'|'showcase';style:'Modern'|'Luxury'|'Minimal'|'Bold';primary:string;secondary:string;sectionOrder:string[]}
  features:Record<string,boolean>
  catalog:Array<{type:ItemType;nameEn:string;nameEs:string;descriptionEn:string;descriptionEs:string;price:number;requiresAppointment:boolean;duration:number}>
  team:Array<{name:string;roleEn:string;roleEs:string;serviceIndexes:number[]}>
}

const categories=[...new Set([...demoConfigs.map((demo)=>demo.category),'Other'])]
const createId=(prefix:string)=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`

export default function BuilderAiAssistant({state,setState,lang}:{state:any;setState:Dispatch<SetStateAction<any>>;lang:Language}){
  const [open,setOpen]=useState(false)
  const [prompt,setPrompt]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [proposal,setProposal]=useState<Proposal|null>(null)

  const generate=async()=>{
    if(prompt.trim().length<10){setError(lang==='es'?'Describe tu negocio o los cambios que deseas.':'Describe your business or the changes you want.');return}
    setBusy(true);setError('');setProposal(null)
    try{
      const response=await fetch('/api/builder-ai',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prompt:prompt.trim(),
          current:{
            business:{
              name:state.business.name,nameEn:state.business.nameEn,nameEs:state.business.nameEs,
              category:state.business.category,description:state.business.description,
              descriptionEn:state.business.descriptionEn,descriptionEs:state.business.descriptionEs,
            },
            design:state.design,
            features:state.features,
            catalog:state.catalog.map((item:any)=>({
              type:item.type,name:item.name,nameEn:item.nameEn,nameEs:item.nameEs,
              description:item.description,descriptionEn:item.descriptionEn,descriptionEs:item.descriptionEs,
              price:item.price,requiresAppointment:item.requiresAppointment,duration:item.duration,
            })),
            team:state.team.map((member:any)=>({
              name:member.name,role:member.role,roleEn:member.roleEn,roleEs:member.roleEs,
            })),
          },
        }),
      })
      const result=await response.json()
      if(!response.ok||!result.ok)throw new Error(result.message||'Forge AI could not generate a proposal.')
      setProposal(result.proposal)
    }catch(e){
      setError(e instanceof Error?e.message:(lang==='es'?'Forge AI no pudo completar la solicitud.':'Forge AI could not complete the request.'))
    }finally{setBusy(false)}
  }

  const apply=()=>{
    if(!proposal)return
    const generatedCatalog=proposal.catalog.map((item)=>({
      id:createId(item.type),type:item.type,name:item.nameEn||item.nameEs,nameEn:item.nameEn,nameEs:item.nameEs,
      price:item.price,description:item.descriptionEn||item.descriptionEs,descriptionEn:item.descriptionEn,
      descriptionEs:item.descriptionEs,requiresAppointment:item.type==='service'&&item.requiresAppointment,
      duration:item.type==='service'?item.duration:0,
    }))
    const generatedTeam=proposal.team.map((member)=>({
      id:createId('employee'),name:member.name,role:member.roleEn||member.roleEs,roleEn:member.roleEn,roleEs:member.roleEs,
      serviceIds:member.serviceIndexes.map((index)=>generatedCatalog[index]?.id).filter(Boolean),
    }))
    const template=demoConfigs.find((entry)=>entry.slug===proposal.design.templateSlug)
    setState((current:any)=>({
      ...current,
      business:{
        ...current.business,
        name:proposal.business.nameEn||current.business.name,
        nameEn:proposal.business.nameEn||current.business.nameEn,
        nameEs:proposal.business.nameEs||current.business.nameEs,
        description:proposal.business.descriptionEn||current.business.description,
        descriptionEn:proposal.business.descriptionEn||current.business.descriptionEn,
        descriptionEs:proposal.business.descriptionEs||current.business.descriptionEs,
        category:categories.includes(proposal.business.category)?proposal.business.category:current.business.category,
      },
      design:{
        ...current.design,
        templateSlug:template?.slug||'',
        customLayout:proposal.design.customLayout,
        style:proposal.design.style,
        primary:proposal.design.primary,
        secondary:proposal.design.secondary,
        sectionOrder:proposal.design.sectionOrder.length?proposal.design.sectionOrder:current.design.sectionOrder,
      },
      features:{...current.features,...proposal.features},
      catalog:generatedCatalog.length?generatedCatalog:current.catalog,
      team:generatedTeam.length?generatedTeam:current.team,
    }))
    setProposal(null);setOpen(false)
  }

  return <section className={'wf-ai-assistant '+(open?'open':'')}>
    <button className="wf-ai-toggle" type="button" onClick={()=>setOpen(value=>!value)}>
      <span>✦</span><div><small>FORGE AI · BY WEBFACTORY</small><strong>{lang==='es'?'Crea con Forge AI':'Build with Forge AI'}</strong></div><b>{open?'−':'+'}</b>
    </button>
    {open&&<div className="wf-ai-body">
      <p>{lang==='es'?'Describe el negocio o el cambio que quieres. La IA solo modifica la configuración dentro de WebFactory; nunca crea otro proyecto o deployment.':'Describe the business or change you want. AI only modifies configuration inside WebFactory; it never creates another project or deployment.'}</p>
      <textarea rows={5} maxLength={1400} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={lang==='es'?'Ejemplo: Tengo un salón de belleza en Puerto Rico. Quiero un website moderno con servicios de color, keratina, uñas y booking por especialista.':'Example: I own a beauty salon in Puerto Rico. I want a modern website with color, keratin, nails and specialist booking.'}/>
      <div className="wf-ai-actions"><span>{prompt.length}/1400</span><button type="button" disabled={busy} onClick={generate}>{busy?(lang==='es'?'Forge AI está creando…':'Forge AI is creating…'):(lang==='es'?'Generar propuesta':'Generate proposal')} ✦</button></div>
      {error&&<div className="wf-ai-error">{error}</div>}
      {proposal&&<div className="wf-ai-proposal">
        <small>{lang==='es'?'PROPUESTA DE FORGE AI':'FORGE AI PROPOSAL'}</small>
        <strong>{lang==='es'?(proposal.summaryEs||proposal.summaryEn):(proposal.summaryEn||proposal.summaryEs)}</strong>
        <div>
          <span>{proposal.design.templateSlug?'Template · '+(demoConfigs.find(x=>x.slug===proposal.design.templateSlug)?.name||proposal.design.templateSlug):'Custom'}</span>
          <span>{proposal.catalog.length} {lang==='es'?'artículos':'items'}</span>
          <span>{proposal.team.length} {lang==='es'?'miembros de equipo':'team members'}</span>
        </div>
        <p>{lang==='es'?'Tus datos de contacto, pagos, credenciales, horarios e integraciones no serán reemplazados por la IA.':'Your contact data, payments, credentials, hours and integrations will not be replaced by AI.'}</p>
        <nav><button type="button" className="secondary" onClick={()=>setProposal(null)}>{lang==='es'?'Descartar':'Discard'}</button><button type="button" onClick={apply}>{lang==='es'?'Aplicar al Builder':'Apply to Builder'} →</button></nav>
      </div>}
    </div>}
  </section>
}
