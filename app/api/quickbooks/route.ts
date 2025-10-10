import { NextResponse } from 'next/server'
import { queryQuickBooks } from '@/lib/quickbooks-service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query } = body || {}
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'missing query' }, { status: 400 })
    }

    const data = await queryQuickBooks(query)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('api/quickbooks error', err)
    const message = err?.message || 'unknown error'
    const body = err?.body || undefined
    return NextResponse.json({ ok: false, message, body }, { status: 500 })
  }
}
