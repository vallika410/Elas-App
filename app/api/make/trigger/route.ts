/**
 * API Route: Trigger a Make.com Scenario
 * POST /api/make/trigger
 * 
 * Request body options:
 * - webhookUrl (string)  -> Directly call the Make.com webhook URL (recommended)
 * - scenarioId (string|number) -> Provided for future expansion; currently requires webhookUrl
 * - payload (object)     -> Optional JSON payload forwarded to the webhook
 * 
 * Note: The most reliable way to trigger a Make.com scenario is via its webhook URL.
 * Fetch the webhook URL from your scenario in Make.com and pass it in the request body.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMakeApiKey } from '@/lib/make-api-store'

type TriggerRequest = {
    webhookUrl?: string
    scenarioId?: string | number
    payload?: any
}

export async function POST(request: NextRequest) {
    try {
        const apiKey = getMakeApiKey()
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Not connected to Make.com. Connect in Settings first.' },
                { status: 401 }
            )
        }

        const body = (await request.json()) as TriggerRequest
        const { webhookUrl, scenarioId, payload } = body || {}

        if (!webhookUrl && !scenarioId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Provide webhookUrl (recommended) or scenarioId in the request body.'
                },
                { status: 400 }
            )
        }

        // Preferred path: direct webhook trigger
        if (webhookUrl) {
            // Basic validation
            const isHttp = webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://')
            if (!isHttp) {
                return NextResponse.json(
                    { success: false, error: 'Invalid webhookUrl. Must start with http:// or https://' },
                    { status: 400 }
                )
            }

            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 10_000)

            try {
                const resp = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload ?? {}),
                    signal: controller.signal
                })
                clearTimeout(timeout)

                const text = await resp.text().catch(() => '')
                const result = safeJson(text)
                if (!resp.ok) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: `Webhook responded with ${resp.status}`,
                            response: text
                        },
                        { status: 502 }
                    )
                }

                return NextResponse.json({
                    success: true,
                    triggered: true,
                    via: 'webhook',
                    status: resp.status,
                    response: result ?? text
                })
            } catch (err) {
                clearTimeout(timeout)
                const message = err instanceof Error ? err.message : String(err)
                console.error('[Make Trigger] Webhook call failed:', message)
                return NextResponse.json(
                    { success: false, error: `Failed to call webhook: ${message}` },
                    { status: 504 }
                )
            }
        }

        // Fallback: scenarioId path (requires Make.com API capability)
        // Many Make.com scenarios are designed to be triggered by webhooks. The public API
        // does not provide a guaranteed universal "run now" endpoint for arbitrary scenarios.
        // We return a helpful error guiding the user to supply the webhookUrl.
        return NextResponse.json(
            {
                success: false,
                error: 'Trigger by scenarioId is not configured. Please provide webhookUrl from your scenario.'
            },
            { status: 400 }
        )
    } catch (error) {
        console.error('[Make Trigger] Error:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to trigger scenario' },
            { status: 500 }
        )
    }
}

function safeJson(text: string | null | undefined) {
    if (!text) return null
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

// Optional: quick GET to describe usage
export async function GET() {
    return NextResponse.json({
        endpoint: 'make/trigger',
        method: 'POST',
        usage: 'POST with { webhookUrl, payload? } to trigger a Make.com scenario webhook.'
    })
}

