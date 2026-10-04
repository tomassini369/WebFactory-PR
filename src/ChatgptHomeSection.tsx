import { useState } from 'react'

const content = {
  en: {
    title: 'Your business, connected to ChatGPT.',
    intro: 'Use the WebFactory MCP connection to consult business information and prepare changes from a conversation. You review and approve changes in WebFactory before they are applied.',
    cards: [['Ask about your business', 'Consult bookings, orders, catalog and accounting information within your authorized access.'], ['Prepare your next change', 'Prepare operational updates or a website design proposal with a preview. Available tools cover selected portal functions.'], ['Keep control', 'A business connection is limited to the selected business. Platform administration requires a separate, authorized administrator connection.']],
    setup: 'Connect your account',
    iconTitle: 'WebFactory PR icon', iconHelp: 'Download this PNG and upload it when the MCP setup asks for an icon. On iPhone, save it to Files; if it opens as an image, use Share → Save Image or Save to Files.', iconDownload: 'Download MCP icon (PNG)', iconOpen: 'Open image',
    steps: ['Open ChatGPT in Safari or your browser and sign in.', 'Open Settings → Security and login → Developer mode. Turn it on if your account offers it.', 'Open Plugins → + → Create custom MCP server. Copy and paste these fields:', 'If asked for an icon, download this image and upload it.', 'Choose OAuth as the authentication method. Leave optional Client ID and Client Secret fields empty: WebFactory registers the connection automatically. Review any notice and select Create.', 'Sign in on webfactorypr.com, select your business and review the permissions before authorizing. A platform administrator connection is separate.', 'Return to ChatGPT and select Try in chat with WebFactory PR. Copy the first message below to check your connection.'],
    nameLabel: 'Name', descriptionLabel: 'Description (if requested)', description: 'Manage my business in WebFactory.', copy: 'Copy', copied: 'Copied', copyFailed: 'Could not copy. Select the text and copy it manually.', stepLabel: 'Step',
    url: 'MCP server URL', promptLabel: 'First message', prompt: 'Show my connected account, business and permissions. Read only; do not make changes.',
    availability: 'Custom connection setup currently uses ChatGPT Developer mode; it is not a public directory installation. Availability, plans and menu names depend on ChatGPT and workspace policy. An iPhone connection and read-only query have been verified; this does not guarantee support on every account or device. A listing marked Desktop only is a different installation path.',
    limits: 'Passwords, credentials, source code, terminal access and deployments are outside this connection. Some portal tasks remain manual. Factory AI design proposals change website configuration, not platform source code.',
    privacy: 'Authorized results are shared with ChatGPT, including customer or financial information when requested. Review your permissions and share only what your business is entitled to disclose. OpenAI terms and any applicable charges are separate from WebFactory.',
    manage: 'Manage connections and approvals', docs: 'ChatGPT setup documentation', policies: 'Read our Privacy Policy and Terms before connecting.'
  },
  es: {
    title: 'Tu negocio, conectado con ChatGPT.',
    intro: 'Usa la conexión MCP de WebFactory para consultar información del negocio y preparar cambios desde una conversación. Revisas y apruebas los cambios en WebFactory antes de aplicarlos.',
    cards: [['Consulta tu negocio', 'Consulta reservas, órdenes, catálogo e información contable dentro de tu acceso autorizado.'], ['Prepara el próximo cambio', 'Prepara actualizaciones operacionales o una propuesta de diseño del website con vista previa. Las herramientas disponibles cubren funciones seleccionadas del portal.'], ['Mantén el control', 'La conexión de negocio se limita al negocio seleccionado. Administrar la plataforma requiere una conexión separada de un administrador autorizado.']],
    setup: 'Conecta tu cuenta',
    iconTitle: 'Icono de WebFactory PR', iconHelp: 'Descarga este PNG y súbelo cuando la configuración del MCP solicite un icono. En iPhone, guárdalo en Archivos; si se abre como imagen, usa Compartir → Guardar imagen o Guardar en Archivos.', iconDownload: 'Descargar icono del MCP (PNG)', iconOpen: 'Abrir imagen',
    steps: ['Abre ChatGPT en Safari o tu navegador e inicia sesión.', 'Ve a Settings → Security and login → Developer mode. Actívalo si tu cuenta ofrece esa opción.', 'Abre Plugins → + → Create custom MCP server. Copia y pega estos datos:', 'Si te solicita un icono, descarga esta imagen y súbela.', 'Selecciona OAuth como autenticación. Deja vacíos los campos opcionales Client ID y Client Secret: WebFactory registra la conexión automáticamente. Revisa el aviso que aparezca y pulsa Create.', 'Inicia sesión en webfactorypr.com, selecciona tu negocio y revisa los permisos antes de autorizar. La conexión de administrador de plataforma se autoriza por separado.', 'Regresa a ChatGPT y pulsa Probar en el chat con WebFactory PR. Copia el primer mensaje de abajo para comprobar tu conexión.'],
    nameLabel: 'Nombre', descriptionLabel: 'Descripción (si la solicita)', description: 'Administrar mi negocio en WebFactory.', copy: 'Copiar', copied: 'Copiado', copyFailed: 'No se pudo copiar. Selecciona el texto y cópialo manualmente.', stepLabel: 'Paso',
    url: 'URL del servidor MCP', promptLabel: 'Primer mensaje', prompt: 'Muéstrame qué cuenta, negocio y permisos tengo conectados. Solo consulta; no hagas cambios.',
    availability: 'La conexión personalizada utiliza actualmente Developer mode de ChatGPT; no es una instalación desde el catálogo público. La disponibilidad, los planes y los nombres de menús dependen de ChatGPT y las políticas del espacio de trabajo. Se verificaron una conexión y una consulta desde iPhone; esto no garantiza compatibilidad con toda cuenta o dispositivo. Una ficha marcada Desktop only corresponde a otra vía de instalación.',
    limits: 'Las contraseñas, credenciales, código fuente, terminal y despliegues quedan fuera de esta conexión. Algunas tareas del portal siguen siendo manuales. Las propuestas de diseño de Factory AI cambian la configuración del website, no el código de la plataforma.',
    privacy: 'Los resultados autorizados se comparten con ChatGPT, incluyendo información de clientes o financiera cuando se solicita. Revisa los permisos y comparte solo lo que tu negocio está autorizado a divulgar. Los términos de OpenAI y cualquier cargo aplicable son independientes de WebFactory.',
    manage: 'Administrar conexiones y aprobaciones', docs: 'Documentación de instalación de ChatGPT', policies: 'Lee nuestra Política de Privacidad y Términos antes de conectar.'
  }
}

