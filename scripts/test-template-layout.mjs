import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const server = await createServer({server:{middlewareMode:true}, appType:'custom'})
try {
  const {default: Storefront} = await server.ssrLoadModule('/src/ClientStorefront.tsx')
  const {default: Layout} = await server.ssrLoadModule('/src/TemplateLayout.tsx')
  const {default: CatalogCard} = await server.ssrLoadModule('/src/TemplateCatalogCard.tsx')
  const {templateConfigs} = await server.ssrLoadModule('/src/templateData.ts')
  const {templateUi} = await server.ssrLoadModule('/src/templateI18n.ts')
  let checked=0
  for(const config of templateConfigs) for(const lang of ['en','es']) {
    const site={siteId:'preview',slug:'example',business:{name:'Client business',description:'Client content',category:config.category,phone:'787-555-0100',heroUrl:'',galleryUrls:[]},design:{templateSlug:config.slug,primary:'#123456',secondary:'#abcdef'},features:{products:true,services:true,bookings:true,cart:true},catalog:[{id:'real-service',type:'service',name:'Real client service',description:'Actual service',price:25,inventory:null,requiresAppointment:true,duration:30,imageUrl:''}],employees:[],hours:{},paymentRules:{},settings:{}}
    const live=renderToStaticMarkup(React.createElement(Storefront,{slug:'example',previewSite:site,previewLanguage:lang}))
    const demo=renderToStaticMarkup(React.createElement(Layout,{config,ui:templateUi[lang],language:lang,setLanguage(){},startBooking(){},setCartOpen(){},setCatalogOpen(){},cart:[],showcaseFeatures:config.features}))
    for(const className of ['template-header','template-hero','template-hero-content','template-hero-meta','template-feature-strip','template-catalog-gateway','template-story','template-story-images','template-gallery','template-booking-showcase','template-contact','template-footer']) {
      assert.ok(live.includes(`class="${className}`),`${config.slug}/${lang}: live ${className}`)
      assert.ok(demo.includes(`class="${className}`),`${config.slug}/${lang}: demo ${className}`)
    }
    assert.ok(live.includes('--template-dark:#123456'))
    assert.ok(live.includes('--template-accent:#abcdef'))
    assert.ok(live.includes('Client business') && live.includes('Client content'))
    assert.ok(live.includes(config.heroImage))
    assert.ok(!live.includes('demo-'))
    assert.ok(!live.includes('id="team"'), 'Never invent demo employees for a client')
    assert.ok(!live.includes('template-mode'), 'No demo functionality in production')
    const off=renderToStaticMarkup(React.createElement(Storefront,{slug:'example',previewSite:{...site,features:{products:false,services:false,bookings:false,cart:false},business:{...site.business,heroUrl:'/custom-hero.jpg',galleryUrls:['/custom-gallery.jpg']}},previewLanguage:lang}))
    assert.ok(!off.includes('id="services"'))
    assert.ok(!off.includes('template-cart-button'))
    assert.ok(!off.includes('template-booking-showcase'))
    assert.ok(off.includes('/custom-hero.jpg') && off.includes('/custom-gallery.jpg'))
    assert.ok(!off.includes(config.heroImage), 'Uploaded content overrides sample media')
    const styled=renderToStaticMarkup(React.createElement(Storefront,{slug:'example',previewSite:{...site,design:{...site.design,style:'Luxury'}},previewLanguage:lang}))
    assert.ok(styled.includes('visual-luxury'), 'Saved style preference is honored consistently in Builder and live renderer')
    const card=renderToStaticMarkup(React.createElement(CatalogCard,{item:config.items[0],accent:config.accent,language:lang,ui:templateUi[lang],onView(){},onAdd(){},onBook(){},bookEnabled:false,cartEnabled:false,disabled:true}))
    assert.ok(card.includes('template-catalog-card') && card.includes('template-card-copy'))
    assert.ok(!card.includes('template-solid'), 'Disabled commerce/booking never renders an action button')
    checked++
  }
  const canonical={siteId:'custom-preview',slug:'custom',business:{name:'Custom business',description:'Own content',category:'Barber',heroUrl:'/own-hero.jpg',galleryUrls:['/own-1.jpg','/own-2.jpg']},design:{templateSlug:'northline-barber',style:'Modern',primary:'#123456',secondary:'#abcdef'},features:{services:true,products:false,bookings:false,cart:false},catalog:[],employees:[],hours:{},paymentRules:{},settings:{}}
  const main=html=>html.match(/<main[^>]*>[\s\S]*?<\/main>/)[0]
  const expected=main(renderToStaticMarkup(React.createElement(Storefront,{slug:'custom',previewSite:canonical})))
  for(const legacyLayout of ['split','centered','editorial','showcase']) {
    const custom=renderToStaticMarkup(React.createElement(Storefront,{slug:'custom',previewSite:{...canonical,design:{...canonical.design,templateSlug:'',customLayout:legacyLayout,sectionOrder:['contact','gallery','about','team','catalog']}}}))
    assert.equal(main(custom),expected, `Custom with legacy ${legacyLayout} must use identical product layout and section order`)
    assert.ok(!custom.includes('custom-layout-') && !custom.includes('cs-custom-main'))
  }
  console.log(`Template layout regression: ${checked} template/language combinations passed; custom colors, content, media, feature gates and missing team verified. Custom parity verified against all four legacy layouts.`)
} finally { await server.close() }
