import type { MenuData } from './types'

export type MenuState = { status: 'loading' | 'error' | 'not-found' }
  | { status: 'success' | 'empty'; data: MenuData }
