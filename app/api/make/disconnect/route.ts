/**
 * API Route: Disconnect Make.com
 * POST /api/make/disconnect - Clears stored API key and team info
 */

import { NextRequest, NextResponse } from 'next/server'
import { clearMakeApiKey, isMakeConnected } from '@/lib/make-api-store'

export async function POST(_request: NextRequest) {
    try {
        const wasConnected = isMakeConnected()
        clearMakeApiKey()

        return NextResponse.json({
            success: true,
            disconnected: true,
            wasConnected,
            message: 'Disconnected from Make.com and cleared API key from server memory.'
        })
    } catch (error) {
        console.error('[Make Disconnect] Error:', error)
        return NextResponse.json(
            {
                success: false,
                disconnected: false,
                error: error instanceof Error ? error.message : 'Failed to disconnect from Make.com'
            },
            { status: 500 }
        )
    }
}

// Optional health check for convenience
export async function GET() {
    return NextResponse.json({
        endpoint: 'make/disconnect',
        method: 'POST',
        usage: 'POST /api/make/disconnect to clear API key from server memory.'
    })
}

