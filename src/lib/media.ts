export function assetUrl(input?: string | null): string | undefined {
  if (!input) return undefined
  // Already absolute
  if (/^https?:\/\//i.test(input)) return input
  // For server-hosted uploads, prefix with API origin in dev
  if (input.startsWith('/uploads/')) {
    const envOrigin = (import.meta as any).env?.VITE_API_ORIGIN as string | undefined
    let base = envOrigin
    if (!base && typeof window !== 'undefined') {
      // Heuristic: if running Vite dev default port, point to backend default port
      const isVite = window.location.port === '5173'
      base = isVite ? 'http://localhost:4000' : ''
    }
    return `${base || ''}${input}`
  }
  // Otherwise return as-is
  return input
}

// Lightweight placeholder without external requests. Renders a gray square.
export function placeholderSvg(width = 40, height = 40, color = '#e5e7eb'): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><rect width='100%' height='100%' fill='${color}'/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function placeholderImg(seed: string | number = 'ph', width = 48, height = 48): string {
  const s = encodeURIComponent(String(seed))
  return `https://picsum.photos/seed/${s}/${width}/${height}`
}
