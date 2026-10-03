import { emailBrand, emailButton, emailParagraph, renderEmailLayout, renderTextEmail } from './email-design.mjs';
import { publicBaseUrl } from './platform-utils.mjs';

export function renderInvitationEmail({kind = 'trial', builderUrl, language = 'en'}) {
  const es=language==='es',trial=kind==='trial',brand=emailBrand();
  const title=trial?(es?'Tu invitación a probar WebFactory por 7 días':'Your WebFactory 7-day trial invitation'):(es?'Tu acceso de cortesía a WebFactory':'Your complimentary WebFactory access');
  const intro=trial?(es?'Te invitamos a crear tu página y comenzar una prueba gratuita de WebFactory por 7 días.':'You have been invited to build your website and start a free 7-day WebFactory trial.'):(es?'Te invitamos a crear tu página de WebFactory con acceso de cortesía.':'You have been invited to create a WebFactory website with complimentary access.');
  const label=es?'Abrir mi Builder privado':'Open my private Builder';
  const details=trial?(es?'No necesitas tarjeta. La prueba comienza cuando la actives en tu portal después de configurar el negocio.':'No card is required. Your trial starts when you activate it from your client portal after setup.') : '';
  const expiration=es?'Esta invitación vence en 30 días.':'This invitation expires in 30 days.';
  return {subject:title,text:[intro,`${label}: ${builderUrl}`,details,expiration].filter(Boolean).join('\n\n'),html:renderEmailLayout({brand,language,title,bodyHtml:emailParagraph(intro)+emailButton(brand,builderUrl,label)+(details?emailParagraph(details):'')+emailParagraph(expiration)})};
}

export function renderSecurityResetEmail({requestId, at}) {
  const subject='WebFactory PR: Authenticator restablecido / Authenticator reset';
  const text=`Tu Authenticator de WebFactory PR se restableció tras una solicitud de recuperación verificada. Inicia sesión nuevamente y configura un nuevo Authenticator, o usa una passkey existente. Los códigos de recuperación anteriores ya no son válidos. Si no solicitaste este cambio, contacta support@webfactorypr.com inmediatamente.\n\nYour WebFactory PR Authenticator was reset after a verified recovery request. Sign in again and configure a new Authenticator, or use an existing passkey. Previous recovery codes are invalid. If you did not request this, contact support@webfactorypr.com immediately.\n\nReferencia / Reference: ${requestId}\nFecha / Date: ${at}`;
  return renderTextEmail({subject,text,language:'es',actions:[{url:`${publicBaseUrl()}/client-admin/`,label:'Abrir portal / Open portal'}]});
}
