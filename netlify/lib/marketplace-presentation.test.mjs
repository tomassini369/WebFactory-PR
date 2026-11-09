import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {marketplaceQuery,normalizeMarketplaceFilters,readMarketplaceFilters} from '../../src/marketplace-model.ts'

test('Marketplace filters survive a shared URL with accents and literal user text',()=>{
 const filters={q:'café & corte <local>',municipio:'Añasco',categoria:'barberias'}
 const url=marketplaceQuery(filters)
 assert(!url.includes('<local>'));assert.deepEqual(readMarketplaceFilters(url),filters)
})
test('unknown municipalities and categories cannot become active filters',()=>{
 assert.deepEqual(readMarketplaceFilters('?municipio=not-a-town&categoria=admin&siteId=private-business'),{q:'',municipio:'',categoria:''})
 assert.deepEqual(normalizeMarketplaceFilters({q:'  café   local  ',municipio:'San Juan',categoria:'comida'}),{q:'café local',municipio:'San Juan',categoria:'comida'})
})
test('oversized and repeated search parameters stay bounded and deterministic',()=>{
 assert.equal(readMarketplaceFilters('?q='+ 'x'.repeat(600)+'&q=second').q,'x'.repeat(120))
 assert.equal(marketplaceQuery({q:'   ',municipio:'',categoria:''}),'')
 assert.equal(readMarketplaceFilters('?q=%E0%A4%A').municipio,'')
})
test('both official WebFactory logo files retain their approved SHA-256 bytes',async()=>{
 const expected={'webfactory-pr-logo.png':'1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a','webfactory-pr-logo-dark.png':'2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b'}
 for(const [name,hash]of Object.entries(expected))assert.equal(createHash('sha256').update(await readFile(new URL('../../assets/'+name,import.meta.url))).digest('hex'),hash,name)
})

test('public metadata separates discovery from creating and never overrides tenant or private routes',async()=>{
 const {publicPageMetadata}=await import('../../src/public-page-metadata.ts')
 assert.equal(publicPageMetadata('/crear','es').url,'https://webfactorypr.com/crear')
 assert.match(publicPageMetadata('/crear/','en').description,/business website/)
 assert.match(publicPageMetadata('/','es').description,/negocios, servicios y productos publicados/)
 for(const path of ['/sites/business','/client-admin','/webfactory-admin','/pay/business/private','/track/private','/kiosk'])assert.equal(publicPageMetadata(path,'es'),null,path)
})
