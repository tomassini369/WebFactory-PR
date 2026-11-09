import {Component, type ReactNode} from 'react'

type Props = {children: ReactNode; lang: 'es' | 'en'}

export default class RouteErrorBoundary extends Component<Props, {failed: boolean; retrying: boolean}> {
  override state = {failed: false, retrying: false}
  private failedAssets: string[] = []

  static getDerivedStateFromError() {
    return {failed: true}
  }

  override componentDidCatch(error: Error) {
    console.error('Unable to render this page.', error)
    const assets = new Set<string>()
    for (const resource of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
      const url = new URL(resource.name, window.location.href)
      if (url.origin !== window.location.origin || !/^\/assets\/[^/]+\.(js|css)$/.test(url.pathname)) continue
      if (resource.responseStatus >= 400 || resource.encodedBodySize === 0 && resource.decodedBodySize === 0) assets.add(url.href)
    }
    this.failedAssets = [...assets].slice(-4)
  }

  private retry = async () => {
    if (this.state.retrying) return
    this.setState({retrying: true})
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 10000)
    try {
      // Refresh only failed same-origin assets; WebKit can retain a failed module on reload.
      await Promise.all(this.failedAssets.map(async url => {
        const response = await fetch(url, {method: 'GET', cache: 'reload', credentials: 'same-origin', signal: controller.signal})
        if (!response.ok) throw new Error(`Page asset is unavailable (${response.status}).`)
        const type = response.headers.get('Content-Type') || ''
        if (new URL(url).pathname.endsWith('.css') ? !type.includes('text/css') : !/(java|ecma)script/.test(type)) throw new Error('Page asset has an invalid content type.')
        await response.arrayBuffer()
      }))
      window.location.reload()
    } catch (error) {
      controller.abort()
      console.error('Unable to refresh page assets.', error)
      this.setState({retrying: false})
    } finally {
      window.clearTimeout(timer)
    }
  }

  override render() {
    if (!this.state.failed) return this.props.children
    const es = this.props.lang === 'es'
    return <main className="public-route-loading" role="alert">
      <div>
        <h1>{es ? 'No se pudo abrir esta pantalla.' : 'This page could not be opened.'}</h1>
        <button type="button" className="btn secondary" autoFocus disabled={this.state.retrying} aria-busy={this.state.retrying} onClick={this.retry}>
          {this.state.retrying ? (es ? 'Cargando…' : 'Loading…') : (es ? 'Reintentar cargar' : 'Retry loading')}
        </button>
      </div>
    </main>
  }
}
