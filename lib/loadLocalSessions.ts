import type { Session } from '@/types/Session'
import { headers } from 'next/headers'
import { Redis } from '@upstash/redis'
import { parseSession } from '@/lib/parseSession'
import fs from 'node:fs'
import path from 'node:path'

export async function loadFromFilesystem(): Promise<Session[]> {
  try {
    const sessionsDir = path.join(process.cwd(), 'sessions')
    if (!fs.existsSync(sessionsDir)) return []
    
    const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.json'))
    const sessions: Session[] = []
    
    for (const file of files) {
      try {
        const fullPath = path.join(sessionsDir, file)
        const content = fs.readFileSync(fullPath, 'utf-8')
        const raw = JSON.parse(content)
        const s = parseSession(raw, file)
        sessions.push(s)
      } catch (e) {
        console.error(`[loadFromFilesystem] Error parsing ${file}`, e)
      }
    }
    return sessions.sort((a, b) => a.id.localeCompare(b.id))
  } catch (e) {
    console.error('[loadFromFilesystem] Error reading sessions dir', e)
    return []
  }
}

async function loadRemoteSessions(): Promise<Session[] | null> {
  try {
    const r1 = await fetch('/api/sessions', { cache: 'no-store', next: { revalidate: 0 } }).catch(() => null)
    if (r1 && r1.ok) {
      const data = await r1.json()
      try { console.log('[loadLocalSessions] source', 'relative_api', { ok: true }) } catch {}
      if (Array.isArray(data)) return data as Session[]
    }
  } catch {}
  try {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_BASE_URL
      : undefined
    const fromVercel = process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0
      ? `https://${process.env.VERCEL_URL}`
      : undefined
    const fromHeaders = await (async () => {
      try {
        const h = await headers()
        const host = h.get('x-forwarded-host') || h.get('host') || ''
        const proto = h.get('x-forwarded-proto') || 'https'
        return host ? `${proto}://${host}` : null
      } catch {
        return null
      }
    })()
    const origin = fromEnv ?? fromVercel ?? fromHeaders ?? 'http://localhost:3000'
    try { console.log('[loadLocalSessions] source', 'absolute_api', { origin, fromEnv: !!fromEnv, fromVercel: !!fromVercel, fromHeaders: !!fromHeaders }) } catch {}
    const r2 = await fetch(`${origin}/api/sessions`, { cache: 'no-store', next: { revalidate: 0 } }).catch(() => null)
    if (r2 && r2.ok) {
      const data = await r2.json()
      if (Array.isArray(data)) return data as Session[]
    }
  } catch {}
  return null
}

export async function loadLocalSessions(): Promise<Session[]> {
  const remote = await loadRemoteSessions()
  if (remote) return remote
  try {
    const candidates = [
      process.env.UPSTASH_REDIS_REST_URL,
      process.env.UPSTASH_REDIS_REST_REDIS_URL,
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
      process.env.UPSTASH_REDIS_REST_KV_URL,
      process.env.UPSTASH_REDIS_URL,
    ].filter(Boolean) as string[]
    const url = candidates.find((u) => typeof u === 'string' && u.startsWith('https://')) || ''
    const token = (
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_TOKEN ||
      process.env.UPSTASH_REDIS_REST_KV_REST_API_READONLY_TOKEN ||
      process.env.UPSTASH_REDIS_TOKEN ||
      ''
    )
    try { console.log('[loadLocalSessions] source', 'redis_sdk', { urlPresent: !!url, tokenPresent: !!token }) } catch {}
    const redis = url && token ? new Redis({ url, token }) : Redis.fromEnv()
    let curr: unknown = null
    try { curr = await redis.json.get('sessions') } catch {}
    if (!Array.isArray(curr) && (!curr || typeof curr !== 'object')) {
      try { const s = await redis.get('sessions'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
    }
    const items: unknown[] = Array.isArray(curr)
      ? (curr as unknown[])
      : curr && typeof curr === 'object'
        ? Object.values(curr as Record<string, unknown>)
        : []
    const result: Session[] = []
    for (const it of items) {
      const R = typeof it === 'string' ? (() => { try { return JSON.parse(it as string) } catch { return null } })() : (it as Record<string, unknown>)
      if (!R || typeof R !== 'object') continue
      const fp = typeof (R as Record<string, unknown>).sourceFilePath === 'string' ? ((R as Record<string, unknown>).sourceFilePath as string) : 'upstash:session.json'
      try {
        const s = parseSession(R as Record<string, unknown>, fp)
        result.push(s)
      } catch {}
    }
    result.sort((a, b) => a.id.localeCompare(b.id))
    return result
  } catch {}
  return []
}
