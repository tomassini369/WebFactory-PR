import { useEffect } from 'react'
import { feedback } from './feedback'

const interactiveSelector = 'button:not(:disabled), a[href], [role="tab"], [role="switch"], input[type="checkbox"], input[type="radio"]'

function handleInteraction(target: EventTarget | null) {
  if (!(target instanceof Element)) return
  if (target.closest('[data-feedback-ignore], textarea, select, input:not([type="checkbox"]):not([type="radio"]), [contenteditable="true"]')) return
  const interactive = target.closest(interactiveSelector)
  const labelledControl = (target.closest('label') as HTMLLabelElement | null)?.control
  const labelCheckbox = labelledControl instanceof HTMLInputElement && ['checkbox', 'radio'].includes(labelledControl.type) ? labelledControl : null
  if (!interactive && labelCheckbox && !labelCheckbox.disabled) {
    feedback.toggle()
    return
  }
  if (!interactive || interactive.matches(':disabled') || interactive.getAttribute('aria-disabled') === 'true') return
  feedback.tap()
}

export function useFeedbackExperience() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => handleInteraction(event.target)
    const onClick = (event: MouseEvent) => {
      // Keyboard activated controls have no preceding pointerdown event.
      if (event.detail === 0) handleInteraction(event.target)
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    document.addEventListener('click', onClick, { capture: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [])
}
