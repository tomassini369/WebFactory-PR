import {createContext, useContext, useMemo, type ReactNode} from 'react'
import {withAuthRetry} from '../auth-retry'

export type WorkspaceFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>
export type WorkspaceApi = (url: string, options?: RequestInit) => Promise<any>
const browserFetch: WorkspaceFetch = (input, init) => globalThis.fetch(input, init)
const WorkspaceServices = createContext<WorkspaceFetch | null>(null)

// Only the explicitly mounted practice tree receives a local transport. Live
// components keep the browser transport and the existing authentication retry.
export function WorkspaceServicesProvider({fetch, children}: {fetch: WorkspaceFetch; children: ReactNode}) {
  return <WorkspaceServices.Provider value={fetch}>{children}</WorkspaceServices.Provider>
}
export function useWorkspaceFetch(): WorkspaceFetch {
  return useContext(WorkspaceServices) || browserFetch
}
export function useWorkspaceApi(): WorkspaceApi {
  const practiceFetch = useContext(WorkspaceServices)
  return useMemo(() => {
    const request: WorkspaceApi = async (url, options) => {
      const response = await (practiceFetch || browserFetch)(url, {credentials: 'include', cache: 'no-store', ...options})
      const result = await response.json()
      if (!response.ok || result.ok === false) throw Object.assign(new Error(result.message || 'Request failed.'), {code: typeof result.code === 'string' ? result.code : '', status: response.status})
      return result
    }
    return practiceFetch ? request : (url, options) => withAuthRetry(() => request(url, options))
  }, [practiceFetch])
}

const WorkspacePaused = createContext(false)
export const WorkspaceActivityProvider=WorkspacePaused.Provider
export const useWorkspacePaused=()=>useContext(WorkspacePaused)
