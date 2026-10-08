import {useMemo} from 'react'
import ClientStorefront from './ClientStorefront'
import {templateBySlug} from './templateData'
import {templatePreviewData} from './template-preview-data'
import {templateUi} from './templateI18n'
export default function TemplateSite({slug}:{slug:string}){
 const config=templateBySlug(slug)
 const site=useMemo(()=>config?templatePreviewData(config):undefined,[config])
 const saved=typeof window!=='undefined'?window.localStorage.getItem('webfactory-template-language'):null
 const lang=saved==='es'?'es':'en';const ui=templateUi[lang]
 if(!site)return <main className="template-not-found"><h1>{ui.notFound}</h1><a href="/templates">{ui.returnWebFactory}</a></main>
 return <><div className="wf-template-notice"><a href="/templates">← WebFactory PR</a><span>{ui.templateNotice}</span><a href={`/builder?template=${slug}`}>{ui.createWebsite}</a></div><ClientStorefront slug={slug} previewSite={site} previewLanguage={lang}/><footer className="wf-template-notice"><a href={`/builder?template=${slug}`}>{ui.createWebsite}</a><a href="/templates">{ui.returnWebFactory}</a></footer></>
}
