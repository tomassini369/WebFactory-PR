// Shared public discovery filters. Private tenant records never reach the browser.
export const municipalities = ['Adjuntas','Aguada','Aguadilla','Aguas Buenas','Aibonito','Añasco','Arecibo','Arroyo','Barceloneta','Barranquitas','Bayamón','Cabo Rojo','Caguas','Camuy','Canóvanas','Carolina','Cataño','Cayey','Ceiba','Ciales','Cidra','Coamo','Comerío','Corozal','Culebra','Dorado','Fajardo','Florida','Guánica','Guayama','Guayanilla','Guaynabo','Gurabo','Hatillo','Hormigueros','Humacao','Isabela','Jayuya','Juana Díaz','Juncos','Lajas','Lares','Las Marías','Las Piedras','Loíza','Luquillo','Manatí','Maricao','Maunabo','Mayagüez','Moca','Morovis','Naguabo','Naranjito','Orocovis','Patillas','Peñuelas','Ponce','Quebradillas','Rincón','Río Grande','Sabana Grande','Salinas','San Germán','San Juan','San Lorenzo','San Sebastián','Santa Isabel','Toa Alta','Toa Baja','Trujillo Alto','Utuado','Vega Alta','Vega Baja','Vieques','Villalba','Yabucoa','Yauco'] as const
export const marketplaceCategories = [
 {id:'barberias',es:'Barberías',en:'Barbershops'},
 {id:'belleza',es:'Salones y belleza',en:'Salons & beauty'},
 {id:'comida',es:'Comida y café',en:'Food & coffee'},
 {id:'tiendas',es:'Tiendas',en:'Shops'},
 {id:'bienestar',es:'Salud y bienestar',en:'Health & wellness'},
 {id:'servicios',es:'Servicios',en:'Services'},
 {id:'talleres',es:'Talleres',en:'Auto care'},
 {id:'mascotas',es:'Mascotas',en:'Pet care'},
] as const
export type MarketplaceFilters = {q:string;municipio:string;categoria:string}
export const emptyMarketplaceFilters:MarketplaceFilters = {q:'',municipio:'',categoria:''}
export function normalizeMarketplaceFilters(value:Partial<MarketplaceFilters>):MarketplaceFilters {
 return {
  q:typeof value.q==='string'?value.q.trim().replace(/\s+/g,' ').slice(0,120):'',
  municipio:municipalities.some(item=>item===value.municipio)?value.municipio!:'',
  categoria:marketplaceCategories.some(item=>item.id===value.categoria)?value.categoria!:'',
 }
}
export function readMarketplaceFilters(search:string):MarketplaceFilters {
 const query=new URLSearchParams(search)
 return normalizeMarketplaceFilters({q:query.get('q')||'',municipio:query.get('municipio')||'',categoria:query.get('categoria')||''})
}
export function marketplaceQuery(filters:MarketplaceFilters):string {
 const normalized=normalizeMarketplaceFilters(filters),query=new URLSearchParams()
 for(const key of ['q','municipio','categoria'] as const)if(normalized[key])query.set(key,normalized[key])
 return query.size?'?'+query.toString():''
}
