export type FeedbackSound = 'tap' | 'toggle' | 'navigate' | 'success' | 'warning' | 'error' | 'section' | 'feature' | 'major'
export type FeedbackPreferences = { soundEnabled: boolean; hapticsEnabled: boolean }

const STORAGE_KEY = 'webfactory:feedback:v1'
const CHANGE_EVENT = 'webfactory-feedback-preferences-change'
const defaults: FeedbackPreferences = { soundEnabled: true, hapticsEnabled: true }
const soundCooldowns: Record<FeedbackSound, number> = {
  tap: 65, toggle: 90, navigate: 240, success: 180, warning: 180, error: 180, section: 1800, feature: 1300, major: 2200,
}
const soundProfiles: Record<FeedbackSound, { frequency: number; endFrequency?: number; duration: number; volume: number; type?: OscillatorType }> = {
  // Keep the envelope long enough to register on laptop/mobile speakers while
  // staying below 0.15 full-scale amplitude for a restrained UI sound.
  tap: { frequency: 1320, endFrequency: 1080, duration: 0.052, volume: 0.12, type: 'sine' },
  toggle: { frequency: 790, endFrequency: 1040, duration: 0.06, volume: 0.12, type: 'sine' },
  navigate: { frequency: 500, endFrequency: 900, duration: 0.13, volume: 0.12, type: 'sine' },
  success: { frequency: 740, endFrequency: 1120, duration: 0.13, volume: 0.14, type: 'sine' },
  warning: { frequency: 600, endFrequency: 500, duration: 0.09, volume: 0.1, type: 'sine' },
  error: { frequency: 410, endFrequency: 320, duration: 0.12, volume: 0.11, type: 'sine' },
  section: { frequency: 450, endFrequency: 740, duration: 0.14, volume: 0.09, type: 'sine' },
  feature: { frequency: 1000, endFrequency: 1320, duration: 0.065, volume: 0.08, type: 'sine' },
  major: { frequency: 350, endFrequency: 660, duration: 0.18, volume: 0.09, type: 'sine' },
}

function readPreferences(): FeedbackPreferences {
  if (typeof window === 'undefined') return defaults
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Partial<FeedbackPreferences> | null
    return { soundEnabled: value?.soundEnabled !== false, hapticsEnabled: value?.hapticsEnabled !== false }
  } catch {
    return defaults
  }
}

let preferences = readPreferences()
let context: AudioContext | null = null
let unlocked = false
let resumePending = false
let pendingSound: FeedbackSound | null = null
let lastHapticAt = 0
let lastSectionSoundAt = 0
let masterVolume = 1
const lastSoundAt = new Map<FeedbackSound, number>()
const activeTones = new Set<{ oscillator: OscillatorNode; gain: GainNode }>()
const sectionSounds = new Set<FeedbackSound>(['section', 'feature', 'major'])

function contextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

function audioContext(): AudioContext | null {
  if (context) return context
  const Constructor = contextConstructor()
  if (!Constructor) return null
  try {
    context = new Constructor()
    context.addEventListener('statechange', () => {
      unlocked = context?.state === 'running'
    })
    return context
  } catch {
    return null
  }
}

function refreshPreferences() {
  preferences = readPreferences()
  if (!preferences.soundEnabled) silenceAudio()
}

function silenceAudio() {
  if (!context) return
  const now = context.currentTime
  for (const tone of activeTones) {
    try {
      tone.gain.gain.cancelScheduledValues(now)
      tone.gain.gain.setValueAtTime(0, now)
      tone.oscillator.stop(now)
    } catch { /* A tone may have ended between iterations. */ }
  }
}

function setPreference(key: keyof FeedbackPreferences, enabled: boolean) {
  preferences = { ...preferences, [key]: enabled }
  if (key === 'soundEnabled' && !enabled) silenceAudio()
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // The current tab still honors the preference when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preferences }))
}

function unlockAudio(sound?: FeedbackSound) {
  if (!preferences.soundEnabled) return
  const audio = audioContext()
  if (!audio) return
  try {
    if (audio.state === 'running') {
      unlocked = true
      if (sound) play(sound)
      return
    }
    unlocked = false
    if (sound) pendingSound = sound
    if (resumePending) return
    resumePending = true
    void audio.resume().then(() => {
      resumePending = false
      unlocked = audio.state === 'running'
      const pending = pendingSound
      pendingSound = null
      if (unlocked && pending) play(pending)
    }).catch(() => { resumePending = false; pendingSound = null })
  } catch {
    // Safari or a browser policy may refuse audio. Keep feedback silent.
  }
}

function interact(sound: FeedbackSound) {
  if (preferences.soundEnabled) {
    if (unlocked) play(sound)
    else unlockAudio(sound)
  }
  vibrate('light')
}

function play(sound: FeedbackSound): boolean {
  if (!preferences.soundEnabled || masterVolume <= 0 || !unlocked || typeof document === 'undefined' || document.visibilityState === 'hidden') return false
  const audio = context
  if (!audio || audio.state !== 'running') return false
  const now = performance.now()
  const last = lastSoundAt.get(sound) || 0
  if (now - last < soundCooldowns[sound]) return false
  if (sectionSounds.has(sound) && now - lastSectionSoundAt < 1700) return false
  lastSoundAt.set(sound, now)
  try {
    const profile = soundProfiles[sound]
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const start = audio.currentTime
    oscillator.type = profile.type || 'sine'
    oscillator.frequency.setValueAtTime(profile.frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(profile.endFrequency || profile.frequency, start + profile.duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(profile.volume * masterVolume, start + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + profile.duration)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    const tone = { oscillator, gain }
    activeTones.add(tone)
    oscillator.start(start)
    oscillator.stop(start + profile.duration + 0.008)
    if (sectionSounds.has(sound)) lastSectionSoundAt = now
    oscillator.addEventListener('ended', () => {
      activeTones.delete(tone)
      oscillator.disconnect()
      gain.disconnect()
    }, { once: true })
    return true
  } catch {
    // Audio is optional; unsupported or interrupted playback must not affect UI.
    return false
  }
}

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
  tap() { interact('tap') },
  toggle() { interact('toggle') },
  navigate() { interact('navigate') },
  success() { play('success'); vibrate('success') },
  warning() { play('warning'); vibrate('warning') },
  error() { play('error'); vibrate('error') },
  sectionEnter(kind: 'section' | 'feature' | 'major' = 'section') { return play(kind) },
  unlockAudio,
  play,
  vibrate,
  getPreferences: () => ({ ...preferences }),
  setMasterVolume(value: number) { if (Number.isFinite(value)) masterVolume = Math.max(0, Math.min(1, value)) },
  getMasterVolume: () => masterVolume,
  setSoundEnabled(enabled: boolean) { setPreference('soundEnabled', enabled) },
  setHapticsEnabled(enabled: boolean) { setPreference('hapticsEnabled', enabled) },
  subscribe(listener: (value: FeedbackPreferences) => void) {
    const onChange = (event: Event) => listener((event as CustomEvent<FeedbackPreferences>).detail)
    const onStorage = () => { refreshPreferences(); listener({ ...preferences }) }
    window.addEventListener(CHANGE_EVENT, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  },
}

export const FEEDBACK_SETTINGS_STORAGE_KEY = STORAGE_KEY
