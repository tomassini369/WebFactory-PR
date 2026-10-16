import {createContext, useContext} from 'react'
import type {PracticeRuntime} from './practice-runtime.mjs'
export const PracticeContext = createContext<PracticeRuntime | null>(null)
export const usePractice = () => useContext(PracticeContext)
