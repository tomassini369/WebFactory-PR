import type {TemplateItem} from './templateData'
import type {TemplateLanguage,TemplateUi} from './templateI18n'
const money=(value:number,lang:TemplateLanguage)=>new Intl.NumberFormat(lang==='es'?'es-US':'en-US',{style:'currency',currency:'USD'}).format(value)

export default function CatalogCard({
  item,
  accent,
  onView,
  onAdd,
  onBook,
  language,
  ui,
  bookEnabled=true,cartEnabled=true,disabled=false,
}: {
  item: TemplateItem
  accent: string
  onView: () => void
  onAdd: () => void
  onBook: () => void
  language: TemplateLanguage
  ui: TemplateUi
  bookEnabled?:boolean;cartEnabled?:boolean;disabled?:boolean
}) {
  const price = item.displayPrice ?? money(item.price, language)
  const typeLabel = { product: ui.product, service: ui.serviceType, listing: ui.listing, class: ui.classType }[item.type]
  return (
    <article className="template-catalog-card">
      <button className="template-card-image" onClick={onView} aria-label={`${ui.view} ${item.name}`}>
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span>{typeLabel}</span>}
        {item.badge && <span style={{ background: accent }}>{item.badge}</span>}
      </button>
      <div className="template-card-copy">
        <div>
          <small>{typeLabel}</small>
          <h3>{item.name}</h3>
        </div>
        <strong>{price}</strong>
        <p>{item.description}</p>
        <div className="template-card-actions">
          <button className="template-outline" onClick={onView}>{ui.view}</button>
          {item.appointment && bookEnabled ? (
            <button className="template-solid" disabled={disabled} onClick={onBook}>{ui.reserve}</button>
          ) : !item.appointment && item.purchasable !== false && cartEnabled ? (
            <button className="template-solid" disabled={disabled} onClick={onAdd}>{ui.add}</button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
