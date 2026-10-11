import type {PosCapabilities} from '../netlify/lib/pos-capabilities.mjs'
export function posProfileCopy(capabilities:PosCapabilities, lang:'es'|'en') {
 const es=lang==='es',choose=(a:string,b:string)=>es?a:b
 const names={restaurant:choose('Restaurante','Restaurant'),barber:choose('Barbería','Barbershop'),salon:choose('Salón de belleza','Beauty salon'),retail:choose('Tienda','Retail'),workshop:choose('Taller','Workshop'),general:choose('Productos y servicios','Products and services')}
 return {name:names[capabilities.profile],catalog:capabilities.profile==='restaurant'?choose('Menú','Menu'):capabilities.serviceFirst?choose('Servicios y productos','Services and products'):choose('Catálogo','Catalog'),
  products:capabilities.profile==='workshop'?choose('Piezas y productos','Parts and products'):choose('Productos','Products'),
  services:choose('Servicios','Services'), search:capabilities.profile==='restaurant'?choose('Buscar en el menú…','Search the menu…'):capabilities.profile==='workshop'?choose('Buscar servicios o piezas…','Search services or parts…'):choose('Buscar productos o servicios…','Search products or services…'),
  hint:capabilities.profile==='restaurant'?choose('Menú y órdenes del negocio. Consulta el estado de cada orden en el historial.','Business menu and orders. Review each order status in History.'):
   capabilities.profile==='barber'||capabilities.profile==='salon'?choose('Servicios y productos del negocio. Las citas y profesionales se administran en las secciones existentes.','Business services and products. Appointments and professionals use the existing sections.'):
   capabilities.profile==='workshop'?choose('Servicios y piezas del catálogo. Consulta las órdenes y los recibos desde el historial existente.','Catalog services and parts. Review orders and receipts in the existing history.'):
   choose('Catálogo, inventario y pagos del negocio.','Business catalog, stock and payments.')}
}
