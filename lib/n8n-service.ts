/**
 * N8N Service Layer
 * Handles all N8N operations and API calls
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const N8N_PORT = 5678;
const N8N_BASE_URL = `http://localhost:${N8N_PORT}`;
// n8n REST API prefix (v1+ uses /rest rather than /api/v1)
const N8N_REST_PREFIX = '/rest';
const N8N_API_BASE = `${N8N_BASE_URL}${N8N_REST_PREFIX}`;
const N8N_DB_PATH = path.join(process.env.HOME || '/root', '.n8n/database.sqlite');

interface N8NWorkflow {
    id: string;
    name: string;
    active: boolean;
    nodes: number;
}

interface ExecutionResult {
    status: 'success' | 'error';
    executionId?: string;
    error?: string;
    data?: any;
}

function getN8NHeaders(contentType: 'json' | 'none' = 'json'): Record<string, string> {
    const headers: Record<string, string> = {};
    if (contentType === 'json') {
        headers['Content-Type'] = 'application/json';
    }
    // Support both Personal Access Tokens (JWT) and API Keys
    const token = process.env.N8N_API_TOKEN || process.env.N8N_API_KEY;
    if (token) {
        // Heuristically detect JWT (three dot-separated segments) and use Bearer
        if (token.split('.').length === 3) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            headers['X-N8N-API-Key'] = token;
        }
    }
    return headers;
}

/**
 * Check if N8N is running by making a request to the root endpoint
 */
export async function isN8NRunning(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(N8N_BASE_URL, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeout);
        return response.ok || response.status === 200;
    } catch (error) {
        return false;
    }
}

/**
 * Get N8N health status
 */
export async function getN8NHealth(): Promise<{ healthy: boolean; status: string }> {
    try {
        const running = await isN8NRunning();
        if (!running) {
            return { healthy: false, status: 'N8N is not running' };
        }
        return { healthy: true, status: 'N8N is running' };
    } catch (error) {
        return { healthy: false, status: 'Error checking N8N health' };
    }
}

/**
 * Start N8N process
 */
export async function startN8N(): Promise<{ success: boolean; message: string; pid?: number }> {
    try {
        // Check if already running
        const running = await isN8NRunning();
        if (running) {
            return { success: true, message: 'N8N is already running' };
        }

        // Start N8N via npx (which should be available)
        return new Promise((resolve) => {
            const child = spawn('npx', ['n8n', 'start'], {
                detached: true,
                stdio: 'ignore',
                shell: true,
                env: { ...process.env, PATH: process.env.PATH },
            });

            const pid = child.pid;
            child.unref();

            // Give it time to start
            setTimeout(() => {
                resolve({
                    success: true,
                    message: 'N8N started successfully',
                    pid,
                });
            }, 2000);
        });
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to start N8N',
        };
    }
}

/**
 * Stop N8N process
 */
export async function stopN8N(): Promise<{ success: boolean; message: string }> {
    try {
        // Try to kill N8N process
        await execAsync(`pkill -f "n8n start" || true`);

        return {
            success: true,
            message: 'N8N stopped successfully',
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to stop N8N',
        };
    }
}

/**
 * Get list of workflows from N8N database
 */
export async function listWorkflows(): Promise<N8NWorkflow[]> {
    try {
        const response = await fetch(`${N8N_API_BASE}/workflows`, {
            method: 'GET',
            headers: getN8NHeaders('json'),
        });

        if (!response.ok) {
            console.error('Failed to fetch workflows:', response.statusText);
            return [];
        }

        const data = await response.json();
        console.log('Workflows fetched:', data);

        // Format the workflow data
        if (Array.isArray(data)) {
            return data.map((workflow: any) => ({
                id: workflow.id,
                name: workflow.name,
                active: workflow.active || false,
                nodes: workflow.nodes?.length || 0,
            }));
        }

        return [];
    } catch (error) {
        console.error('Error listing workflows:', error);
        return [];
    }
}

/**
 * Trigger a workflow execution
 */
