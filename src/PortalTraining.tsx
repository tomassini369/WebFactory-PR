import { useMemo, useState } from 'react'
import './portal-training.css'

type Language='es'|'en'
type Topic='start'|'website'|'catalog'|'orders'|'bookings'|'team'|'payments'
type DemoProduct={id:number;name:string;price:number}

const text={
  es:{
    badge:'MODO TRAINING · PRÁCTICA SEGURA',title:'Aprende practicando',intro:'Prueba las funciones con un negocio de ejemplo. Lo que hagas aquí no cambia tu página real.',exit:'Salir de Training',reset:'Reiniciar práctica',
    topics:[['start','Recorrido general'],['website','Editar la página'],['catalog','Añadir un producto'],['orders','Preparar una orden'],['bookings','Crear una cita'],['team','Añadir un empleado'],['payments','Practicar un cobro']] as Array<[Topic,string]>,
    startTitle:'Tu negocio de práctica',startText:'Este es un espacio de ejemplo. Escoge una actividad y sigue las instrucciones. Puedes probar, equivocarte y volver a empezar.',safety:'Solo datos de ejemplo · No se envían cobros, correos ni cambios a tu negocio.',
    websiteTitle:'Editar la página',websiteText:'Cambia el título de ejemplo y mira cómo se vería en tu página.',pageTitle:'Título de la página',save:'Guardar ejemplo',saved:'¡Listo! El ejemplo se actualizó. Tu página real no cambió.',
    catalogTitle:'Añadir un producto',catalogText:'Escribe un nombre y un precio para practicar cómo se añade algo al catálogo.',productName:'Nombre del producto',price:'Precio de ejemplo',add:'Añadir al catálogo de práctica',items:'Productos de ejemplo',
    ordersTitle:'Preparar una orden',ordersText:'Mueve la orden de ejemplo por cada paso de preparación.',received:'Recibida',preparing:'Preparando',ready:'Lista',completed:'Completada',advance:'Pasar al próximo paso',
    bookingTitle:'Crear una cita',bookingText:'Completa estos datos ficticios para ver cómo se registra una cita.',customer:'Nombre de ejemplo',service:'Servicio',day:'Día',createBooking:'Crear cita de ejemplo',bookingCreated:'Cita de práctica creada',
    teamTitle:'Añadir un empleado',teamText:'Añade una persona de ejemplo al equipo de práctica.',employee:'Nombre de ejemplo',role:'Trabajo que realiza',addEmployee:'Añadir al equipo de práctica',
    paymentsTitle:'Practicar un cobro',paymentsText:'Escoge un método para ver cómo se presenta. No se procesa ningún pago real.',card:'Tarjeta de ejemplo',cash:'Efectivo de ejemplo',ath:'ATH Móvil de ejemplo',choose:'Escoger método',payNotice:'Demostración: no se cobró dinero ni se abrió Stripe o ATH Móvil.',
    next:'Siguiente',previous:'Anterior',done:'Terminar recorrido',step:'Paso',of:'de',tourDone:'¡Terminaste el recorrido! Puedes repetirlo o escoger otra práctica.',
    demoPage:'Mi negocio de práctica',sample:'DEMO',
  },
  en:{
    badge:'TRAINING MODE · SAFE PRACTICE',title:'Learn by practicing',intro:'Try features using a sample business. Nothing you do here changes your real website.',exit:'Exit Training',reset:'Reset practice',
    topics:[['start','Quick tour'],['website','Edit the website'],['catalog','Add a product'],['orders','Prepare an order'],['bookings','Create an appointment'],['team','Add an employee'],['payments','Practice a payment']] as Array<[Topic,string]>,
    startTitle:'Your practice business',startText:'This is a sample space. Choose an activity and follow the steps. Try things, make mistakes, and start over anytime.',safety:'Sample data only · No payments, emails, or changes are sent to your real business.',
    websiteTitle:'Edit the website',websiteText:'Change the sample title and see how it could look on your page.',pageTitle:'Website title',save:'Save sample',saved:'Done! The sample was updated. Your real website was not changed.',
    catalogTitle:'Add a product',catalogText:'Enter a name and price to practice adding an item to your catalog.',productName:'Sample product name',price:'Sample price',add:'Add to practice catalog',items:'Sample products',
    ordersTitle:'Prepare an order',ordersText:'Move the sample order through each preparation step.',received:'Received',preparing:'Preparing',ready:'Ready',completed:'Completed',advance:'Move to next step',
    bookingTitle:'Create an appointment',bookingText:'Fill in these sample details to see how an appointment is added.',customer:'Sample customer name',service:'Service',day:'Day',createBooking:'Create sample appointment',bookingCreated:'Practice appointment created',
    teamTitle:'Add an employee',teamText:'Add a sample person to your practice team.',employee:'Sample name',role:'Job role',addEmployee:'Add to practice team',
    paymentsTitle:'Practice a payment',paymentsText:'Choose a method to see how it works. No real payment will be processed.',card:'Sample card',cash:'Sample cash',ath:'Sample ATH Móvil',choose:'Choose method',payNotice:'Demo only: no money was charged and Stripe or ATH Móvil was not opened.',
    next:'Next',previous:'Back',done:'Finish tour',step:'Step',of:'of',tourDone:'You finished the tour! Repeat it or choose another practice.',
    demoPage:'My practice business',sample:'DEMO',
  }
} as const

