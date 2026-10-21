import {createContext,useContext} from 'react'
import type {User} from './portal-auth'

// Undefined means no gate; null is a server-confirmed signed-out session.
export const PortalSessionContext=createContext<User|null|undefined>(undefined)
export const usePortalSession=()=>useContext(PortalSessionContext)
