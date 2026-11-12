/** Serialize background refreshes and suspend them while the page is hidden/offline.
 * Callers keep their existing transport, authorization and error presentation.
 * Explicit refreshes coalesce while a request is running (for example POS edits).
 */
export function startVisiblePolling(task: (signal: AbortSignal) => Promise<unknown>, intervalMs: number, {immediate = true, timeoutMs = 0, wakeIntervalMs = 1000} = {}) {
  let controller: AbortController | undefined
  let stopped = false, running = false, pending = false, lastStart = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  const available = () => !stopped && document.visibilityState === 'visible' && navigator.onLine !== false
  const clear = () => { clearTimeout(timer); timer = undefined }
  const schedule = () => { clear(); if (available()) timer = setTimeout(() => void run(), intervalMs) }
  const run = async () => {
    if (!available() || running) return
    clear(); running = true; pending = false; lastStart = Date.now()
    const request = controller = new AbortController()
    const timeout = timeoutMs > 0 ? setTimeout(() => request.abort(), timeoutMs) : undefined
    try { await task(request.signal) }
    catch { /* The caller reports errors; a failed refresh must not kill reconnection. */ }
    finally {
      clearTimeout(timeout); controller = undefined; running = false
      if (pending && available()) void run()
      else schedule()
    }
  }
  const refresh = () => {
    if (!available()) return
    if (running) pending = true
    else void run()
  }
  const wake = () => {
    if (!available()) { clear(); return }
    if (running) return
    // Focus, visibility and online events often arrive together.
    if (Date.now() - lastStart >= wakeIntervalMs) void run()
    else if (!timer) schedule()
  }
  document.addEventListener('visibilitychange', wake)
  window.addEventListener('focus', wake)
  window.addEventListener('online', wake)
  window.addEventListener('offline', wake)
  if (immediate) void run()
  else schedule()
  return {
    refresh,
    stop() {
      stopped = true; pending = false; clear(); controller?.abort()
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
      window.removeEventListener('online', wake)
      window.removeEventListener('offline', wake)
    },
  }
}
