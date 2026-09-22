import { useMemo, useState } from 'react'
import { demoConfigs, templateGroups } from './demoData'
import './templates.css'

type Language = 'es' | 'en'

export default function TemplatesPage({lang}:{lang:Language}) {
  const [groupId,setGroupId] = useState(templateGroups[0]?.id || '')
  const group = templateGroups.find((entry)=>entry.id===groupId)
  const templates = useMemo(
    ()=>demoConfigs.filter((demo)=>group?.categories.includes(demo.category)),
    [group]
  )

  return <main className="templates-page">
    <section className="templates-hero">
      <div className="shell">
        <p className="eyebrow">WEBFACTORY TEMPLATES</p>
        <h1>{lang==='es'?'Escoge una categoría. Luego encuentra tu estructura.':'Choose a category. Then find your structure.'}</h1>
        <p>{lang==='es'?'Cada template es una base editable. Conserva la composición y reemplaza marca, imágenes, contenido y funciones con los datos reales de tu negocio.':'Every template is an editable base. Keep the composition and replace branding, images, content and features with your real business information.'}</p>
      </div>
    </section>
    <section className="templates-library shell">
      <aside className="template-groups">
        <div>
          <small>{lang==='es'?'CATEGORÍAS':'CATEGORIES'}</small>
          <h2>{lang==='es'?'Explora por tipo de negocio':'Browse by business type'}</h2>
        </div>
        <div className="template-group-list">
          {templateGroups.map((entry)=>{
            const count=demoConfigs.filter((demo)=>entry.categories.includes(demo.category)).length
            return <button key={entry.id} className={entry.id===groupId?'active':''} onClick={()=>setGroupId(entry.id)}>
              <span>{lang==='es'?entry.nameEs:entry.nameEn}</span><b>{count}</b>
            </button>
          })}
        </div>
      </aside>
      <div className="template-results">
        <header>
          <div><small>{lang==='es'?'SELECCIÓN ACTUAL':'CURRENT SELECTION'}</small><h2>{group?(lang==='es'?group.nameEs:group.nameEn):''}</h2></div>
          <span>{templates.length} {lang==='es'?'templates':'templates'}</span>
        </header>
        <div className="template-card-grid">
          {templates.map((demo)=>(
            <article className="template-card" key={demo.slug}>
              <a className="template-card-art" href={'/templates/'+demo.slug} style={{backgroundImage:`linear-gradient(180deg,rgba(5,10,16,.05),rgba(5,10,16,.55)),url(${demo.heroImage})`}}>
                <span>{demo.category}</span>
              </a>
              <div>
                <small>{demo.category}</small>
                <h3>{demo.name}</h3>
                <p>{demo.description}</p>
                <div className="template-card-actions">
                  <a href={'/templates/'+demo.slug}>{lang==='es'?'Ver Template':'View Template'} ↗</a>
                  <a className="primary" href={'/builder?template='+demo.slug}>{lang==='es'?'Usar este Template':'Use this Template'} →</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  </main>
}
