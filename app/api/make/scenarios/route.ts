/**
 * API Route: List Make.com Scenarios
 * GET /api/make/scenarios - Returns list of all scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMakeApiKey, getMakeTeamInfo, setMakeTeamInfo } from '@/lib/make-api-store';

async function listMakeScenarios(apiKey: string): Promise<any[]> {
    try {
        console.log('[Make API Scenarios] Starting fetch with key length:', apiKey.length);

        const headers: Record<string, string> = {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
        };

        // If we have a teamId saved, include it
        const savedTeam = getMakeTeamInfo();
        if (savedTeam?.teamId) {
            headers['X-Team-Id'] = savedTeam.teamId;
            console.log('[Make API Scenarios] Using saved team id:', savedTeam.teamId);
        }

        let response = await fetch('https://api.make.com/v2/scenarios', {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        console.log('[Make API Scenarios] Response status:', response.status);
        console.log('[Make API Scenarios] Response headers:', Object.fromEntries(response.headers));

        // If unauthorized or forbidden, we might need a team id
        if (!response.ok && (response.status === 401 || response.status === 403)) {
            const bodyText = await response.text();
            console.warn('[Make API Scenarios] Initial request failed, attempting team discovery. Status:', response.status, bodyText);
            // Try to discover team id
            const teamsResp = await fetch('https://api.make.com/v2/teams', {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            });

            if (teamsResp.ok) {
                const teamsData = await safeJson(teamsResp);
                const teams = normalizeArray(teamsData, ['teams', 'items', 'data']);
                if (Array.isArray(teams) && teams.length > 0) {
                    const picked = teams[0];
                    const teamId = picked?.id || picked?.teamId || picked?.team_id;
                    const teamName = picked?.name || picked?.teamName;
                    if (teamId) {
                        setMakeTeamInfo({ teamId, teamName });
                        // Retry scenarios with X-Team-Id
                        response = await fetch('https://api.make.com/v2/scenarios', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Token ${apiKey}`,
                                'Content-Type': 'application/json',
                                'X-Team-Id': teamId,
                            },
                            cache: 'no-store',
                        });
                        console.log('[Make API Scenarios] Retried with X-Team-Id, status:', response.status);
                    }
                }
            } else {
                console.warn('[Make API Scenarios] Failed to fetch teams. Status:', teamsResp.status);
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Make API Scenarios] Error response:', response.status, errorText);
            return [];
        }

        const data = await safeJson(response);
        console.log('[Make API Scenarios] Data received:', JSON.stringify(data, null, 2));

        // Format scenarios from multiple possible response shapes
        const scenariosArr = normalizeArray(data, ['scenarios', 'items', 'data']);
        if (Array.isArray(scenariosArr)) {
            console.log('[Make API Scenarios] Found', scenariosArr.length, 'scenarios');
            return scenariosArr.map((scenario: any) => ({
                id: scenario.id ?? scenario.scenarioId ?? scenario.scenario_id,
                name: scenario.name || `Scenario ${scenario.id ?? ''}`,
                status: scenario.status || scenario.state || 'unknown',
                enabled: scenario.enabled ?? scenario.active ?? scenario.isActive ?? scenario.is_enabled ?? false,
                blueprint: scenario.blueprint ? 'Yes' : (scenario.hasBlueprint ? 'Yes' : 'No'),
            }));
        }

        console.log('[Make API Scenarios] No scenarios in response');
        return [];
    } catch (error) {
        console.error('[Make API Scenarios] Error listing scenarios:', error);
        return [];
    }
}

// Helpers
async function safeJson(resp: Response) {
    try {
        return await resp.json();
    } catch {
        return {} as any;
    }
}

function normalizeArray(data: any, keys: string[]): any[] {
    if (Array.isArray(data)) return data;
    for (const k of keys) {
        const val = data?.[k];
        if (Array.isArray(val)) return val;
    }
    return [];
}

export async function GET(request: NextRequest) {
    try {
        console.log('[Make Scenarios API] GET request received');
        const apiKey = getMakeApiKey();

        console.log('[Make Scenarios API] API Key exists:', !!apiKey);
        if (apiKey) {
            console.log('[Make Scenarios API] API Key length:', apiKey.length);
            console.log('[Make Scenarios API] First 10 chars:', apiKey.substring(0, 10) + '...');
        }

        if (!apiKey) {
            console.log('[Make Scenarios API] No API key found in store');
            return NextResponse.json(
                {
                    success: false,
                    scenarios: [],
                    error: 'Not connected to Make.com. Connect first.',
                },
                { status: 401 }
            );
        }

        console.log('[Make Scenarios API] Fetching scenarios with key');
        const scenarios = await listMakeScenarios(apiKey);
        console.log('[Make Scenarios API] Returned', scenarios.length, 'scenarios');

        return NextResponse.json({
            success: true,
            scenarios: scenarios,
            count: scenarios.length,
        });
    } catch (error) {
        console.error('[Make Scenarios API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                scenarios: [],
                error: error instanceof Error ? error.message : 'Failed to fetch scenarios',
            },
            { status: 500 }
        );
    }
}
