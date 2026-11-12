import { useEffect, useState } from 'react'
import { Vibrate } from 'lucide-react'
import { feedback, type FeedbackPreferences as Preferences } from './feedback'

export function FeedbackPreferences({ lang }: { lang: 'es' | 'en' }) {
  const [preferences, setPreferences] = useState<Preferences>(() => feedback.getPreferences())
  useEffect(() => feedback.subscribe(setPreferences), [])
  const es = lang === 'es'
  return <div className="wf-feedback-preferences" role="group" aria-label={es ? 'Preferencias de experiencia' : 'Experience preferences'}>
    <button type="button" aria-label={es ? `Háptico: ${preferences.hapticsEnabled ? 'On' : 'Off'}` : `Haptics: ${preferences.hapticsEnabled ? 'On' : 'Off'}`} title={es?'Respuesta háptica':'Haptic feedback'} data-feedback-ignore aria-pressed={preferences.hapticsEnabled} onClick={() => { feedback.toggle(); feedback.setHapticsEnabled(!preferences.hapticsEnabled) }}>
      <Vibrate size={18} aria-hidden="true"/>
    </button>
  </div>
}
