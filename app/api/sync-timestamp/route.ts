import { NextRequest, NextResponse } from 'next/server'

// Mock database for storing sync timestamps
// In production, replace with actual database (MongoDB, PostgreSQL, etc.)
const syncTimestamps: Record<string, { yardiSync: string | null; quickBooksSync: string | null }> = {}

export async function POST(request: NextRequest) {
    try {
        const { userId, source, timestamp } = await request.json()

        if (!userId || !source || !timestamp) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, source, timestamp' },
                { status: 400 }
            )
        }

        // Validate source is either 'yardi' or 'quickbooks'
        if (!['yardi', 'quickbooks'].includes(source.toLowerCase())) {
            return NextResponse.json(
                { error: 'Invalid source. Must be "yardi" or "quickbooks"' },
                { status: 400 }
            )
        }

        // Initialize user record if not exists
        if (!syncTimestamps[userId]) {
            syncTimestamps[userId] = { yardiSync: null, quickBooksSync: null }
        }

        // Update the appropriate timestamp based on source
        const key = source.toLowerCase() === 'yardi' ? 'yardiSync' : 'quickBooksSync'
        syncTimestamps[userId][key] = timestamp

        return NextResponse.json({
            success: true,
            message: `${source} sync timestamp saved for user ${userId}`,
            data: syncTimestamps[userId],
        })
    } catch (error) {
        console.error('Error saving sync timestamp:', error)
        return NextResponse.json(
            { error: 'Failed to save sync timestamp' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get userId from query parameters
        const userId = request.nextUrl.searchParams.get('userId')

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing required parameter: userId' },
                { status: 400 }
            )
        }

        // Retrieve timestamps for the user or return defaults if user not found
        const userTimestamps = syncTimestamps[userId] || {
            yardiSync: null,
            quickBooksSync: null,
        }

        return NextResponse.json({
            success: true,
            data: userTimestamps,
        })
    } catch (error) {
        console.error('Error fetching sync timestamps:', error)
        return NextResponse.json(
            { error: 'Failed to fetch sync timestamps' },
            { status: 500 }
        )
    }
}
