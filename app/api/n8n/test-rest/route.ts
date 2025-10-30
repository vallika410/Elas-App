import { NextResponse } from 'next/server'
import { getN8NHealth } from '@/lib/n8n-service'

export async function GET() {
    try {
        const restBase = `http://localhost:5678/rest`
        const publicBase = `http://localhost:5678/api/v1`
        const token = process.env.N8N_API_TOKEN || process.env.N8N_API_KEY

        // Try public API with X-N8N-API-KEY first
        const publicHeaders: Record<string, string> = {}
        if (token) publicHeaders['X-N8N-API-KEY'] = token
        const publicRes = await fetch(`${publicBase}/workflows`, { headers: publicHeaders })
        const publicBody = await publicRes.text()

        // Also try REST with Bearer
        const restHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) restHeaders['Authorization'] = `Bearer ${token}`
        const restRes = await fetch(`${restBase}/workflows`, { headers: restHeaders })
        const restBody = await restRes.text()

        // Try executing the first workflow via Public API
        let execResult: any = null
        try {
            const parsed = JSON.parse(publicBody)
            const first = parsed?.data?.[0]
            if (first?.id) {
                const execRes = await fetch(`${publicBase}/workflows/${first.id}/executions`, {
                    method: 'POST',
                    headers: { ...publicHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                })
                execResult = { ok: execRes.ok, status: execRes.status, body: (await execRes.text()).slice(0, 300) }
            }
        } catch { }

        return NextResponse.json({
            publicApi: { ok: publicRes.ok, status: publicRes.status, body: publicBody.slice(0, 300) },
            restApi: { ok: restRes.ok, status: restRes.status, body: restBody.slice(0, 300) },
            execute: execResult
        })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
    }
}
