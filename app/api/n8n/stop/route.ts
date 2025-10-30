/**
 * API Route: Stop N8N
 * POST /api/n8n/stop - Stops N8N process
 */

import { NextRequest, NextResponse } from 'next/server';
import { stopN8N } from '@/lib/n8n-service';

export async function POST(request: NextRequest) {
    try {
        console.log('[N8N Stop API] Stop request received');
        const result = await stopN8N();

        if (result.success) {
            return NextResponse.json(
                {
                    success: true,
                    message: result.message,
                },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: result.message,
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[N8N Stop API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
