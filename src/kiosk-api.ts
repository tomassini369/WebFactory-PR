import {useCallback} from 'react'
import {useWorkspaceFetch, type WorkspaceFetch} from './training/workspace-services'
export async function kioskRequest(input?: unknown, transport:WorkspaceFetch=(input,init)=>fetch(input,init)) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000)
  try {
    const admin = input && typeof input === 'object' && 'action' in input && input.action === 'admin'
    const endpoint = admin ? `/.netlify/functions/client-kiosk?action=admin&siteId=${encodeURIComponent(String('siteId' in input ? input.siteId : ''))}` : '/.netlify/functions/client-kiosk'
    const response = await transport(endpoint, { credentials: 'include', cache: 'no-store', signal: controller.signal,
      ...(input && !admin ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) } : {}) })
    const data = await response.json()
    if (!response.ok) throw Object.assign(new Error(data.message || 'Kiosk unavailable / Kiosco no disponible.'), { status: response.status })
    return data
  } finally { clearTimeout(timer) }
}

export function useKioskRequest(){
 const fetch=useWorkspaceFetch()
 return useCallback((input?:unknown)=>kioskRequest(input,fetch),[fetch])
}
