import path from 'node:path'
import fs from 'node:fs'
import { currentUser } from '@clerk/nextjs/server'

const SESSIONS_DIR = path.resolve(process.cwd(), 'sessions')

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const isAdmin = !!user && (
      (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
      user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
    )
    const devBypass = process.env.DEV_ALLOW_ANON_UPLOAD === '1' || (process.env.NODE_ENV === 'development' && process.env.DEV_ALLOW_ANON_UPLOAD !== '0')
    if (!(isAdmin || devBypass)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
    const form = await request.formData()
    const entries = form.getAll('files')
    try {
      if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR)
    } catch {}
    const duplicates: string[] = []
    for (const f of entries) {
      if (typeof f === 'object' && f !== null && 'arrayBuffer' in f) {
        const file = f as File
        const name = path.basename(file.name)
        if (!name.toLowerCase().endsWith('.json')) continue
        const target = path.join(SESSIONS_DIR, name)
        if (fs.existsSync(target)) {
          duplicates.push(name)
          continue
        }
        const buf = Buffer.from(await file.arrayBuffer())
        fs.writeFileSync(target, buf)
      }
    }
    const url = new URL('/sessions', request.url)
    if (duplicates.length > 0) {
      url.searchParams.set('dup', duplicates.join(','))
    }
    return Response.redirect(url, 303)
  } catch {
    return new Response(JSON.stringify({ error: 'upload_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