export async function triggerWorkflow(
    workflowId: string,
    data?: any
): Promise<ExecutionResult> {
    try {
        const response = await fetch(
            `${N8N_API_BASE}/workflows/${workflowId}/run`,
            {
                method: 'POST',
                headers: getN8NHeaders('json'),
                // n8n accepts an optional payload; pass through user data
                body: JSON.stringify({ data: data || {} }),
            }
        );

        if (!response.ok) {
            let detail = '';
            try { detail = await response.text(); } catch { }
            return {
                status: 'error',
                error: `HTTP ${response.status}: ${response.statusText}${detail ? ` - ${detail}` : ''}`,
            };
        }

        const result = await response.json();
        return {
            status: 'success',
            executionId: result.executionId,
            data: result,
        };
    } catch (error) {
        return {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get workflow execution status
 */
export async function getExecutionStatus(executionId: string): Promise<any> {
    try {
        const response = await fetch(
            `${N8N_API_BASE}/executions/${executionId}`,
            {
                method: 'GET',
                headers: getN8NHeaders('json'),
            }
        );

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting execution status:', error);
        return null;
    }
}

/**
 * Wait for workflow execution to complete with timeout
 */
export async function executeAndWait(
    workflowId: string,
    data?: any,
    maxWaitTime: number = 30000
): Promise<ExecutionResult> {
    // Trigger execution
    const triggerResult = await triggerWorkflow(workflowId, data);

    if (triggerResult.status === 'error') {
        return triggerResult;
    }

    const executionId = triggerResult.executionId;
    if (!executionId) {
        return {
            status: 'error',
            error: 'No execution ID returned',
        };
    }

    const startTime = Date.now();

    // Poll for completion
    while (Date.now() - startTime < maxWaitTime) {
        const status = await getExecutionStatus(executionId);

        if (status && status.finished) {
            return {
                status: 'success',
                executionId: status.id,
                data: status,
            };
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
        status: 'error',
        error: 'Execution timeout',
    };
}

/**
 * Get webhook URL for a workflow
 */
export async function getWorkflowWebhookUrl(workflowId: string): Promise<string | null> {
    try {
        const response = await fetch(
            `${N8N_API_BASE}/workflows/${workflowId}`,
            {
                method: 'GET',
                headers: getN8NHeaders('json'),
            }
        );

        if (!response.ok) {
            return null;
        }

        const wf = await response.json();
        // n8n may return nodes under wf.nodes or wf.data.nodes depending on API/version
        const nodes = Array.isArray(wf?.nodes) ? wf.nodes : Array.isArray(wf?.data?.nodes) ? wf.data.nodes : [];
        const active = typeof wf?.active === 'boolean' ? wf.active : (typeof wf?.data?.active === 'boolean' ? wf.data.active : false);
        // Extract webhook node and construct URL: {host}/{webhook|webhook-test}/{path}
        const webhookNode = nodes.find((node: any) => node?.type === 'n8n-nodes-base.webhook');
        if (webhookNode && webhookNode.parameters?.path) {
            const base = active ? 'webhook' : 'webhook-test';
            return `${N8N_BASE_URL}/${base}/${webhookNode.parameters.path}`;
        }

        return null;
    } catch (error) {
        console.error('Error getting webhook URL:', error);
        return null;
    }
}

/**
 * Trigger workflow via webhook
 */
export async function triggerWebhook(webhookUrl: string, data?: any): Promise<ExecutionResult> {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data || {}),
        });

        if (!response.ok) {
            return {
                status: 'error',
                error: `HTTP ${response.status}: ${response.statusText}`,
            };
        }

        const result = await response.json();
        return {
            status: 'success',
            data: result,
        };
    } catch (error) {
        return {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Reset N8N completely (delete all data and config)
 */
export async function resetN8N(): Promise<{ success: boolean; message: string }> {
    try {
        // First stop N8N
        await stopN8N();

        // Wait for process to stop
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Delete N8N directory
        const fs = require('fs');
        const n8nDir = N8N_DB_PATH.replace('/database.sqlite', '');

        if (fs.existsSync(n8nDir)) {
            await execAsync(`rm -rf "${n8nDir}"`);
            return {
                success: true,
                message: 'N8N reset successfully. All data and configurations have been deleted.',
            };
        }

        return {
            success: true,
            message: 'N8N data directory not found. Nothing to reset.',
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to reset N8N',
        };
    }
}
