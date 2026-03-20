import fs from 'node:fs'
import path from 'node:path'
import { currentChampionship } from '@/data/championships'

type RootCache = {
  rootFolder: string
  rootFs: string
  skinFolders: string[] | null
  skinFolderSet: Set<string> | null
  skinFolderByNormalized: Map<string, string> | null
  uiSkinByFolder: Map<string, Record<string, unknown> | null>
  folderByDriverName: Map<string, string> | null
  imageUrlByFolder: Map<string, string | undefined>
}

const cacheByRootFolder = new Map<string, RootCache>()

function getRootCache(rootFolder: string): RootCache {
  const existing = cacheByRootFolder.get(rootFolder)
  if (existing) return existing
  const rootFs = path.join(process.cwd(), 'public', 'assets', rootFolder)
  const cache: RootCache = {
    rootFolder,
    rootFs,
    skinFolders: null,
    skinFolderSet: null,
    skinFolderByNormalized: null,
    uiSkinByFolder: new Map(),
    folderByDriverName: null,
    imageUrlByFolder: new Map(),
  }
  cacheByRootFolder.set(rootFolder, cache)
  return cache
}

function normalize(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function getSkinFolders(rootFolder: string) {
  const cache = getRootCache(rootFolder)
  if (cache.skinFolders) return cache.skinFolders
  try {
    const folders = fs.readdirSync(cache.rootFs).filter((f) => fs.statSync(path.join(cache.rootFs, f)).isDirectory())
    cache.skinFolders = folders
    cache.skinFolderSet = new Set(folders)
    const map = new Map<string, string>()
    for (const f of folders) {
      const n = normalize(f)
      if (!map.has(n)) map.set(n, f)
    }
    cache.skinFolderByNormalized = map
    return folders
  } catch {
    cache.skinFolders = []
    cache.skinFolderSet = new Set()
    cache.skinFolderByNormalized = new Map()
    return []
  }
}

function readUiSkinForFolder(rootFolder: string, folder: string): Record<string, unknown> | null {
  const cache = getRootCache(rootFolder)
  if (cache.uiSkinByFolder.has(folder)) return cache.uiSkinByFolder.get(folder) ?? null
  const ui = path.join(cache.rootFs, folder, 'ui_skin.json')
  try {
    if (!fs.existsSync(ui)) {
      cache.uiSkinByFolder.set(folder, null)
      return null
    }
    const raw = JSON.parse(fs.readFileSync(ui, 'utf-8')) as Record<string, unknown>
    cache.uiSkinByFolder.set(folder, raw)
    return raw
  } catch {
    cache.uiSkinByFolder.set(folder, null)
    return null
  }
}

function getFolderByDriverName(rootFolder: string, driverName: string): string | undefined {
  if (!driverName) return undefined
  const cache = getRootCache(rootFolder)
  const target = normalizeName(driverName)
  if (!cache.folderByDriverName) {
    const folders = getSkinFolders(rootFolder)
    const map = new Map<string, string>()
    for (const f of folders) {
      const raw = readUiSkinForFolder(rootFolder, f)
      const dn = raw && typeof raw['drivername'] === 'string' ? (raw['drivername'] as string) : undefined
      if (!dn) continue
      const n = normalizeName(dn)
      if (!map.has(n)) map.set(n, f)
    }
    cache.folderByDriverName = map
  }
  return cache.folderByDriverName.get(target)
}

function getSkinImageUrlForFolder(rootFolder: string, folder: string): string | undefined {
  const cache = getRootCache(rootFolder)
  if (cache.imageUrlByFolder.has(folder)) return cache.imageUrlByFolder.get(folder)
  try {
    const base = path.join(cache.rootFs, folder)
    const livery = path.join(base, 'livery.png')
    const liveryJpg = path.join(base, 'livery.jpg')
    const preview = path.join(base, 'preview.jpg')
    const previewPng = path.join(base, 'preview.png')
    const folderUrl = encodeURIComponent(folder)
    const url =
      fs.existsSync(preview) ? `/assets/${rootFolder}/${folderUrl}/preview.jpg`
      : fs.existsSync(previewPng) ? `/assets/${rootFolder}/${folderUrl}/preview.png`
      : fs.existsSync(livery) ? `/assets/${rootFolder}/${folderUrl}/livery.png`
      : fs.existsSync(liveryJpg) ? `/assets/${rootFolder}/${folderUrl}/livery.jpg`
      : undefined
    cache.imageUrlByFolder.set(folder, url)
    return url
  } catch {
    cache.imageUrlByFolder.set(folder, undefined)
    return undefined
  }
}

function getRootFoldersToTry(primary?: string): string[] {
  const preferred = primary ?? currentChampionship.skinsFolder ?? 'skins'
  const out: string[] = [preferred]
  if (preferred !== 'skins') out.push('skins')
  if (preferred !== 'skins-kp') out.push('skins-kp')
  return out
}

function resolveSkinFolderInRoot(skin: string, rootFolder: string): string | undefined {
  const cleaned = skin.replace(/\s*-\s*copia$/i, '')
  const cache = getRootCache(rootFolder)
  getSkinFolders(rootFolder)
  const nTarget = normalize(cleaned)
  if (cache.skinFolderSet?.has(cleaned)) return cleaned
  return cache.skinFolderByNormalized?.get(nTarget)
}

function resolveSkinFolderWithRoot(skin?: string, skinsFolder?: string): { rootFolder: string; folder: string } | undefined {
  if (!skin) return undefined
  const roots = getRootFoldersToTry(skinsFolder)
  for (const root of roots) {
    const folder = resolveSkinFolderInRoot(skin, root)
    if (folder) return { rootFolder: root, folder }
  }
  return undefined
}

export function resolveSkinFolder(skin?: string, skinsFolder?: string): string | undefined {
  const found = resolveSkinFolderWithRoot(skin, skinsFolder)
  return found?.folder
}

export function resolveSkinImage(skin?: string, skinsEnabled?: boolean, skinsFolder?: string): string | undefined {
  if (skinsEnabled === false) return undefined
  if (skinsEnabled == null && currentChampionship.skinsEnabled === false) return undefined
  const found = resolveSkinFolderWithRoot(skin, skinsFolder)
  if (!found) return undefined
  return getSkinImageUrlForFolder(found.rootFolder, found.folder)
}

function normalizeName(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
}

export function resolveSkinImageFor(skin?: string, driverName?: string, skinsFolder?: string): string | undefined {
  if (!driverName && !skin) return undefined
  const roots = getRootFoldersToTry(skinsFolder)
  if (driverName) {
    for (const root of roots) {
      const folder = getFolderByDriverName(root, driverName)
      if (folder) {
        const url = getSkinImageUrlForFolder(root, folder)
        if (url) return url
      }
    }
  }
  const direct = resolveSkinImage(skin, undefined, skinsFolder)
  if (direct) return direct
  const nDriver = driverName ? normalize(driverName) : ''
  for (const root of roots) {
    const folders = getSkinFolders(root)
    for (const f of folders) {
      const nFolder = normalize(f)
      if (nDriver && (nFolder.includes(nDriver) || nDriver.includes(nFolder))) {
        const url = getSkinImageUrlForFolder(root, f)
        if (url) return url
      }
    }
  }
  const numberFromSkin = typeof skin === 'string' ? (skin.match(/\d{1,3}/)?.[0] ?? undefined) : undefined
  const numberFromName = driverName ? driverName.match(/\d{1,3}/)?.[0] ?? undefined : undefined
  const numberToken = numberFromSkin ?? numberFromName
  if (numberToken) {
    for (const root of roots) {
      const folders = getSkinFolders(root)
      for (const f of folders) {
        if (f.includes(numberToken)) {
          const url = getSkinImageUrlForFolder(root, f)
          if (url) return url
        }
      }
    }
  }
  return undefined
}

export function resolveSkinTeam(skin?: string, driverName?: string, skinsFolder?: string): string | undefined {
  const roots = getRootFoldersToTry(skinsFolder)
  const found = resolveSkinFolderWithRoot(skin, skinsFolder)
  if (found) {
    const raw = readUiSkinForFolder(found.rootFolder, found.folder)
    const team = raw && typeof raw['team'] === 'string' ? (raw['team'] as string) : undefined
    if (team) return team
  }
  if (!driverName) return undefined
  for (const root of roots) {
    const byDriver = getFolderByDriverName(root, driverName)
    if (byDriver) {
      const raw = readUiSkinForFolder(root, byDriver)
      const team = raw && typeof raw['team'] === 'string' ? (raw['team'] as string) : undefined
      if (team) return team
    }
  }
  return undefined
}

export function resolveSkinNumber(skin?: string, driverName?: string, skinsFolder?: string): string | undefined {
  const roots = getRootFoldersToTry(skinsFolder)
  if (driverName) {
    for (const root of roots) {
      const folder = getFolderByDriverName(root, driverName)
      if (folder) {
        const raw = readUiSkinForFolder(root, folder)
        const num = raw && typeof raw['number'] === 'string'
          ? (raw['number'] as string)
          : raw && typeof raw['number'] === 'number'
            ? String(raw['number'])
            : undefined
        if (num) return num
      }
    }
  }
  const found = resolveSkinFolderWithRoot(skin, skinsFolder)
  if (found) {
    const raw = readUiSkinForFolder(found.rootFolder, found.folder)
    const num = raw && typeof raw['number'] === 'string'
      ? (raw['number'] as string)
      : raw && typeof raw['number'] === 'number'
        ? String(raw['number'])
        : undefined
    if (num) return num
  }
  if (driverName) {
    const numberFromName = driverName.match(/\d{1,3}/)?.[0] ?? undefined
    if (numberFromName) return numberFromName
  }
  return undefined
}
