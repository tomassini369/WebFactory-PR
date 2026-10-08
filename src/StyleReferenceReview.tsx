import ReceiptPaper, { type ReceiptRecord } from './ReceiptPaper'

const sample: ReceiptRecord = {
  receiptId: 'rcpt-ejemplo', transactionId: 'transaccion-ejemplo', total: 2541,
  paymentStatus: 'paid', paymentMethod: 'card', createdAt: '2026-10-08T16:00:00Z',
  customer: { name: 'Cliente de ejemplo', email: 'cliente@example.invalid' },
  items: [{ name: 'Producto de ejemplo', quantity: 2, unitAmount: 1100, amount: 2200 }],
  subtotal: 2200, discounts: 100, tax: 241, tip: 200,
}

export default function StyleReferenceReview({ lang, device, theme }: {
  lang: 'es' | 'en'; device: 'desktop' | 'mobile'; theme: 'dark' | 'light'
}) {
  const es = lang === 'es', width = device === 'mobile' ? 390 : 1280
  return <div className="pr-style-review">
    <p className="pr-caption">{es ? 'Estilos adaptados de tus cuatro archivos. Capturas del código real con datos de ejemplo.' : 'Styles adapted from your four files. Captures of the actual code using sample data.'}</p>
    <section><h2>{es ? 'Login Glassy' : 'Glassy login'}</h2><p><a href="/client-admin">{es ? 'Abrir login de clientes' : 'Open client login'} ↗</a> · <a href="/webfactory-admin">{es ? 'Abrir login administrativo' : 'Open admin login'} ↗</a></p><figure className="pr-shot"><img src={`/preview-review/styles/login-${width}-${theme}.webp`} alt={es ? 'Login con fondo original, botones azules y formulario de vidrio' : 'Login with original background, blue buttons and glass form'} /></figure></section>
    <section><h2>{es ? 'Dashboards Glassy' : 'Glassy dashboards'}</h2><div className="pr-style-dashboards">{(['client-admin', 'webfactory-admin'] as const).map(portal => <figure className="pr-shot" key={portal}><img src={`/preview-review/styles/${portal}-overview-${width}-${theme}.webp`} alt={portal === 'client-admin' ? (es ? 'Panel de negocio con vidrio y fondo original' : 'Business dashboard with glass and original background') : (es ? 'Centro administrativo con vidrio y fondo original' : 'Administrative center with glass and original background')} /><figcaption>{portal === 'client-admin' ? (es ? 'Panel del negocio · Datos de ejemplo' : 'Business dashboard · Sample data') : (es ? 'Centro administrativo · Datos de ejemplo' : 'Administrative center · Sample data')}</figcaption></figure>)}</div></section>
    <section><h2>{es ? 'Recibo con impresora 3D' : 'Receipt with 3D printer'}</h2><p className="pr-caption">{es ? 'Impresión progresiva, papel curvado y controles para desprender e inspeccionar el recibo. Datos de ejemplo; el portal conserva el recibo guardado, PDF y reenvío.' : 'Progressive printing, curved paper and controls to tear and inspect the receipt. Sample data; the portal retains saved receipts, PDF and resend.'}</p><div className="pr-style-receipt" key={`${device}-${theme}`}><ReceiptPaper receipt={sample} lang={lang}/></div></section>
    <section><h2>{es ? 'Animación hacia el carrito' : 'Fly-to-cart animation'}</h2><p>{es ? 'Abre el catálogo del template y pulsa Añadir para ver cómo la imagen llega al carrito.' : 'Open the template catalog and press Add to see the image fly to the cart.'}</p><a href="/templates/brisa-cocina#services">{es ? 'Probar el carrito del template' : 'Try the template cart'} ↗</a></section>
  </div>
}
