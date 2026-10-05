import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '../styles/global.css'
import { router } from './router'
import { AuthProvider } from '../features/auth/AuthProvider'
import { createAuthStore } from '../features/auth/sessionStore'
import '../features/auth/auth.css'
import { AuthorityProvider } from '../features/authority/AuthorityProvider'
import '../features/admin/admin.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<p className="auth-status" role="status">Abriendo Valhalla…</p>)
// Attach the listener before rendering consumers or starting a Carta query.
// Lazy SDK chunk is preserved; configuration failure doesn't crash public UI.
void import('../lib/supabase').then(({ getSupabaseClient }) => createAuthStore(getSupabaseClient()))
  .catch(() => createAuthStore(null)).then(store => {
    store.connect()
    root.render(<React.StrictMode><AuthProvider store={store}><AuthorityProvider><RouterProvider router={router} /></AuthorityProvider></AuthProvider></React.StrictMode>)
  })
