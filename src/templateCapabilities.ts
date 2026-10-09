import type {TemplateConfig} from './templateData'

/** Commerce defaults for a new business. Sample catalog/team data is never copied. */
export function templateCapabilities(template:TemplateConfig){
 return {
  products:template.items.some(item=>item.type==='product'),
  services:template.items.some(item=>item.type!=='product'),
  cart:template.cartEnabled,
  bookings:template.bookingEnabled,
  calendar:template.bookingEnabled,
 }
}
export function usesTemplateCapabilities(features:Record<string,boolean>,expected:Record<string,boolean>){
 return Object.entries(expected).every(([key,value])=>features[key]===value)
}
