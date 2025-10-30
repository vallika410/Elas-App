/**
 * Make.com API Key Storage
 * In-memory storage for Make.com API credentials
 */

let makeApiKey: string | null = null;
let makeTeamInfo: { teamName?: string; teamId?: string } | null = null;

export function setMakeApiKey(key: string, teamInfo?: { teamName?: string; teamId?: string }) {
    makeApiKey = key;
    makeTeamInfo = teamInfo || null;
    console.log('[Make API Store] API key stored');
}

export function getMakeApiKey(): string | null {
    return makeApiKey;
}

export function getMakeTeamInfo() {
    return makeTeamInfo;
}

export function setMakeTeamInfo(info: { teamName?: string; teamId?: string } | null) {
    makeTeamInfo = info;
    console.log('[Make API Store] Team info updated', info);
}

export function clearMakeApiKey() {
    makeApiKey = null;
    makeTeamInfo = null;
    console.log('[Make API Store] API key cleared');
}

export function isMakeConnected(): boolean {
    return makeApiKey !== null;
}
