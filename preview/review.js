const frame = document.querySelector('iframe')
const params = new URLSearchParams(location.search)
let surface = params.get('surface') === 'portal' ? 'portal' : 'home'
let device = params.get('device') === 'mobile' ? 'mobile' : 'desktop'
const update = (load) => {
  document.querySelectorAll('[data-surface]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.surface === surface)))
  document.querySelectorAll('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === device)))
  frame.dataset.device = device
  frame.title = surface === 'home' ? 'Homepage de WebFactory PR' : 'Portal de ejemplo de WebFactory PR'
  // These are built, isolated preview entries. No real backend is reachable
  // through either entry's fetch adapter. A srcdoc frame supplies a real mobile
  // layout viewport, so all existing media queries and reduced-motion work.
  if (load) frame.srcdoc = pages[surface].replace('<head>', '<head><base href="/" target="_top">')
  history.replaceState(null, '', `?surface=${surface}&device=${device}`)
}
document.querySelectorAll('[data-surface]').forEach(button => button.addEventListener('click', () => { surface = button.dataset.surface; update(true) }))
document.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => { device = button.dataset.device; update(false) }))
update(true)
