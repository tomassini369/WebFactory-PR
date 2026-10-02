import { useLayoutEffect, useRef } from 'react'

// A small, critically damped spring. Rapid selections inherit the live position
// and velocity; no input waits for the previous transition to finish.
export function useSelectionPill(selection: string) {
  const group = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const motion = useRef({ x: 0, width: 0, vx: 0, vw: 0, targetX: 0, targetWidth: 0, initialized: false })

  useLayoutEffect(() => {
    const container = group.current
    const marker = pill.current
    if (!container || !marker) return
    const state = motion.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let last = 0
    const paint = () => {
      marker.style.transform = `translateX(${state.x}px)`
      marker.style.width = `${Math.max(0, state.width)}px`
      marker.style.opacity = '1'
    }
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.032)
      last = now
      const spring = (position: number, velocity: number, target: number) => {
        const displacement = position - target
        const rate = 28
        const combined = velocity + rate * displacement
        const decay = Math.exp(-rate * dt)
        return [target + (displacement + combined * dt) * decay, (velocity - rate * combined * dt) * decay]
      }
      ;[state.x, state.vx] = spring(state.x, state.vx, state.targetX)
      ;[state.width, state.vw] = spring(state.width, state.vw, state.targetWidth)
      paint()
      if (Math.abs(state.x - state.targetX) + Math.abs(state.width - state.targetWidth) + Math.abs(state.vx) + Math.abs(state.vw) > 0.08) {
        frame = requestAnimationFrame(tick)
      } else {
        state.x = state.targetX; state.width = state.targetWidth
        state.vx = state.vw = 0
        paint(); frame = 0
      }
    }
    const measure = () => {
      const active = container.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      if (!active) return
      state.targetX = active.offsetLeft
      state.targetWidth = active.offsetWidth
      if (!state.initialized || reduced.matches) {
        state.x = state.targetX; state.width = state.targetWidth
        state.vx = state.vw = 0; state.initialized = true
        if (frame) cancelAnimationFrame(frame)
        frame = 0; paint()
      } else if (!frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    const resize = new ResizeObserver(measure)
    resize.observe(container)
    container.querySelectorAll('[role="tab"]').forEach(tab => resize.observe(tab))
    reduced.addEventListener('change', measure)
    measure()
    return () => {
      resize.disconnect()
      reduced.removeEventListener('change', measure)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [selection])

  return { group, pill }
}
