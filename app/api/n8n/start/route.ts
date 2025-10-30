/**
 * API Route: Start N8N
 * POST /api/n8n/start - Starts N8N process
 * GET /api/n8n/start - Checks N8N health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { startN8N, isN8NRunning } from '@/lib/n8n-service';

async function checkN8NRunning(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('http://localhost:5678/', {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok || response.status === 200;
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('[N8N API] Start request received');

        // Check if N8N is already running
        const running = await checkN8NRunning();
        if (running) {
            console.log('[N8N API] N8N already running');
            return NextResponse.json(
                {
                    success: true,
                    status: 'running',
                    message: 'N8N is already running',
                },
                { status: 200 }
            );
        }

        // Start N8N
        console.log('[N8N API] Starting N8N...');
        const result = await startN8N();

        if (result.success) {
            // Wait longer for N8N to start (can take 10-30 seconds)
            console.log('[N8N API] Waiting for N8N to respond...');

            let attempts = 0;
            let isRunning = false;

            // Try up to 15 times with 2 second intervals (30 seconds total)
            while (attempts < 15 && !isRunning) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                isRunning = await checkN8NRunning();
                attempts++;
                console.log(`[N8N API] Check ${attempts}: ${isRunning ? 'Running' : 'Not responding yet'}`);
            }

            if (isRunning) {
                return NextResponse.json(
                    {
                        success: true,
                        status: 'started',
                        message: 'N8N started successfully',
                        pid: result.pid,
                    },
                    { status: 200 }
                );
            } else {
                return NextResponse.json(
                    {
                        success: false,
                        status: 'failed',
                        message: 'N8N process started but not responding after 30 seconds',
                    },
                    { status: 500 }
                );
            }
        } else {
            return NextResponse.json(
                {
                    success: false,
                    status: 'error',
                    message: result.message,
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[N8N API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const running = await checkN8NRunning();
        return NextResponse.json(
            {
                running,
                status: running ? 'N8N is running' : 'N8N is not running',
            },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            {
                running: false,
                error: error instanceof Error ? error.message : 'Error checking status',
            },
            { status: 500 }
        );
    }
}
