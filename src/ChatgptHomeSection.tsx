const content = {
  en: {
    title: 'Your business, connected to ChatGPT.',
    intro: 'Use the WebFactory MCP connection to consult business information and prepare changes from a conversation. You review and approve changes in WebFactory before they are applied.',
    cards: [['Ask about your business', 'Consult bookings, orders, catalog and accounting information within your authorized access.'], ['Prepare your next change', 'Prepare operational updates or a website design proposal with a preview. Available tools cover selected portal functions.'], ['Keep control', 'A business connection is limited to the selected business. Platform administration requires a separate, authorized administrator connection.']],
    setup: 'Connect your account',
    iconTitle: 'WebFactory PR icon', iconHelp: 'Download this PNG and upload it when the MCP setup asks for an icon. On iPhone, save it to Files; if it opens as an image, use Share → Save Image or Save to Files.', iconDownload: 'Download MCP icon (PNG)', iconOpen: 'Open image',
    steps: ['Sign in to ChatGPT in your browser. In Settings → Security and login, enable Developer mode if your account offers it.', 'Open Plugins → + → Create custom MCP server. Name it WebFactory PR and use the server URL below. Select OAuth if asked; the server supports automatic client registration.', 'Create the connection. Sign in to WebFactory on webfactorypr.com, complete any required verification, and review the requested permissions. Choose your business and authorize only the access you want.', 'Open a chat with WebFactory PR selected. Start with the read-only example below. For a proposed change, open its WebFactory review link and check the affected business and details before confirming.'],
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
    steps: ['Inicia sesión en ChatGPT desde tu navegador. En Settings → Security and login, activa Developer mode si tu cuenta ofrece esa opción.', 'Abre Plugins → + → Create custom MCP server. Usa el nombre WebFactory PR y la URL del servidor que aparece abajo. Selecciona OAuth si lo solicita; el servidor admite registro automático del cliente.', 'Crea la conexión. Inicia sesión en WebFactory en webfactorypr.com, completa la verificación requerida y revisa los permisos solicitados. Selecciona tu negocio y autoriza únicamente el acceso que deseas.', 'Abre un chat con WebFactory PR seleccionado. Comienza con el ejemplo de solo consulta. Para un cambio propuesto, abre su enlace de revisión en WebFactory y comprueba el negocio y los detalles antes de confirmar.'],
    url: 'URL del servidor MCP', promptLabel: 'Primer mensaje', prompt: 'Muéstrame qué cuenta, negocio y permisos tengo conectados. Solo consulta; no hagas cambios.',
    availability: 'La conexión personalizada utiliza actualmente Developer mode de ChatGPT; no es una instalación desde el catálogo público. La disponibilidad, los planes y los nombres de menús dependen de ChatGPT y las políticas del espacio de trabajo. Se verificaron una conexión y una consulta desde iPhone; esto no garantiza compatibilidad con toda cuenta o dispositivo. Una ficha marcada Desktop only corresponde a otra vía de instalación.',
    limits: 'Las contraseñas, credenciales, código fuente, terminal y despliegues quedan fuera de esta conexión. Algunas tareas del portal siguen siendo manuales. Las propuestas de diseño de Factory AI cambian la configuración del website, no el código de la plataforma.',
    privacy: 'Los resultados autorizados se comparten con ChatGPT, incluyendo información de clientes o financiera cuando se solicita. Revisa los permisos y comparte solo lo que tu negocio está autorizado a divulgar. Los términos de OpenAI y cualquier cargo aplicable son independientes de WebFactory.',
    manage: 'Administrar conexiones y aprobaciones', docs: 'Documentación de instalación de ChatGPT', policies: 'Lee nuestra Política de Privacidad y Términos antes de conectar.'
  }
}

export default function ChatgptHomeSection({ lang }: { lang: 'en' | 'es' }) {
  const t = content[lang]
  return <section className="wf-section wf-shell wf-mcp" id="chatgpt" aria-labelledby="wf-mcp-title">
    <div className="wf-heading"><p className="wf-eyebrow">WEBFACTORY + CHATGPT · MCP</p><h2 id="wf-mcp-title">{t.title}</h2><p>{t.intro}</p></div>
    <div className="wf-platform">{t.cards.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
    <div className="wf-faq"><details><summary>{t.setup}<span aria-hidden="true">+</span></summary>
      <ol className="wf-mcp-steps">{t.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p><strong>{t.url}</strong><br/><code>https://webfactorypr.com/mcp</code></p>
      <div className="wf-mcp-icon">
        <img src="/webfactory-mcp-icon.png" alt={t.iconTitle} width="128" height="128" loading="lazy" />
        <div><h3>{t.iconTitle}</h3><p>{t.iconHelp}</p>
          <div className="wf-actions"><a className="wf-btn" href="/webfactory-mcp-icon.png" download="WebFactory-PR-MCP-icon.png">{t.iconDownload}</a><a href="/webfactory-mcp-icon.png" target="_blank" rel="noopener noreferrer">{t.iconOpen} ↗</a></div>
        </div>
      </div>
      <p><strong>{t.promptLabel}</strong><br/>{t.prompt}</p>
      <p>{t.availability}</p>
      <p><a href="https://developers.openai.com/plugins/deploy/connect-chatgpt" target="_blank" rel="noopener noreferrer">{t.docs} ↗</a></p>
    </details></div>
    <p>{t.limits}</p><p>{t.privacy}</p>
    <div className="wf-actions"><a className="wf-btn" href="/chatgpt">{t.manage} →</a></div>
    <p>{t.policies} <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a> · <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a></p>
  </section>
}
