import { NextResponse } from 'next/server'

export async function GET() {
    const token = process.env.N8N_API_TOKEN
    const key = process.env.N8N_API_KEY

    const hasToken = Boolean(token)
    const hasKey = Boolean(key)
    const authType = hasToken ? 'bearer-token' : hasKey ? 'api-key' : 'none'

    // Do not return the raw secret; only indicate presence and type
    return NextResponse.json({
        success: true,
        auth: {
            type: authType,
            hasToken,
            hasKey,
        },
    })
}
