import { useEffect, useState } from 'react'
import './payment-setup.css'

type Language='en'|'es'
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
  const [lang,setLang]=useState<Language>('en')
  const [setup,setSetup] = useState<SetupData|null>(null)
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const [connecting,setConnecting] = useState(false)
  const es=lang==='es'

  const load = async () => {
    try {
      const query = new URLSearchParams({orderId,token})
      const response = await fetch(`/.netlify/functions/payment-setup-status?${query}`,{cache:'no-store'})
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || (es?'No se pudo abrir la configuración.':'The payment setup could not be opened.'))
      setSetup(result.setup)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : (es?'No se pudo abrir la configuración.':'The payment setup could not be opened.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    document.documentElement.lang=lang
    document.title=(es?'Configuración de pagos':'Payment setup')+' | WebFactory PR'
  },[lang])

  useEffect(()=>{
    if(params.get('error')) setError(es?'Stripe no pudo renovar el enlace. Intenta nuevamente.':'Stripe could not refresh the link. Please try again.')
  },[lang])

  useEffect(()=>{
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
      if(!response.ok || !result.url) throw new Error(result.message || (es?'No se pudo iniciar Stripe Connect.':'Stripe Connect could not be started.'))
      window.location.assign(result.url)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : (es?'No se pudo iniciar Stripe Connect.':'Stripe Connect could not be started.'))
      setConnecting(false)
    }
  }

  const languageButtons=<div className="portal-language"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div>

  if (loading) return <main className="payment-setup-page"><section className="payment-setup-card">{languageButtons}<p>{es?'Verificando enlace privado…':'Verifying private link…'}</p></section></main>
  if (error && !setup) return <main className="payment-setup-page"><section className="payment-setup-card">{languageButtons}<img src="/webfactory-pr-logo.png" alt="WebFactory PR"/><small>{es?'ENLACE PRIVADO':'PRIVATE LINK'}</small><h1>{es?'No pudimos abrir esta configuración.':'We could not open this setup.'}</h1><p className="payment-error">{error}</p><a href="mailto:support@webfactorypr.com">{es?'Contactar a WebFactory':'Contact WebFactory'}</a></section></main>

  const stripeActive = setup?.stripe?.capabilityStatus === 'active'
  return <main className="payment-setup-page">
    <section className="payment-setup-card wide">
      {languageButtons}
      <header><img src="/webfactory-pr-logo.png" alt="WebFactory PR"/><span>{es?'Configuración segura':'Secure setup'}</span></header>
      <small>{es?'ORDEN':'ORDER'} {setup?.orderId}</small>
      <h1>{es?`Configura los pagos de ${setup?.businessName}.`:`Set up payments for ${setup?.businessName}.`}</h1>
      <p>{es?'Los fondos irán directamente a las cuentas del negocio. No introduzcas contraseñas ni llaves secretas en WebFactory.':'Funds go directly to the business accounts. Do not enter passwords or secret keys into WebFactory.'}</p>
      {error && <div className="payment-error">{error}</div>}

      <div className="payment-setup-list">
        {setup?.methods.stripe && <article className={stripeActive?'complete':''}>
          <div><b>stripe</b><span>{stripeActive?(es?'✓ Cuenta lista para cobrar':'✓ Account ready to accept payments'):setup.stripe?.accountCreated?(es?'Onboarding pendiente':'Onboarding pending'):(es?'Conexión pendiente':'Connection pending')}</span></div>
          <p>{es?'Stripe recopila directamente la identidad, información bancaria y datos fiscales. WebFactory no puede verlos.':'Stripe collects identity, banking, and tax information directly. WebFactory cannot view that information.'}</p>
          {!stripeActive && <button onClick={connectStripe} disabled={connecting}>{connecting?(es?'Abriendo Stripe…':'Opening Stripe…'):setup.stripe?.accountCreated?(es?'Continuar configuración en Stripe':'Continue setup in Stripe'):(es?'Conectar o crear cuenta Stripe':'Connect or create Stripe account')}</button>}
          {stripeActive && <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">{es?'Abrir Stripe Dashboard':'Open Stripe Dashboard'} ↗</a>}
        </article>}

        {setup?.methods.ath && <article>
          <div><b>ATH Móvil Business</b><span>{setup.ath?.accountStatus==='active'?(es?'Cuenta indicada como activa':'Account marked active'):(es?'Setup requerido':'Setup required')}</span></div>
          <p>{setup.ath?.publicPath?(es?`pATH suministrado: ${setup.ath.publicPath}`:`Provided pATH: ${setup.ath.publicPath}`):(es?'El negocio deberá crear o verificar su cuenta ATH Móvil Business durante producción.':'The business will need to create or verify its ATH Móvil Business account during production.')}</p>
          <ul><li>{es?'La cuenta debe pertenecer al negocio.':'The account must belong to the business.'}</li><li>{es?'Las credenciales se colocan directamente en el website publicado.':'Credentials are entered directly into the published website setup.'}</li><li>{es?'WebFactory verificará el pago en el servidor antes de confirmar órdenes o citas.':'WebFactory verifies payment on the server before confirming orders or bookings.'}</li></ul>
        </article>}

        {setup?.methods.inPerson && <article>
          <div><b>{es?'Pago presencial':'In-person payment'}</b><span>{es?'Configurado':'Configured'}</span></div>
          <p>{setup.inPerson?.instructions || (es?'El cliente pagará directamente en el establecimiento.':'The customer will pay directly at the business.')}</p>
          <small>{es?'Estas órdenes quedarán como pago pendiente hasta que el negocio registre el cobro.':'These orders remain pending until the business records the payment.'}</small>
        </article>}
      </div>

      <section className="payment-rules-summary"><h2>{es?'Reglas seleccionadas':'Selected rules'}</h2><div><span>{es?'Productos':'Products'}</span><b>{setup?.rules.productPayment==='online'?(es?'Pago online':'Online payment'):(es?'Pago presencial':'In-person payment')}</b></div><div><span>{es?'Reservaciones':'Bookings'}</span><b>{setup?.rules.bookingPayment==='deposit'?(es?`Depósito de ${setup.rules.bookingDepositPercent}%`:`${setup.rules.bookingDepositPercent}% deposit`):setup?.rules.bookingPayment==='full'?(es?'Pago completo':'Full payment'):(es?'Pago presencial':'In-person payment')}</b></div><div><span>{es?'Recibos':'Receipts'}</span><b>{setup?.rules.sendCustomerReceipt?(es?'Sí':'Yes'):'No'}</b></div><div><span>{es?'Propinas':'Tips'}</span><b>{setup?.rules.allowTips?(es?'Sí':'Yes'):'No'}</b></div></section>
      <footer>{es?'WebFactory nunca solicitará por email tu contraseña, número completo de tarjeta, código 2FA ni llave secreta.':'WebFactory will never ask by email for your password, full card number, 2FA code, or secret key.'}</footer>
    </section>
  </main>
}