const topicSteps:Record<Language,Partial<Record<Topic,string[]>>>= {
  es:{start:['Escoge una práctica en el menú.','Prueba la actividad. Los cambios solo viven aquí.','Reinicia o sal cuando termines.'],website:['Escribe un título nuevo para el negocio de ejemplo.','Guarda el ejemplo para ver el cambio.'],catalog:['Escribe el nombre y precio del producto.','Añádelo al catálogo ficticio.'],orders:['Mira el estado actual de la orden.','Avánzala al próximo paso.'],bookings:['Escribe un nombre y escoge un servicio.','Crea la cita ficticia.'],team:['Escribe el nombre y el trabajo de la persona.','Añádela al equipo ficticio.'],payments:['Escoge un método de pago de ejemplo.','Verás una confirmación de práctica, sin cobro.']},
  en:{start:['Choose a practice activity from the menu.','Try the activity. Changes stay here only.','Reset or exit when you are done.'],website:['Enter a new title for the sample business.','Save the sample to see the change.'],catalog:['Enter a product name and price.','Add it to the sample catalog.'],orders:['Look at the current order status.','Move it to the next step.'],bookings:['Enter a name and choose a service.','Create the sample appointment.'],team:['Enter the person’s name and job.','Add them to the sample team.'],payments:['Choose a sample payment method.','See a practice confirmation, with no charge.']}
}

