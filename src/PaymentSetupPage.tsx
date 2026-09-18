import { useEffect, useState } from 'react'
import './payment-setup.css'

type SetupData = {
  orderId:string
  businessName:string
  methods:{stripe:boolean;ath:boolean;inPerson:boolean}
  stripe:null|{accountCreated:boolean;capabilityStatus:string;onboardingStatus:string}
  ath:null|{accountStatus:string;publicPath:string}
  inPerson:null|{instructions:string}
  rules:{productPayment:string;bookingPayment:string;bookingDepositPercent:number;sendCustomerReceipt:boolean;allowTips:boolean}
}

export default function PaymentSetupPage() {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get('orderId') || ''
  const token = params.get('token') || ''
  const [setup,setSetup] = useState<SetupData|null>(null)
  const [error,setError] = useState(params.get('error') ? 'Stripe no pudo renovar el enlace. Intenta nuevamente.' : '')
  const [loading,setLoading] = useState(true)
  const [connecting,setConnecting] = useState(false)

  const load = async () => {
    try {
      const query = new URLSearchParams({orderId,token})
      const response = await fetch(`/.netlify/functions/payment-setup-status?${query}`,{cache:'no-store'})
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo abrir la configuración.')
      setSetup(result.setup)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo abrir la configuración.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    document.documentElement.lang='es'
    document.title='Configuración de pagos | WebFactory PR'
    let robots=document.querySelector('meta[name="robots"]') as HTMLMetaElement|null
    if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots)}
    robots.content='noindex,nofollow,noarchive'
    load()
  },[])

  const connectStripe = async () => {
    setConnecting(true)
    setError('')
    try {
      const response = await fetch('/.netlify/functions/create-stripe-connect-onboarding',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({orderId,token}),
      })
      const result = await response.json()
      if(!response.ok || !result.url) throw new Error(result.message || 'No se pudo iniciar Stripe Connect.')
      window.location.assign(result.url)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'No se pudo iniciar Stripe Connect.')
      setConnecting(false)
    }
  }

  if (loading) return <main className="payment-setup-page"><section className="payment-setup-card"><p>Verificando enlace privado…</p></section></main>
  if (error && !setup) return <main className="payment-setup-page"><section className="payment-setup-card"><img src="/webfactory-pr-logo.png" alt="WebFactory PR"/><small>ENLACE PRIVADO</small><h1>No pudimos abrir esta configuración.</h1><p className="payment-error">{error}</p><a href="mailto:webfactorypr@gmail.com">Contactar a WebFactory</a></section></main>

  const stripeActive = setup?.stripe?.capabilityStatus === 'active'
  return <main className="payment-setup-page">
    <section className="payment-setup-card wide">
      <header><img src="/webfactory-pr-logo.png" alt="WebFactory PR"/><span>Configuración segura</span></header>
      <small>ORDEN {setup?.orderId}</small>
      <h1>Configura los pagos de {setup?.businessName}.</h1>
      <p>Los fondos irán directamente a las cuentas del negocio. No introduzcas contraseñas ni llaves secretas en WebFactory.</p>
      {error && <div className="payment-error">{error}</div>}

      <div className="payment-setup-list">
        {setup?.methods.stripe && <article className={stripeActive?'complete':''}>
          <div><b>stripe</b><span>{stripeActive?'✓ Cuenta lista para cobrar':setup.stripe?.accountCreated?'Onboarding pendiente':'Conexión pendiente'}</span></div>
          <p>Stripe recopila directamente la identidad, información bancaria y datos fiscales. WebFactory no puede verlos.</p>
          {!stripeActive && <button onClick={connectStripe} disabled={connecting}>{connecting?'Abriendo Stripe…':setup.stripe?.accountCreated?'Continuar configuración en Stripe':'Conectar o crear cuenta Stripe'}</button>}
          {stripeActive && <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">Abrir Stripe Dashboard ↗</a>}
        </article>}

        {setup?.methods.ath && <article>
          <div><b>ATH Móvil Business</b><span>{setup.ath?.accountStatus==='active'?'Cuenta indicada como activa':'Setup requerido'}</span></div>
          <p>{setup.ath?.publicPath?`pATH suministrado: ${setup.ath.publicPath}`:'El negocio deberá crear o verificar su cuenta ATH Móvil Business durante producción.'}</p>
          <ul><li>La cuenta debe pertenecer al negocio.</li><li>Las credenciales se colocan directamente en el website publicado.</li><li>WebFactory verificará el pago en el servidor antes de confirmar órdenes o citas.</li></ul>
        </article>}

        {setup?.methods.inPerson && <article>
          <div><b>Pago presencial</b><span>Configurado</span></div>
          <p>{setup.inPerson?.instructions || 'El cliente pagará directamente en el establecimiento.'}</p>
          <small>Estas órdenes quedarán como pago pendiente hasta que el negocio registre el cobro.</small>
        </article>}
      </div>

      <section className="payment-rules-summary"><h2>Reglas seleccionadas</h2><div><span>Productos</span><b>{setup?.rules.productPayment==='online'?'Pago online':'Pago presencial'}</b></div><div><span>Reservaciones</span><b>{setup?.rules.bookingPayment==='deposit'?`Depósito de ${setup.rules.bookingDepositPercent}%`:setup?.rules.bookingPayment==='full'?'Pago completo':'Pago presencial'}</b></div><div><span>Recibos</span><b>{setup?.rules.sendCustomerReceipt?'Sí':'No'}</b></div><div><span>Propinas</span><b>{setup?.rules.allowTips?'Sí':'No'}</b></div></section>
      <footer>WebFactory nunca solicitará por email tu contraseña, número completo de tarjeta, código 2FA ni llave secreta.</footer>
    </section>
  </main>
}
