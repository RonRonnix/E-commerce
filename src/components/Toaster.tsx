import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: number; message: string; clickable?: boolean; onClick?: () => void }
type ToastCtx = { show: (message: string, opts?: { clickable?: boolean; onClick?: () => void }) => void }

const Ctx = createContext<ToastCtx | undefined>(undefined)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, opts?: { clickable?: boolean; onClick?: () => void }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, clickable: opts?.clickable, onClick: opts?.onClick }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map(t => (
          <button
            key={t.id}
            className={`text-left px-4 py-2 rounded-md shadow-md border bg-white animate-[toastIn_140ms_ease-out] ${t.clickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
            onClick={() => {
              setToasts(prev => prev.filter(x => x.id !== t.id))
              t.onClick?.()
            }}
          >
            {t.message}
          </button>
        ))}
      </div>
      {/* Keyframes via inline style tag for minimal footprint */}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Ctx.Provider>
  )
}

export function useToaster() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToaster must be used within ToasterProvider')
  return ctx
}
