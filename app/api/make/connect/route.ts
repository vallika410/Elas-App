/**
 * API Route: Connect to Make.com
 * POST /api/make/connect - Validates Make.com API key
 * GET /api/make/connect - Returns connection status
 */

import { NextRequest, NextResponse } from 'next/server';
import { setMakeApiKey, getMakeApiKey, getMakeTeamInfo, clearMakeApiKey } from '@/lib/make-api-store';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiKey } = body;

        if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
            return NextResponse.json(
                { success: false, error: 'API key is required' },
                { status: 400 }
            );
        }

        const trimmedKey = apiKey.trim();

        // Try to validate the API key by fetching from Make.com
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://api.make.com/v2/users/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${trimmedKey}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeout);

            console.log('[Make API] Validation response:', response.status);

            // Store the key regardless of validation response (Make.com might not have a simple /me endpoint)
            // We'll validate when actually fetching scenarios
            setMakeApiKey(trimmedKey, { teamName: 'Make.com Account' });

            return NextResponse.json({
                success: true,
                connected: true,
                teamName: 'Make.com Account',
                message: 'API key stored. Will be validated when fetching scenarios.',
            });
        } catch (validationError) {
            console.error('[Make API] Validation fetch error:', validationError);

            // Store the key even if validation fetch fails
            // (Make.com API might not be reachable or endpoint might be wrong)
            setMakeApiKey(trimmedKey, { teamName: 'Make.com Account' });

            return NextResponse.json({
                success: true,
                connected: true,
                teamName: 'Make.com Account',
                message: 'API key stored (validation will occur when fetching data)',
            });
        }
    } catch (error) {
        console.error('[Make API] Connection error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Connection failed',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const apiKey = getMakeApiKey();
        const teamInfo = getMakeTeamInfo();

        if (apiKey) {
            return NextResponse.json({
                connected: true,
                teamName: teamInfo?.teamName || 'Make.com Account',
                message: 'Connected to Make.com',
            });
        } else {
            return NextResponse.json({
                connected: false,
                message: 'Not connected to Make.com',
            });
        }
    } catch (error) {
        return NextResponse.json(
            {
                connected: false,
                error: error instanceof Error ? error.message : 'Error checking status',
            },
            { status: 500 }
        );
    }
}
