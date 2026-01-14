import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    { error: 'mercadopago_not_configured' },
    { status: 501 },
  )
}