export default function ChatgptHomeSection({ lang }: { lang: 'en' | 'es' }) {
  const t = content[lang]
  const [feedback, setFeedback] = useState('')
  const copyField = (label: string, value: string) => <div className="wf-mcp-copy-field">
    <strong>{label}</strong><div><code>{value}</code><button type="button" className="wf-btn" aria-label={`${t.copy}: ${label}`} onClick={async () => {
      try { await navigator.clipboard.writeText(value); setFeedback(`${t.copied}: ${label}`) }
      catch { setFeedback(t.copyFailed) }
    }}>{t.copy}</button></div>
  </div>
  return <section className="wf-section wf-shell wf-mcp" id="chatgpt" aria-labelledby="wf-mcp-title">
    <div className="wf-heading"><p className="wf-eyebrow">WEBFACTORY + CHATGPT · MCP</p><h2 id="wf-mcp-title">{t.title}</h2><p>{t.intro}</p></div>
    <div className="wf-platform">{t.cards.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
    <div className="wf-faq"><details><summary>{t.setup}<span aria-hidden="true">+</span></summary>
      <ol className="wf-mcp-steps wf-mcp-numbered">{t.steps.map((step, index) => <li key={index}>
        <h3>{t.stepLabel} {index + 1}</h3><p>{step}</p>
        {index === 2 && <>{copyField(t.nameLabel, 'WebFactory PR')}{copyField(t.descriptionLabel, t.description)}{copyField(t.url, 'https://webfactorypr.com/mcp')}</>}
        {index === 3 && <div className="wf-mcp-icon">
          <img src="/webfactory-mcp-icon.png" alt={t.iconTitle} width="128" height="128" loading="lazy" />
          <div><p>{t.iconHelp}</p><div className="wf-actions"><a className="wf-btn" href="/webfactory-mcp-icon.png" download="WebFactory-PR-MCP-icon.png">{t.iconDownload}</a><a href="/webfactory-mcp-icon.png" target="_blank" rel="noopener noreferrer">{t.iconOpen} ↗</a></div></div>
        </div>}
        {index === 6 && copyField(t.promptLabel, t.prompt)}
      </li>)}</ol>
      <p role="status" aria-live="polite">{feedback}</p>
      <p>{t.availability}</p>
      <p><a href="https://developers.openai.com/plugins/deploy/connect-chatgpt" target="_blank" rel="noopener noreferrer">{t.docs} ↗</a></p>
    </details></div>
    <p>{t.limits}</p><p>{t.privacy}</p>
    <div className="wf-actions"><a className="wf-btn" href="/chatgpt">{t.manage} →</a></div>
    <p>{t.policies} <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a> · <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a></p>
  </section>
}
