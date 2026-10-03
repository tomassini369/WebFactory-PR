import {emailBrand, renderTextEmail} from './email-design.mjs';
export function renderContactEmail(site,{name,email,phone,message,language}) {
  const lang=language || site.settings?.locale || 'en',es=lang==='es',brand=emailBrand(site,lang);
  const subject=`${es?'Mensaje del sitio':'Website contact'} — ${brand.name}`;
  const text=[`${es?'Negocio':'Business'}: ${brand.name}`,`${es?'Nombre':'Name'}: ${name}`,`Email: ${email}`,`${es?'Teléfono':'Phone'}: ${phone || ''}`,'',message].join('\n');
  return renderTextEmail({site,language:lang,subject,text});
}
