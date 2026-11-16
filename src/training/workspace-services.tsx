import {createContext, useContext, useMemo, type ReactNode} from 'react'
import {requestJson} from '../../shared/http-client.mjs'

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
    return (url,options)=>requestJson(url,{credentials:'include',...options},{fetcher:practiceFetch||browserFetch,retry:false})
  }, [practiceFetch])
}

const WorkspacePaused = createContext(false)
export const WorkspaceActivityProvider=WorkspacePaused.Provider
export const useWorkspacePaused=()=>useContext(WorkspacePaused)
