import { useCallback, useEffect, useRef } from 'react'

/** Presentation only: callers update the cart immediately, independently of this flight. */
export function useFlyToCart() {
  const active = useRef(new Set<() => void>())
  useEffect(() => () => { for (const dispose of active.current) dispose() }, [])
  return useCallback((source?: HTMLElement) => {
    if (!source || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const container = source.closest('.template-catalog-card,.template-detail-modal')
    const image = container?.querySelector<HTMLImageElement>('img')
    const root = source.closest('.template-site')
    if (!image || !root || !image.currentSrc || !image.complete || !image.naturalWidth) return
    const start = image.getBoundingClientRect()
    if (!start.width || !start.height) return
    // Bound decorative work during rapid additions; no cart mutations are deferred.
    if (active.current.size >= 3) active.current.values().next().value?.()
    let actor: HTMLImageElement | undefined
    let animation: Animation | undefined
    let frame = 0
    const dispose = () => {
      cancelAnimationFrame(frame)
      animation?.cancel()
      actor?.remove()
      active.current.delete(dispose)
    }
    active.current.add(dispose)
    const src = image.currentSrc
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const destination = root.querySelector<HTMLElement>('[data-cart-flight-target]')
        if (!destination || !destination.getBoundingClientRect().width) { dispose(); return }
        const end = destination.getBoundingClientRect()
        const size = Math.min(100, start.width, start.height)
        const x = start.left + start.width / 2 - size / 2
        const y = start.top + start.height / 2 - size / 2
        const dx = end.left + end.width / 2 - size / 2 - x
        const dy = end.top + end.height / 2 - size / 2 - y
        actor = document.createElement('img')
        actor.src = src; actor.alt = ''; actor.setAttribute('aria-hidden', 'true')
        actor.className = 'wf-cart-flight'
        Object.assign(actor.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` })
        document.body.append(actor)
        animation = actor.animate([
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
          { transform: `translate3d(${dx * .5}px,${Math.min(-70, dy * .5 - 70)}px,0) scale(.7)`, opacity: .95, offset: .5 },
          { transform: `translate3d(${dx}px,${dy}px,0) scale(.18)`, opacity: 0 },
        ], { duration: 700, easing: 'cubic-bezier(.22,.8,.24,1)' })
        animation.finished.then(dispose, dispose)
      })
    })
  }, [])
}
