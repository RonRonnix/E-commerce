import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function getCookie(name: string) {
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1]
}

const originalFetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const method = (init?.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const headers = new Headers(init?.headers || {})
    const token = getCookie('csrfToken')
    if (token) headers.set('X-CSRF-Token', decodeURIComponent(token))
    return originalFetch(input, { ...init, headers, credentials: init?.credentials ?? 'include' })
  }
  return originalFetch(input, init)
}

originalFetch('/api/csrf', { credentials: 'include' }).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
