import {createContext,useContext,type ReactNode} from 'react'
const PreviewAsset=createContext<((siteId:string,key:string)=>string)|null>(null)
export function KioskAssetProvider({resolve,children}:{resolve:(siteId:string,key:string)=>string;children:ReactNode}){return <PreviewAsset.Provider value={resolve}>{children}</PreviewAsset.Provider>}
export function useKioskAsset(){const resolve=useContext(PreviewAsset);return (siteId:string,key:string)=>resolve?resolve(siteId,key):`/.netlify/functions/client-asset?siteId=${encodeURIComponent(siteId)}&key=${encodeURIComponent(key)}`}
