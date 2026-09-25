import { useEffect } from 'react'
import { feedback } from './feedback'

const interactiveSelector = 'button:not(:disabled), a[href], [role="tab"], [role="switch"], input[type="checkbox"], input[type="radio"]'

function soundFor(target: Element): 'tap' | 'toggle' | 'navigate' {
  if (target.matches('input[type="checkbox"], input[type="radio"], [role="switch"]') || target.closest('[role="switch"]')) return 'toggle'
  if (target.closest('a[href], [role="tab"]')) return 'navigate'
  return 'tap'
}

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
  const explicitSound = interactive.closest<HTMLElement>('[data-ui-sound]')?.dataset.uiSound
  // Client storefronts stay quiet by default; data-ui-sound is an explicit opt-in.
  if (/^\/sites\/[^/]+\/?$/.test(window.location.pathname) && !explicitSound) {
    feedback.vibrate('light')
    return
  }
  const sound = explicitSound === 'tap' || explicitSound === 'toggle' || explicitSound === 'navigate'
    ? explicitSound
    : soundFor(interactive)
  feedback[sound]()
}

export function useFeedbackExperience() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      feedback.unlockAudio()
      handleInteraction(event.target)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') feedback.unlockAudio()
    }
    const onClick = (event: MouseEvent) => {
      // Keyboard activated controls have no preceding pointerdown event.
      if (event.detail === 0) {
        feedback.unlockAudio()
        handleInteraction(event.target)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    document.addEventListener('keydown', onKeyDown, { capture: true })
    document.addEventListener('click', onClick, { capture: true })

    const entered = new WeakSet<Element>()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      if (reduceMotion.matches) return
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.58 || entered.has(entry.target)) continue
        const type = (entry.target as HTMLElement).dataset.scrollSound
        if (feedback.sectionEnter(type === 'feature' || type === 'major' ? type : 'section')) entered.add(entry.target)
      }
    }, { threshold: [0.58, 0.7] }) : null
    const observed = new WeakSet<Element>()
    const observeSections = (root: ParentNode) => {
      const sections = root instanceof Element && root.matches('[data-scroll-sound]')
        ? [root as HTMLElement, ...root.querySelectorAll<HTMLElement>('[data-scroll-sound]')]
        : [...root.querySelectorAll<HTMLElement>('[data-scroll-sound]')]
      sections.forEach((section) => {
        if (!observed.has(section)) {
          observed.add(section)
          observer?.observe(section)
        }
      })
      return sections.length
    }
    const hasInitialSections = observeSections(document)
    let mutations: MutationObserver | null = null
    let mutationTimeout: number | undefined
    if (!hasInitialSections && 'MutationObserver' in window) {
      mutations = new MutationObserver((records) => {
        let found = false
        for (const record of records) {
          record.addedNodes.forEach((node) => {
            if (node instanceof Element && (node.matches('[data-scroll-sound]') || node.querySelector('[data-scroll-sound]'))) {
              found = observeSections(node) > 0 || found
            }
          })
        }
        if (found) {
          mutations?.disconnect()
          window.clearTimeout(mutationTimeout)
        }
      })
      mutations.observe(document.body, { childList: true, subtree: true })
      mutationTimeout = window.setTimeout(() => mutations?.disconnect(), 1800)
    }

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('click', onClick, true)
      observer?.disconnect()
      mutations?.disconnect()
      window.clearTimeout(mutationTimeout)
    }
  }, [])

}
