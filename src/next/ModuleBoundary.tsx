import {Component,type ReactNode} from 'react'

export default class ModuleBoundary extends Component<{children:ReactNode;lang:'es'|'en'}, {failed:boolean}> {
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){
  if(!this.state.failed)return this.props.children
  const es=this.props.lang==='es'
  return <section className="nx-panel nx-module-error" role="alert"><p className="nx-eyebrow">WebFactory PR Next</p><h1>{es?'Este módulo no pudo abrirse.':'This module could not open.'}</h1><p>{es?'Tus cambios guardados siguen en este navegador. Puedes intentar nuevamente o elegir otro módulo.':'Your saved changes remain in this browser. Retry or choose another module.'}</p><button className="nx-primary" onClick={()=>this.setState({failed:false})}>{es?'Volver a intentar':'Try again'}</button><a href="#overview">{es?'Ir al resumen':'Go to overview'}</a></section>
 }
}
