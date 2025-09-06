import axios, { AxiosError } from 'axios';
import { createLogger } from '../../../shared/logger';

const authLogger = createLogger('AUTH');

// Helper to get Jira token (reusable) - updated to accept jiraUrl
export async function getJiraToken(login: string, password: string, jiraUrl: string, name: string = 'LogBridge') {
    const url = `${jiraUrl}/rest/pat/latest/tokens`;
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
    } catch (error: unknown) {
        const axiosError = error as AxiosError;
        authLogger.error(`Jira authentication failed: ${axiosError?.response?.status || axiosError?.message}`);
        // Error response received
        throw error;
    }
}