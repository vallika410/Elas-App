/**
 * API Route: Reset N8N
 * POST /api/n8n/reset - Resets N8N by deleting database and config, creating fresh instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { stopN8N } from '@/lib/n8n-service';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        console.log('[N8N Reset API] Reset request received');

        // Step 1: Stop N8N if running
        console.log('[N8N Reset API] Stopping N8N...');
        await stopN8N();

        // Wait a bit for process to fully stop
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 2: Delete N8N data directory
        const n8nDir = path.join(process.env.HOME || '/root', '.n8n');
        console.log('[N8N Reset API] Deleting N8N data directory:', n8nDir);

        if (fs.existsSync(n8nDir)) {
            try {
                // Use rm -rf to delete the directory
                await execAsync(`rm -rf "${n8nDir}"`);
                console.log('[N8N Reset API] N8N data directory deleted');
            } catch (error) {
                console.error('[N8N Reset API] Error deleting directory:', error);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to delete N8N data directory',
                        details: error instanceof Error ? error.message : 'Unknown error',
                    },
                    { status: 500 }
                );
            }
        } else {
            console.log('[N8N Reset API] N8N data directory does not exist');
        }

        return NextResponse.json(
            {
                success: true,
                message: 'N8N has been reset successfully. Start N8N again to create a fresh instance.',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[N8N Reset API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