export function PortalTraining({lang,onExit}:{lang:Language;onExit:()=>void}){
  const t=text[lang]
  const [topic,setTopic]=useState<Topic>('start')
  const [step,setStep]=useState(0)
  const [pageTitle,setPageTitle]=useState<string>(t.demoPage)
  const [saved,setSaved]=useState(false)
  const [products,setProducts]=useState<DemoProduct[]>([{id:1,name:lang==='es'?'Café de ejemplo':'Sample coffee',price:3.5}])
  const [productName,setProductName]=useState('')
  const [productPrice,setProductPrice]=useState('')
  const [orderStep,setOrderStep]=useState(0)
  const [customer,setCustomer]=useState('')
  const [service,setService]=useState<string>(lang==='es'?'Consulta de ejemplo':'Sample consultation')
  const [bookingCreated,setBookingCreated]=useState(false)
  const [employee,setEmployee]=useState('')
  const [role,setRole]=useState('')
  const [team,setTeam]=useState<Array<{name:string;role:string}>>([])
  const [payment,setPayment]=useState('')
  const steps=topicSteps[lang][topic]||[]
  const topicTitle=useMemo(()=>t.topics.find(([id])=>id===topic)?.[1]||t.title,[t,topic])
  const selectTopic=(next:Topic)=>{setTopic(next);setStep(0);setSaved(false);setBookingCreated(false);setPayment('')}
  const progress=steps.length?Math.min(100,Math.round((step/steps.length)*100)):0
  const orderLabels=[t.received,t.preparing,t.ready,t.completed]
  const addProduct=()=>{if(!productName.trim()||!Number.isFinite(Number(productPrice))||Number(productPrice)<=0)return;setProducts(rows=>[...rows,{id:Date.now(),name:productName.trim(),price:Number(productPrice)}]);setProductName('');setProductPrice('');setStep(1)}
  const addTeamMember=()=>{if(!employee.trim()||!role.trim())return;setTeam(rows=>[...rows,{name:employee.trim(),role:role.trim()}]);setEmployee('');setRole('');setStep(1)}
  return <section className="wf-training" aria-labelledby="wf-training-title">
    <header className="wf-training-banner"><div><span className="wf-training-badge">● {t.badge}</span><h2 id="wf-training-title">{t.title}</h2><p>{t.intro}</p></div><div className="wf-training-controls"><button className="wf-training-reset" onClick={()=>{selectTopic('start');setPageTitle(t.demoPage);setSaved(false);setProducts([{id:1,name:lang==='es'?'Café de ejemplo':'Sample coffee',price:3.5}]);setProductName('');setProductPrice('');setOrderStep(0);setCustomer('');setBookingCreated(false);setEmployee('');setRole('');setTeam([]);setPayment('')}}>{t.reset}</button><button className="wf-training-exit" onClick={onExit}>{t.exit}</button></div></header>
    <div className="wf-training-safety" role="note"><strong>🔒 {t.sample}</strong><span>{t.safety}</span></div>
    <div className="wf-training-layout"><nav className="wf-training-menu" aria-label={lang==='es'?'Prácticas':'Practice activities'}><h3>{lang==='es'?'Escoge qué practicar':'Choose what to practice'}</h3>{t.topics.map(([id,label])=><button key={id} className={topic===id?'active':''} onClick={()=>selectTopic(id)}>{label}<span aria-hidden="true">›</span></button>)}</nav>
      <main className="wf-training-workspace"><div className="wf-training-heading"><div><small>{t.sample}</small><h3>{topic==='start'?t.startTitle:topicTitle}</h3></div>{topic!=='start'&&<span>{t.step} {Math.min(step+1,steps.length)} {t.of} {steps.length}</span>}</div>
        {topic==='start'&&<div className="wf-training-welcome"><p>{t.startText}</p><div className="wf-training-cards">{t.topics.slice(1).map(([id,label])=><button key={id} onClick={()=>selectTopic(id)}><span>＋</span><b>{label}</b><small>{lang==='es'?'Abrir práctica guiada':'Open guided practice'}</small></button>)}</div></div>}
        {topic!=='start'&&<><div className="wf-training-instruction"><span>💡</span><p>{steps[Math.min(step,steps.length-1)]}</p><div className="wf-training-progress"><i style={{width:`${progress}%`}}/></div></div>
          {topic==='website'&&<div className="wf-training-demo-card"><label>{t.pageTitle}<input value={pageTitle} onChange={e=>{setPageTitle(e.target.value);setSaved(false)}}/></label><div className="wf-training-preview"><small>{t.sample}</small><strong>{pageTitle||t.demoPage}</strong><span>{lang==='es'?'Tu página de ejemplo':'Your sample website'}</span></div><button className="wf-training-primary" onClick={()=>{setSaved(true);setStep(1)}}>{t.save}</button>{saved&&<p className="wf-training-success">✓ {t.saved}</p>}</div>}
          {topic==='catalog'&&<div className="wf-training-demo-card"><p>{t.catalogText}</p><div className="wf-training-form"><label>{t.productName}<input value={productName} onChange={e=>setProductName(e.target.value)}/></label><label>{t.price}<input type="number" min="0.01" step="0.01" value={productPrice} onChange={e=>setProductPrice(e.target.value)}/></label></div><button className="wf-training-primary" onClick={addProduct}>{t.add}</button><h4>{t.items}</h4><ul className="wf-training-list">{products.map(item=><li key={item.id}><span>{item.name}</span><b>${item.price.toFixed(2)}</b></li>)}</ul></div>}
          {topic==='orders'&&<div className="wf-training-demo-card"><p>{t.ordersText}</p><div className="wf-training-sample-order"><span>#{lang==='es'?'ORDEN-104':'ORDER-104'}</span><strong>{lang==='es'?'2 artículos de ejemplo':'2 sample items'}</strong><b>{orderLabels[orderStep]}</b></div><div className="wf-training-order-steps">{orderLabels.map((label,index)=><span key={label} className={index<=orderStep?'done':''}>{index+1}. {label}</span>)}</div><button className="wf-training-primary" disabled={orderStep>=3} onClick={()=>{setOrderStep(x=>Math.min(3,x+1));setStep(1)}}>{orderStep>=3?t.completed:t.advance}</button></div>}
          {topic==='bookings'&&<div className="wf-training-demo-card"><p>{t.bookingText}</p><div className="wf-training-form"><label>{t.customer}<input value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label>{t.service}<select value={service} onChange={e=>setService(e.target.value)}><option>{lang==='es'?'Consulta de ejemplo':'Sample consultation'}</option><option>{lang==='es'?'Corte de ejemplo':'Sample haircut'}</option><option>{lang==='es'?'Servicio de ejemplo':'Sample service'}</option></select></label><label>{t.day}<input type="date" defaultValue="2026-10-15"/></label></div><button className="wf-training-primary" disabled={!customer.trim()} onClick={()=>{setBookingCreated(true);setStep(1)}}>{t.createBooking}</button>{bookingCreated&&<p className="wf-training-success">✓ {t.bookingCreated}: {customer} · {service}</p>}</div>}
          {topic==='team'&&<div className="wf-training-demo-card"><p>{t.teamText}</p><div className="wf-training-form"><label>{t.employee}<input value={employee} onChange={e=>setEmployee(e.target.value)}/></label><label>{t.role}<input value={role} onChange={e=>setRole(e.target.value)}/></label></div><button className="wf-training-primary" onClick={addTeamMember}>{t.addEmployee}</button>{team.length>0&&<ul className="wf-training-list">{team.map((member,index)=><li key={`${member.name}-${index}`}><span>{member.name}</span><b>{member.role}</b></li>)}</ul>}</div>}
          {topic==='payments'&&<div className="wf-training-demo-card"><p>{t.paymentsText}</p><div className="wf-training-payment-options">{[[t.card,'💳'],[t.cash,'💵'],[t.ath,'📱']].map(([name,icon])=><button key={name} className={payment===name?'active':''} onClick={()=>{setPayment(name);setStep(1)}}><span>{icon}</span>{name}</button>)}</div>{payment&&<p className="wf-training-success">✓ {t.choose}: {payment}. {t.payNotice}</p>}</div>}
          <footer className="wf-training-tour-nav"><button disabled={step===0} onClick={()=>setStep(x=>Math.max(0,x-1))}>← {t.previous}</button><span>{step>=steps.length?t.tourDone:`${t.step} ${Math.min(step+1,steps.length)} ${t.of} ${steps.length}`}</span><button onClick={()=>setStep(x=>Math.min(steps.length,x+1))}>{step>=steps.length?t.done:t.next} →</button></footer>
        </>}
      </main>
    </div>
  </section>
}
