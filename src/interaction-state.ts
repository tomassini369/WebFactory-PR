import { useEffect, useRef } from 'react'

type Draft = { discard: () => void; es: boolean }
const drafts = new Map<symbol, Draft>()

export function confirmLeaveDrafts() {
  if (!drafts.size) return true
  const es = [...drafts.values()].some(draft => draft.es)
  if (!window.confirm(es ? 'Tienes cambios sin guardar. ¿Descartarlos y salir? Pulsa Cancelar para seguir editando o guardar.' : 'You have unsaved changes. Discard them and leave? Choose Cancel to keep editing or save.')) return false
  for (const draft of drafts.values()) draft.discard()
  drafts.clear()
  return true
}

/** Register only editable drafts, never passwords, filters or automatically saved fields. */
export function useUnsavedChanges(value: unknown, revision: unknown, discard: (original: any) => void, lang: string, persistedValue?: unknown) {
  const original = useRef({ revision, value, serialized: JSON.stringify(value) })
  if (original.current.revision !== revision) {
    const baseline = persistedValue === undefined ? value : persistedValue
    original.current = { revision, value: baseline, serialized: JSON.stringify(baseline) }
  }
  const key = useRef(Symbol('draft'))
  const dirty = JSON.stringify(value) !== original.current.serialized
  useEffect(() => {
    if (dirty) drafts.set(key.current, { discard: () => discard(original.current.value), es: lang === 'es' })
    else drafts.delete(key.current)
    const id = key.current
    return () => { drafts.delete(id) }
  }, [dirty, discard, lang, revision])
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => { if(drafts.size){event.preventDefault(); event.returnValue = ''} }
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') as HTMLAnchorElement | null : null
      if (event.defaultPrevented || !link || link.target === '_blank' || link.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || (new URL(link.href).origin === location.origin && new URL(link.href).pathname === location.pathname && new URL(link.href).search === location.search && new URL(link.href).hash)) return
      if (!confirmLeaveDrafts()) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', navigate, true)
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true) }
  }, [dirty])
  return dirty
}
