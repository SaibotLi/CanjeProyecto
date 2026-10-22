import {createContext,useContext} from 'react'
import type {Business} from './businessData'
export type BusinessState={business:Business;checking:boolean;refreshError:boolean;reload:()=>void}
export const BusinessContext=createContext<BusinessState|null>(null)
export const useBusinessOptional=()=>useContext(BusinessContext)
export function useBusiness(){const value=useBusinessOptional();if(!value)throw new Error('Se requiere contexto de comercio.');return value}
