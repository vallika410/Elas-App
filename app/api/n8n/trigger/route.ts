/**
 * API Route: Trigger N8N Workflow
 * POST /api/n8n/trigger - Triggers a workflow execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { triggerWorkflow, getWorkflowWebhookUrl, triggerWebhook } from '@/lib/n8n-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { workflowId, data, preferWebhook, webhookUrl } = body;

        if (!workflowId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Workflow ID is required',
                },
                { status: 400 }
            );
        }

        console.log('[N8N Trigger API] Triggering workflow:', workflowId);
        console.log('[N8N Trigger API] Webhook URL override:', webhookUrl || 'none');
        console.log('[N8N Trigger API] Prefer webhook:', preferWebhook);

        // Try explicit webhook URL first if provided
        let result;
        if (webhookUrl) {
            console.log('[N8N Trigger API] Using explicit webhook URL:', webhookUrl);
            try {
                result = await triggerWebhook(webhookUrl, data);
                console.log('[N8N Trigger API] Webhook result:', result);
            } catch (e) {
                console.error('[N8N Trigger API] Webhook failed:', e);
                // Fall back below
            }
        }

        // Try webhook discovery if requested and no explicit URL provided
        if (!result && preferWebhook) {
            try {
                console.log('[N8N Trigger API] Discovering webhook URL for workflow:', workflowId);
                const discoveredWebhookUrl = await getWorkflowWebhookUrl(workflowId);
                console.log('[N8N Trigger API] Discovered webhook URL:', discoveredWebhookUrl);
                if (discoveredWebhookUrl) {
                    result = await triggerWebhook(discoveredWebhookUrl, data);
                    console.log('[N8N Trigger API] Webhook trigger result:', result);
                }
            } catch (e) {
                console.error('[N8N Trigger API] Webhook discovery/trigger failed:', e);
                // Fall back to direct execute below
            }
        }

        // Fallback: direct execution via REST API
        if (!result) {
            console.log('[N8N Trigger API] Falling back to REST API execution');
            result = await triggerWorkflow(workflowId, data);
            console.log('[N8N Trigger API] REST API result:', result);
        }

        if (result.status === 'success') {
            return NextResponse.json({
                success: true,
                executionId: result.executionId,
                message: 'Workflow triggered successfully',
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[N8N Trigger API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to trigger workflow',
            },
            { status: 500 }
        );
    }
}
