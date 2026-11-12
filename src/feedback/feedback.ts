export type FeedbackPreferences = { hapticsEnabled: boolean }

const STORAGE_KEY = 'webfactory:feedback:v1'
const CHANGE_EVENT = 'webfactory-feedback-preferences-change'
const defaults: FeedbackPreferences = { hapticsEnabled: true }

function readPreferences(): FeedbackPreferences {
  if (typeof window === 'undefined') return defaults
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Partial<FeedbackPreferences> | null
    return { hapticsEnabled: value?.hapticsEnabled !== false }
  } catch {
    return defaults
  }
}

let preferences = readPreferences()
let lastHapticAt = 0

function vibrate(kind: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') {
  if (!preferences.hapticsEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  const now = performance.now()
  if (now - lastHapticAt < 75) return
  lastHapticAt = now
  const patterns: Record<typeof kind, number | number[]> = {
    light: 9,
    medium: 17,
    success: [10, 35, 12],
    warning: [14, 35, 8],
    error: [22, 45, 22],
  }
  try { navigator.vibrate(patterns[kind]) } catch { /* Unsupported or denied. */ }
}

export const feedback = {
  tap() { vibrate('light') },
  toggle() { vibrate('light') },
  navigate() { vibrate('light') },
  success() { vibrate('success') },
  warning() { vibrate('warning') },
  error() { vibrate('error') },
  vibrate,
  getPreferences: () => ({ ...preferences }),
  setHapticsEnabled(enabled: boolean) {
    preferences = { hapticsEnabled: enabled }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // The current tab still honors the preference when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preferences }))
  },
  subscribe(listener: (value: FeedbackPreferences) => void) {
    const onChange = (event: Event) => listener((event as CustomEvent<FeedbackPreferences>).detail)
    const onStorage = () => { preferences = readPreferences(); listener({ ...preferences }) }
    window.addEventListener(CHANGE_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  },
}

export const FEEDBACK_SETTINGS_STORAGE_KEY = STORAGE_KEY
