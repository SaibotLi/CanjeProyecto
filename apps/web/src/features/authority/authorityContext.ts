import { createContext, useContext } from 'react'
import type { AuthorityState, AuthorityStore } from './authorityStore'
import {useBusinessOptional} from '../business/businessContext'
import {scopeAuthority} from './authorityData'
export const AuthorityContext = createContext<(AuthorityState & { store: AuthorityStore }) | null>(null)
export function useAuthority() {
  const value = useContext(AuthorityContext)
  const context=useBusinessOptional()
  if (!value) throw new Error('AuthorityProvider requerido.')
  return context&&value.data?{...value,data:scopeAuthority(value.data,context.business.id)}:value
}
