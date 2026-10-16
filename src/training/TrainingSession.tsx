import {Component,useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {highlightControl,type Spotlight} from './nonmodal-spotlight'
import {Check,Pause,Play,Target,X} from 'lucide-react'
import ClientAdminPage from '../ClientAdminPage'
import Kiosk from '../Kiosk'
import CustomerDisplay from '../CustomerDisplay'
import {WorkspaceServicesProvider} from './workspace-services'
import {PracticeContext} from './practice-context'
import {createPracticeRuntime,type PracticeEvent} from './practice-runtime.mjs'
import {acceptsStep,availableCourses,localize,type Language,type TrainingScope} from './curriculum'
import {loadProgress,saveProgress,type TrainingProgress} from './progress'
import '../portal-training.css'

type Props={scope:TrainingScope;courseId:string;lang:Language;onExit:()=>void;onCourseChange?:(id:string)=>void}
export default function TrainingSession(props:Props){
 const [restartKey,setRestartKey]=useState(0)
 const restart=()=>{const progress=loadProgress(props.scope);if(progress.attempts)delete progress.attempts[props.courseId];if(progress.active?.courseId===props.courseId)progress.active=undefined;saveProgress(props.scope,progress);setRestartKey(value=>value+1)}
 const course=availableCourses(props.scope).find(course=>course.id===props.courseId)
 if(!course)return <div className="wf-training"><p role="alert">{props.lang==='es'?'Esta actividad ya no está disponible para tus permisos.':'This activity is no longer available for your permissions.'}</p><button onClick={props.onExit}>{props.lang==='es'?'Volver':'Go back'}</button></div>
 return <PracticeBoundary key={restartKey} lang={props.lang} onRestart={restart} onExit={props.onExit}><Session key={props.scope.siteId+':'+props.scope.userId+':'+props.scope.role+':'+course.id} {...props} course={course} onRestart={restart}/></PracticeBoundary>
}
function Session({scope,course,lang:initialLang,onExit,onCourseChange,onRestart}:Props&{course:ReturnType<typeof availableCourses>[number];onRestart:()=>void}){
 const discarded=useRef(false)
 const [progress]=useState(()=>loadProgress(scope)),attempt=progress.attempts?.[course.id]
 const [runtime]=useState(()=>{const runtime=createPracticeRuntime({...scope,snapshot:attempt?.snapshot});runtime.ui.portalTab ||= course.tab;return runtime})
 const [index,setIndex]=useState(attempt?.step||0),indexRef=useRef(index),[paused,setPaused]=useState(false),[surface,setSurface]=useState(runtime.surface),[lang,setLang]=useState(initialLang),[saved,setSaved]=useState(true),[notice,setNotice]=useState(''),[targetMissing,setTargetMissing]=useState(false)
 const root=useRef<HTMLDivElement>(null),coach=useRef<HTMLElement>(null),spotlight=useRef<Spotlight|null>(null),scrollOnTarget=useRef(false),progressRef=useRef<TrainingProgress>(progress),persistenceTimer=useRef<ReturnType<typeof setTimeout>|null>(null),finished=index>=course.steps.length
 const es=lang==='es',step=course.steps[index]
 const currentProps=useRef({es,onExit});currentProps.current={es,onExit}
 indexRef.current=index
 const persist=useCallback(()=>{
  if(discarded.current)return
  const current=indexRef.current,snapshot=runtime.snapshot(),completed=current>=course.steps.length
  const next:TrainingProgress={...progressRef.current,completed:[...new Set([...progressRef.current.completed,...(completed?[course.id]:[])])],attempts:{...progressRef.current.attempts,[course.id]:{step:current,snapshot}},active:completed?undefined:{courseId:course.id,step:current,snapshot}}
  progressRef.current=next;setSaved(saveProgress(scope,next))
 },[runtime,course.id,course.steps.length,scope.siteId,scope.userId,scope.role])
 useEffect(()=>{
  const title=document.title;document.body.classList.add('wf-training-running')
  return()=>{document.body.classList.remove('wf-training-running');document.title=title;spotlight.current?.destroy()}
 },[])
 useEffect(()=>{setLang(initialLang)},[initialLang])
 useLayoutEffect(()=>{
  const unsubscribe=runtime.subscribe((event:PracticeEvent)=>{
   if(event.name==='surface.changed'){setSurface(event.detail);scrollOnTarget.current=true}
   if(event.name==='exit.requested'){persist();currentProps.current.onExit();return}
   if(event.name==='navigation.blocked')setNotice(currentProps.current.es?'Ese enlace sale de la práctica y está bloqueado. Tu negocio real no cambió.':'That link leaves practice and is blocked. Your real business is unchanged.')
   const current=course.steps[indexRef.current]
   if(current&&acceptsStep(current,event,runtime)){
    indexRef.current++;setIndex(indexRef.current);setNotice(currentProps.current.es?'Acción completada.':'Action completed.');scrollOnTarget.current=true
   }
   if(persistenceTimer.current)clearTimeout(persistenceTimer.current)
   persistenceTimer.current=setTimeout(persist,150)
  })
  runtime.emit('navigation.changed',{tab:runtime.ui.portalTab})
  for(const [key,value]of Object.entries(runtime.ui))runtime.emit('ui.'+key,value)
  const pagehide=()=>persist();window.addEventListener('pagehide',pagehide)
  return()=>{unsubscribe();window.removeEventListener('pagehide',pagehide);if(persistenceTimer.current)clearTimeout(persistenceTimer.current);persist()}
 },[runtime,course,persist])
 useEffect(()=>{persist()},[index,persist])
 useEffect(()=>{
  spotlight.current?.destroy();spotlight.current=null
  if(paused||finished||!root.current||!step)return
  let disposed=false,lastElement:Element|null=null,observer:MutationObserver|null=null,timer:ReturnType<typeof setTimeout>|null=null
  const highlight=()=>{
   if(disposed)return
   const element=root.current?.querySelector(step.target)
   const visible=element instanceof HTMLElement&&element.getClientRects().length>0
   setTargetMissing(!visible)
   if(!visible||element===lastElement)return
   lastElement=element;spotlight.current?.destroy()
   spotlight.current=highlightControl(element)
   if(scrollOnTarget.current){element.scrollIntoView({block:'center',behavior:'instant'});scrollOnTarget.current=false}
  }
  const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(highlight,80)}
  observer=new MutationObserver(schedule);observer.observe(root.current,{childList:true,subtree:true})
  root.current.addEventListener('click',schedule);window.addEventListener('resize',schedule)
  highlight()
  return()=>{disposed=true;root.current?.removeEventListener('click',schedule);window.removeEventListener('resize',schedule);observer?.disconnect();if(timer)clearTimeout(timer);spotlight.current?.destroy();spotlight.current=null}
 },[index,paused,surface,finished,step?.target])
 const returnToStep=()=>{
  setNotice('');scrollOnTarget.current=true
  if(step?.target==='.sidebar-container'){const toggle=root.current?.querySelector<HTMLButtonElement>('.wf-practice-portal .ca-mobile-menu-toggle');if(toggle&&toggle.getAttribute('aria-expanded')!=='true')toggle.click();return}
  if(step?.surface){runtime.setSurface(step.surface);return}
  if(surface!=='portal')runtime.setSurface('portal')
  // Re-mounting only on explicit recovery restores the adapter checkpoint.
  runtime.emit('coach.navigate',{tab:course.tab})
 }
 const reveal=()=>{if(targetMissing){returnToStep();return}const element=root.current?.querySelector(step?.target||'');if(element instanceof HTMLElement){element.scrollIntoView({block:'center',behavior:'instant'});if(!element.matches('[tabindex],button,input,textarea,select,summary,a[href]'))element.setAttribute('tabindex','-1');element.focus({preventScroll:true})}else returnToStep()}
 const exit=()=>{persist();onExit()}
 const restart=()=>{if(confirm(es?'¿Reiniciar esta actividad? Solo se borrará su práctica actual.':'Restart this activity? Only this practice attempt will be cleared.')){discarded.current=true;onRestart()}}
 const toolbar=useMemo(()=>es?{pause:'Pausar guía',resume:'Continuar guía',exit:'Salir de Training'}:{pause:'Pause guide',resume:'Resume guide',exit:'Exit Training'},[es])
 const nextCourse=availableCourses(scope).find(candidate=>candidate.id!==course.id&&!progressRef.current.completed.includes(candidate.id))
 const acknowledge=()=>{if(step?.target==='.sidebar-container')runtime.emit('coach.navigate',{tab:course.tab});runtime.emit('guide.acknowledged',{stepId:step.id})}
 return <WorkspaceServicesProvider fetch={runtime.fetch}><PracticeContext.Provider value={runtime}>
  <div className="wf-training-session" ref={root} data-training-active={course.id} data-training-step={step?.id||'finished'} onSubmitCapture={event=>event.preventDefault()} onClickCapture={event=>{
   const anchor=(event.target as Element).closest?.('a[href]');if(!anchor)return
   const href=anchor.getAttribute('href')||''
   if(href==='#practice-display'){event.preventDefault();runtime.setSurface('display')}
   else if(href==='#practice-kiosk'){event.preventDefault();runtime.setSurface('kiosk')}
   else if(!href.startsWith('#')){event.preventDefault();runtime.emit('navigation.blocked')}
  }}>
   <aside className="wf-training-coach" ref={coach} aria-labelledby="wf-training-coach-title">
    <header className="wf-training-session-bar">
     <div><strong>{es?'Training · práctica aislada':'Training · isolated practice'}</strong><span>{es?'Sin cobros ni cambios reales':'No charges or real changes'}</span></div>
     <nav aria-label={es?'Controles del entrenamiento':'Training controls'}>
      {surface!=='portal'&&<button onClick={()=>runtime.setSurface('portal')}>{es?'Volver al portal de práctica':'Back to practice portal'}</button>}
      <button type="button" onClick={()=>{setPaused(value=>!value);setNotice('')}} aria-pressed={paused}>{paused?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}{paused?toolbar.resume:toolbar.pause}</button>
      <button type="button" onClick={exit}><X aria-hidden="true"/>{toolbar.exit}</button>
     </nav>
    </header>
    <div className="wf-training-coach-content">
     <div className="wf-training-coach-heading"><div><p>{localize(course.title,lang)} · {course.mode==='practice'?(es?'Práctica':'Practice'):(es?'Guía de consulta':'Reference guide')}</p><h2 id="wf-training-coach-title">{finished?(es?'Actividad completada':'Activity completed'):paused?(es?'Guía pausada':'Guide paused'):localize(step.title,lang)}</h2></div><span>{Math.min(index+1,course.steps.length)} / {course.steps.length}</span></div>
     <div className="wf-training-coach-body" aria-live="polite">
      {finished?<p><Check aria-hidden="true"/>{es?'Terminaste esta actividad con datos de ejemplo. Puedes volver al portal o elegir otra actividad en la biblioteca.':'You finished this activity with sample data. Return to the portal or choose another activity in the library.'}</p>:paused?<p>{es?'Puedes explorar las pantallas de práctica. Las acciones completadas se siguen guardando.':'You can explore the practice screens. Completed actions are still saved.'}</p>:<details className="wf-training-instructions" open key={index}><summary>{es?'Instrucciones del paso':'Step instructions'}</summary><p>{localize(step.instruction,lang)}</p></details>}
     </div>
     <progress max={course.steps.length} value={index} aria-label={es?'Pasos completados':'Completed steps'}/>
     <div className="wf-training-coach-actions">
      {finished?<>{nextCourse&&onCourseChange&&<button className="wf-training-primary wf-training-next" onClick={()=>{persist();onCourseChange(nextCourse.id)}}>{es?'Siguiente actividad: ':'Next activity: '}{localize(nextCourse.title,lang)}</button>}<button onClick={exit}>{es?'Volver al portal':'Back to portal'}</button></>:!paused&&<><button type="button" onClick={reveal}><Target aria-hidden="true"/>{targetMissing?(es?'Ir al paso':'Go to step'):(es?'Señalar el control':'Show the control')}</button>{step.read?<button className="wf-training-primary" disabled={targetMissing} onClick={acknowledge}>{es?'Ya lo revisé':'I reviewed this'}</button>:<span>{es?'Avanza al completar la acción indicada.':'Advances when you complete the indicated action.'}</span>}</>}
      <details className="wf-training-session-options"><summary>{es?'Opciones de práctica':'Practice options'}</summary><button type="button" onClick={restart}>{es?'Reiniciar actividad':'Restart activity'}</button><small role="status">{saved?(es?'Progreso guardado en este dispositivo':'Progress saved on this device'):(es?'No se pudo guardar; mantén abierta esta sesión.':'Could not save; keep this session open.')}</small></details>
     </div>
     {notice&&<p className="wf-training-notice" role="status">{notice}</p>}
    </div>
   </aside>
   {surface==='kiosk'?<Kiosk lang={lang} setLang={setLang} pairing={runtime.ui.kioskPaired?'':'practice.demo'}/>:surface==='display'?<CustomerDisplay lang={lang} setLang={setLang} pairing={runtime.ui.displayPaired?'':'practice.demo'}/>:<ClientAdminPage practiceStartTab={runtime.ui.portalTab||course.tab}/>}
  </div>
 </PracticeContext.Provider></WorkspaceServicesProvider>
}

class PracticeBoundary extends Component<{children:ReactNode;lang:Language;onRestart:()=>void;onExit:()=>void},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){if(!this.state.failed)return this.props.children;const es=this.props.lang==='es';return <section className="wf-training"><h2>{es?'No se pudo recuperar esta práctica':'This practice could not be restored'}</h2><p role="alert">{es?'Reinicia la actividad para cargar un ejemplo nuevo. Tu negocio real no cambió.':'Restart the activity to load a fresh example. Your real business is unchanged.'}</p><button onClick={this.props.onRestart}>{es?'Reiniciar actividad':'Restart activity'}</button><button onClick={this.props.onExit}>{es?'Volver al portal':'Back to portal'}</button></section>}
}
