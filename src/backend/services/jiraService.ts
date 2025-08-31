import axios, { AxiosError } from 'axios';
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
    } catch (error: unknown) {
        const axiosError = error as AxiosError;
        authLogger.error(`Jira authentication failed: ${axiosError?.response?.status || axiosError?.message}`);
        // Log error details but NOT the password or token data
        if (axiosError?.response?.data) {
            authLogger.debug('Error details:', axiosError.response.data);
        }
        throw error;
    }
}