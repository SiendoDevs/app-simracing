import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import fs from 'node:fs'
import { loadLocalSessions } from '@/lib/loadLocalSessions'

export const runtime = 'nodejs'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const sessions = await loadLocalSessions()
    const target = sessions.find((s) => s.id === id)
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const filePath = target.sourceFilePath
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch (e) {
      return NextResponse.json({ error: 'unlink_failed', detail: String(e) }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
