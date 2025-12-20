import { useEffect } from 'react'

export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-[92%] max-w-sm rounded-lg border bg-white p-4 shadow-lg">
        <div className="text-lg font-medium">{title}</div>
        {message && <div className="mt-1 text-sm text-gray-600">{message}</div>}
        <div className="mt-4 flex justify-end gap-3">
          <button className="px-3 py-1.5 rounded-md border transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={onCancel}>{cancelText}</button>
          <button className="px-3 py-1.5 rounded-md bg-black text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
