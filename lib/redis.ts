import { Redis } from '@upstash/redis'

type RedisJsonPrimitive = string | number | boolean
type RedisJsonRecord = Record<string, unknown>
type RedisJsonValue = RedisJsonPrimitive | RedisJsonRecord | Array<RedisJsonPrimitive | RedisJsonRecord>

function isRedisJsonValue(value: unknown): value is RedisJsonValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  if (Array.isArray(value)) {
    return value.every(
      (x) =>
        typeof x === 'string' ||
        typeof x === 'number' ||
        typeof x === 'boolean' ||
        (!!x && typeof x === 'object' && !Array.isArray(x)),
    )
  }
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function resolveUpstashEnv() {
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
  return { url, token }
}

export function upstashConfigured() {
  const { url, token } = resolveUpstashEnv()
  return !!(url && token)
}

export function createRedis() {
  const { url, token } = resolveUpstashEnv()
  if (url && token) return new Redis({ url, token })
  return Redis.fromEnv()
}

export function listifyRedisItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value as unknown[]
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>)
  return []
}

export function listifyRedisRecords(value: unknown): Array<Record<string, unknown>> {
  const items = listifyRedisItems(value)
  return items.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
}

export async function readRedisItems(key: string): Promise<unknown[]> {
  try {
    const redis = createRedis()
    let curr: unknown = null
    try {
      curr = await redis.json.get(key)
    } catch {}
    if (!Array.isArray(curr) && (!curr || typeof curr !== 'object')) {
      try {
        const s = await redis.get(key)
        if (typeof s === 'string') curr = JSON.parse(s)
      } catch {}
    }
    return listifyRedisItems(curr)
  } catch {}
  return []
}

export async function readRedisCollection(key: string): Promise<Array<Record<string, unknown>>> {
  const items = await readRedisItems(key)
  return items.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
}

export async function writeRedisCollection(key: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  const redis = createRedis()
  let writeOk = false
  let lastError: unknown = null
  try {
    if (isRedisJsonValue(value)) {
      await redis.json.set(key, '$', value)
      writeOk = true
    }
  } catch (e) {
    lastError = e
  }
  if (!writeOk) {
    try {
      await redis.set(key, JSON.stringify(value))
      writeOk = true
    } catch (e) {
      lastError = e
    }
  }
  return writeOk ? { ok: true } : { ok: false, error: String(lastError ?? '') }
}
