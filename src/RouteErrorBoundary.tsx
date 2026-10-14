import {Component,type ReactNode} from 'react'

/** A failed render or lazy chunk must offer recovery instead of an empty page. */
export default class RouteErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){
    if(!this.state.failed)return this.props.children
    const es=document.documentElement.lang==='es'
    return <main className="cs-state" role="alert"><h1>{es?'No se pudo cargar esta página':'This page could not be loaded'}</h1><p>{es?'Comprueba tu conexión y vuelve a intentarlo.':'Check your connection and try again.'}</p><button type="button" className="btn" onClick={()=>window.location.reload()}>{es?'Recargar página':'Reload page'}</button><a href="/">{es?'Volver al inicio':'Return home'}</a></main>
  }
}
