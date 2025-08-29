import axios from 'axios';

// Helper to get Jira token (reusable)
export async function getJiraToken(login: string, password: string, name: string = 'Track Current Task') {
    const url = 'https://jira.eg.dk/rest/pat/latest/tokens';
    const payload = { name };
    
    console.log('[AUTH] Requesting Jira token from:', url);
    console.log('[AUTH] Payload:', JSON.stringify(payload, null, 2));
    console.log('[AUTH] Using login:', login);
    console.log('[AUTH] Token name:', name);
    
    try {
        const response = await axios.post(url, payload, {
            auth: { username: login, password },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        
        console.log('[AUTH] Jira response status:', response.status);
        console.log('[AUTH] Jira response headers:', JSON.stringify(response.headers, null, 2));
        console.log('[AUTH] Jira response data:', JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error: any) {
        console.log('[AUTH] Jira request failed');
        console.log('[AUTH] Error status:', error?.response?.status);
        console.log('[AUTH] Error headers:', JSON.stringify(error?.response?.headers || {}, null, 2));
        console.log('[AUTH] Error data:', JSON.stringify(error?.response?.data || {}, null, 2));
        console.log('[AUTH] Error message:', error?.message);
        throw error;
    }
}