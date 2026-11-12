import type {WorkspaceFetch} from './training/workspace-services'

export async function displayRequest(transport: WorkspaceFetch, options?: RequestInit) {
  const controller = options?.signal ? null : new AbortController()
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : undefined
  try {
    const response = await transport('/.netlify/functions/client-customer-display', {
      credentials:'include',cache:'no-store',...options,signal:options?.signal||controller?.signal,
    })
    const data = await response.json()
    if (!response.ok) throw Object.assign(new Error(data.message||'Display unavailable / Pantalla no disponible.'),{status:response.status})
    return data
  } finally { clearTimeout(timer) }
}
