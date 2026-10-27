import { useEffect } from 'react'
// Static commercial document; existing same-origin Auth storage stays intact.
export function PlatformHomePage() {
  useEffect(() => {
    window.location.replace('/')
  }, [])
  return <p role="status">Abriendo inicio…</p>
}
