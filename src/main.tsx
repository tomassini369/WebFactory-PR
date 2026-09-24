import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme'
import './styles.css'
import './theme.css'

const adminPwaRoutes: Record<string, string> = {
  '/webfactory-admin': '/manifest-webfactory-admin.webmanifest',
  '/client-admin': '/manifest-client-admin.webmanifest',
}

function configureInstallableApp() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const adminManifest = adminPwaRoutes[path]
  if (!adminManifest) return

  document.getElementById('app-manifest')?.setAttribute('href', adminManifest)
  document.getElementById('application-name')?.setAttribute('content', 'Admin/Log In')
  document.getElementById('apple-mobile-web-app-title')?.setAttribute('content', 'Admin/Log In')
  document.getElementById('apple-touch-icon')?.setAttribute('href', '/apple-touch-icon-clean.png?v=4')
  document.getElementById('app-icon')?.setAttribute('href', '/icon-clean-192.png?v=4')
  document.title = 'Admin/Log In | WebFactory PR'
}

configureInstallableApp()

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
