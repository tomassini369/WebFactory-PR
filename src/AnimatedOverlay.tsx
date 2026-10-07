import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

/** Keep the last panel mounted for its exit, without allowing stale actions. */
export default function AnimatedOverlay({open, children}: {open: boolean; children: ReactNode}) {
  const [present, setPresent] = useState(open)
  const [lastContent, setLastContent] = useState(children)
  useLayoutEffect(() => {
    if (open) { setPresent(true); setLastContent(children) }
  }, [open, children])
  useEffect(() => {
    if (open) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPresent(false); return }
    const timer = window.setTimeout(() => setPresent(false), 200)
    return () => window.clearTimeout(timer)
  }, [open])
  if (!open && !present) return null
  return <div className="template-overlay-presence" data-state={open ? 'open' : 'closing'} inert={!open} aria-hidden={!open || undefined}>{open ? children : lastContent}</div>
}
