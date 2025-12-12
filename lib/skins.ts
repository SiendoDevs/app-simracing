import fs from 'node:fs'
import path from 'node:path'

const SKINS_ROOT_FS = path.join(process.cwd(), 'public', 'assets', 'skins')

function normalize(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function resolveSkinFolder(skin?: string): string | undefined {
  if (!skin) return undefined
  // Simple alias cleanup
  const cleaned = skin.replace(/\s*-\s*copia$/i, '')
  let folders: string[] = []
  try {
    folders = fs.readdirSync(SKINS_ROOT_FS).filter((f) => fs.statSync(path.join(SKINS_ROOT_FS, f)).isDirectory())
  } catch {
    return undefined
  }
  const nTarget = normalize(cleaned)
  // Exact match first
  const exact = folders.find((f) => f === cleaned)
  if (exact) return exact
  // Case-insensitive/normalized match
  const byNorm = folders.find((f) => normalize(f) === nTarget || normalize(f).includes(nTarget) || nTarget.includes(normalize(f)))
  return byNorm
}

export function resolveSkinImage(skin?: string): string | undefined {
  const folder = resolveSkinFolder(skin)
  if (!folder) return undefined
  const base = path.join(SKINS_ROOT_FS, folder)
  const livery = path.join(base, 'livery.png')
  const liveryJpg = path.join(base, 'livery.jpg')
  const preview = path.join(base, 'preview.jpg')
  const previewPng = path.join(base, 'preview.png')
  const folderUrl = encodeURIComponent(folder)
  if (fs.existsSync(preview)) return `/assets/skins/${folderUrl}/preview.jpg`
  if (fs.existsSync(previewPng)) return `/assets/skins/${folderUrl}/preview.png`
  if (fs.existsSync(livery)) return `/assets/skins/${folderUrl}/livery.png`
  if (fs.existsSync(liveryJpg)) return `/assets/skins/${folderUrl}/livery.jpg`
  return undefined
}

function normalizeName(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
}

export function resolveSkinImageFor(skin?: string, driverName?: string): string | undefined {
  if (!driverName && !skin) return undefined
  let folders: string[] = []
  try {
    folders = fs.readdirSync(SKINS_ROOT_FS).filter((f) => fs.statSync(path.join(SKINS_ROOT_FS, f)).isDirectory())
  } catch {
    return undefined
  }
  if (driverName) {
    const target = normalizeName(driverName)
    for (const f of folders) {
      const ui = path.join(SKINS_ROOT_FS, f, 'ui_skin.json')
      try {
        if (fs.existsSync(ui)) {
          const raw = JSON.parse(fs.readFileSync(ui, 'utf-8')) as Record<string, unknown>
          const dn = typeof raw['drivername'] === 'string' ? raw['drivername'] : undefined
          if (dn && normalizeName(dn) === target) {
            const base = path.join(SKINS_ROOT_FS, f)
            const livery = path.join(base, 'livery.png')
            const liveryJpg = path.join(base, 'livery.jpg')
            const preview = path.join(base, 'preview.jpg')
            const previewPng = path.join(base, 'preview.png')
            const fUrl = encodeURIComponent(f)
            if (fs.existsSync(preview)) return `/assets/skins/${fUrl}/preview.jpg`
            if (fs.existsSync(previewPng)) return `/assets/skins/${fUrl}/preview.png`
            if (fs.existsSync(livery)) return `/assets/skins/${fUrl}/livery.png`
            if (fs.existsSync(liveryJpg)) return `/assets/skins/${fUrl}/livery.jpg`
          }
        }
      } catch {}
    }
  }
  const direct = resolveSkinImage(skin)
  if (direct) return direct
  for (const f of folders) {
    const ui = path.join(SKINS_ROOT_FS, f, 'ui_skin.json')
    try {
      if (fs.existsSync(ui)) {
        const raw = JSON.parse(fs.readFileSync(ui, 'utf-8')) as Record<string, unknown>
        const dn = typeof raw['drivername'] === 'string' ? raw['drivername'] : undefined
        if (driverName && dn && normalizeName(dn) === normalizeName(driverName)) {
          const base = path.join(SKINS_ROOT_FS, f)
          const livery = path.join(base, 'livery.png')
          const liveryJpg = path.join(base, 'livery.jpg')
          const preview = path.join(base, 'preview.jpg')
          const previewPng = path.join(base, 'preview.png')
          const fUrl = encodeURIComponent(f)
          if (fs.existsSync(preview)) return `/assets/skins/${fUrl}/preview.jpg`
          if (fs.existsSync(previewPng)) return `/assets/skins/${fUrl}/preview.png`
          if (fs.existsSync(livery)) return `/assets/skins/${fUrl}/livery.png`
          if (fs.existsSync(liveryJpg)) return `/assets/skins/${fUrl}/livery.jpg`
        }
      }
    } catch {}
  }
  // Fallback: match by folder name containing driver name
  const nDriver = driverName ? normalize(driverName) : ''
  for (const f of folders) {
    const nFolder = normalize(f)
    if (nDriver && (nFolder.includes(nDriver) || nDriver.includes(nFolder))) {
      const base = path.join(SKINS_ROOT_FS, f)
      const livery = path.join(base, 'livery.png')
      const liveryJpg = path.join(base, 'livery.jpg')
      const preview = path.join(base, 'preview.jpg')
      const previewPng = path.join(base, 'preview.png')
      const fUrl = encodeURIComponent(f)
      if (fs.existsSync(preview)) return `/assets/skins/${fUrl}/preview.jpg`
      if (fs.existsSync(previewPng)) return `/assets/skins/${fUrl}/preview.png`
      if (fs.existsSync(livery)) return `/assets/skins/${fUrl}/livery.png`
      if (fs.existsSync(liveryJpg)) return `/assets/skins/${fUrl}/livery.jpg`
    }
  }
  // Fallback: match by number token inside folder name if present in skin or driver
  const numberFromSkin = typeof skin === 'string' ? (skin.match(/\d{1,3}/)?.[0] ?? undefined) : undefined
  const numberFromName = driverName ? driverName.match(/\d{1,3}/)?.[0] ?? undefined : undefined
  const numberToken = numberFromSkin ?? numberFromName
  if (numberToken) {
    for (const f of folders) {
      if (f.includes(numberToken)) {
        const base = path.join(SKINS_ROOT_FS, f)
        const livery = path.join(base, 'livery.png')
        const liveryJpg = path.join(base, 'livery.jpg')
        const preview = path.join(base, 'preview.jpg')
        const previewPng = path.join(base, 'preview.png')
        const fUrl = encodeURIComponent(f)
        if (fs.existsSync(preview)) return `/assets/skins/${fUrl}/preview.jpg`
        if (fs.existsSync(previewPng)) return `/assets/skins/${fUrl}/preview.png`
        if (fs.existsSync(livery)) return `/assets/skins/${fUrl}/livery.png`
        if (fs.existsSync(liveryJpg)) return `/assets/skins/${fUrl}/livery.jpg`
      }
    }
  }
  return undefined
}

export function resolveSkinTeam(skin?: string, driverName?: string): string | undefined {
  // Try by explicit skin folder
  const folder = resolveSkinFolder(skin)
  if (folder) {
    const ui = path.join(SKINS_ROOT_FS, folder, 'ui_skin.json')
    try {
      if (fs.existsSync(ui)) {
        const raw = JSON.parse(fs.readFileSync(ui, 'utf-8')) as Record<string, unknown>
        const team = typeof raw['team'] === 'string' ? (raw['team'] as string) : undefined
        if (team) return team
      }
    } catch {}
  }
  if (!driverName) return undefined
  // Search all folders by driver name
  let folders: string[] = []
  try {
    folders = fs.readdirSync(SKINS_ROOT_FS).filter((f) => fs.statSync(path.join(SKINS_ROOT_FS, f)).isDirectory())
  } catch {
    return undefined
  }
  const target = normalizeName(driverName)
  for (const f of folders) {
    const ui = path.join(SKINS_ROOT_FS, f, 'ui_skin.json')
    try {
      if (fs.existsSync(ui)) {
        const raw = JSON.parse(fs.readFileSync(ui, 'utf-8')) as Record<string, unknown>
        const dn = typeof raw['drivername'] === 'string' ? (raw['drivername'] as string) : undefined
        if (dn && normalizeName(dn) === target) {
          const team = typeof raw['team'] === 'string' ? (raw['team'] as string) : undefined
          if (team) return team
        }
      }
    } catch {}
  }
  return undefined
}

export function resolveSkinNumber(skin?: string, driverName?: string): string | undefined {
  // Prefer matching by driver name first (reads ui_skin.json across folders)
  if (driverName) {
    let folders: string[] = []
    try {
      folders = fs.readdirSync(SKINS_ROOT_FS).filter((f) => fs.statSync(path.join(SKINS_ROOT_FS, f)).isDirectory())
    } catch {
      folders = []
    }
    const target = normalizeName(driverName)
    for (const f of folders) {
      const ui = path.join(SKINS_ROOT_FS, f, 'ui_skin.json')
      try {
        if (fs.existsSync(ui)) {
          const raw = JSON.parse(fs.readFileSync(ui, 'utf-8')) as Record<string, unknown>
          const dn = typeof raw['drivername'] === 'string' ? (raw['drivername'] as string) : undefined
          if (dn && normalizeName(dn) === target) {
            const num = typeof raw['number'] === 'string' ? (raw['number'] as string) : typeof raw['number'] === 'number' ? String(raw['number']) : undefined
            if (num) return num
          }
        }
      } catch {}
    }
  }
  // If not found by name, try explicit skin folder
  const folder = resolveSkinFolder(skin)
  if (folder) {
    const ui = path.join(SKINS_ROOT_FS, folder, 'ui_skin.json')
    try {
      if (fs.existsSync(ui)) {
        const raw = JSON.parse(fs.readFileSync(ui, 'utf-8')) as Record<string, unknown>
        const num = typeof raw['number'] === 'string' ? (raw['number'] as string) : typeof raw['number'] === 'number' ? String(raw['number']) : undefined
        if (num) return num
      }
    } catch {}
  }
  // Fallbacks
  if (driverName) {
    const numberFromName = driverName.match(/\d{1,3}/)?.[0] ?? undefined
    if (numberFromName) return numberFromName
  }
  return undefined
}
