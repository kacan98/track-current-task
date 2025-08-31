import axios from 'axios';
import { createLogger } from '../../utils/logger';

const authLogger = createLogger('AUTH');

// Helper to get Jira token (reusable)
export async function getJiraToken(login: string, password: string, name: string = 'Track Current Task') {
    const url = 'https://jira.eg.dk/rest/pat/latest/tokens';
    const payload = { name };
    
    try {
        const response = await axios.post(url, payload, {
            auth: { username: login, password },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        
        return response.data;
    } catch (error: any) {
        authLogger.error(`Jira authentication failed: ${error?.response?.status || error?.message}`);
        // Log error details but NOT the password or token data
        if (error?.response?.data) {
            authLogger.debug('Error details:', error.response.data);
        }
        throw error;
    }
}