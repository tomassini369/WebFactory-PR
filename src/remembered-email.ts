// Remembering an email is optional and must never block portal authentication.
const fallback = new Map<string, string>()
type Portal = 'client' | 'admin'
const keyFor = (portal: Portal) => `webfactory-${portal}-remember-email`

export function readRememberedEmail(portal: Portal): string {
  const key = keyFor(portal)
  try { return localStorage.getItem(key) || '' }
  catch { return fallback.get(key) || '' }
}

export function rememberEmail(portal: Portal, email: string, remember: boolean): boolean {
  const key = keyFor(portal)
  if (remember) fallback.set(key, email.trim())
  else fallback.delete(key)
  try {
    if (remember) localStorage.setItem(key, email.trim())
    else localStorage.removeItem(key)
    return true
  } catch {
    // Keep the optional preference in memory when storage is denied or full.
    return false
  }
}
