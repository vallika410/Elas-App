/**
 * API Route: List N8N Workflows
 * GET /api/n8n/workflows - Returns list of all workflows from N8N database
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
    try {
        const dbPath = path.join(process.env.HOME || '/root', '.n8n/database.sqlite');

        // Check if database exists
        if (!fs.existsSync(dbPath)) {
            return NextResponse.json(
                {
                    success: false,
                    workflows: [],
                    error: 'N8N database not found',
                },
                { status: 404 }
            );
        }

        // Open database
        const db = new Database(dbPath, { readonly: true });

        try {
            // Query workflows from database - simpler query that works with N8N schema
            const workflows = db
                .prepare(
                    `
        SELECT 
          id,
          name,
          active
        FROM workflow_entity
        ORDER BY name ASC
      `
                )
                .all();

            // Format results
            const formattedWorkflows = workflows.map((workflow: any) => ({
                id: workflow.id,
                name: workflow.name || 'Untitled Workflow',
                active: workflow.active === 1 || workflow.active === true,
                nodes: 0,
            }));

            return NextResponse.json({
                success: true,
                workflows: formattedWorkflows,
                count: formattedWorkflows.length,
            });
        } finally {
            db.close();
        }
    } catch (error) {
        console.error('[N8N Workflows API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                workflows: [],
                error: error instanceof Error ? error.message : 'Failed to fetch workflows',
            },
            { status: 500 }
        );
    }
}
