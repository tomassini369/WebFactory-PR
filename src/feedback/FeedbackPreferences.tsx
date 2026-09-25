import { useEffect, useState } from 'react'
import { feedback, type FeedbackPreferences as Preferences } from './feedback'

export function FeedbackPreferences({ lang }: { lang: 'es' | 'en' }) {
  const [preferences, setPreferences] = useState<Preferences>(() => feedback.getPreferences())
  useEffect(() => feedback.subscribe(setPreferences), [])
  const es = lang === 'es'
  return <div className="wf-feedback-preferences" role="group" aria-label={es ? 'Preferencias de experiencia' : 'Experience preferences'}>
    <button type="button" data-feedback-ignore aria-pressed={preferences.soundEnabled} onClick={() => { const enabled = !preferences.soundEnabled; feedback.vibrate('light'); feedback.setSoundEnabled(enabled); if (enabled) feedback.unlockAudio('toggle') }}>
      {es ? `Efectos de sonido: ${preferences.soundEnabled ? 'On' : 'Off'}` : `Sound Effects: ${preferences.soundEnabled ? 'On' : 'Off'}`}
    </button>
    <button type="button" data-feedback-ignore aria-pressed={preferences.hapticsEnabled} onClick={() => { feedback.toggle(); feedback.setHapticsEnabled(!preferences.hapticsEnabled) }}>
      {es ? `Háptico: ${preferences.hapticsEnabled ? 'On' : 'Off'}` : `Haptics: ${preferences.hapticsEnabled ? 'On' : 'Off'}`}
    </button>
  </div>
}
