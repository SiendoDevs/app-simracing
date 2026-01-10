
export const labelType = (t: string) => {
  const up = t.toUpperCase()
  if (up === 'RACE') return 'Carrera'
  if (up === 'QUALIFY') return 'Clasificación'
  if (up === 'PRACTICE') return 'Práctica'
  return t
}

export const niceTrack = (raw?: string) => {
  if (!raw) return ''
  let t = raw.replace(/[_-]+/g, ' ').trim()
  t = t.replace(/^jotracks\s*/i, '')
  t = t.replace(/\bciudadevita\b/i, 'ciudad evita')
  t = t.replace(/\bbuenosaires\b/i, 'buenos aires')
  t = t.replace(/\bmardelplata\b/i, 'mar del plata')
  const small = new Set(['del', 'de', 'la', 'las', 'los', 'y'])
  const words = t.split(/\s+/).filter(Boolean)
  const map = (w: string) => {
    const lw = w.toLowerCase()
    if (lw === 'kartodromo') return 'Kartódromo'
    if (lw === 'zarate') return 'Zárate'
    if (lw === 'zn') return 'ZN'
    if (small.has(lw)) return lw
    return lw.charAt(0).toUpperCase() + lw.slice(1)
  }
  return words.map(map).join(' ')
}
