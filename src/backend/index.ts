import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = 9999;

app.use(cors());
app.use(express.json());

// Helper for error responses
function sendError(res: any, status: number, error: any, code: string, extra: any = {}) {
    res.status(status).json({ error: error.message, code, ...extra });
}

// Proxy endpoint for Jira token
app.post('/api/jira/token', async (req, res) => {
    const { login, password, name } = req.body;
    if (!login || !password) {
        console.error('[JIRA_PROXY][TOKEN][400] Missing login or password');
        return sendError(res, 400, new Error('Missing login or password'), 'JIRA_PROXY_TOKEN_MISSING_CREDENTIALS');
    }
    if (!name) {
        console.error('[JIRA_PROXY][TOKEN][400] Missing token name');
        return sendError(res, 400, new Error('Missing token name'), 'JIRA_PROXY_TOKEN_MISSING_NAME');
    }
    try {
        const response = await axios.post(
            'https://jira.eg.dk/rest/pat/latest/tokens',
            { name },
            {
                auth: { username: login, password },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            }
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('[JIRA_PROXY][TOKEN][JIRA_ERROR]', error?.response?.status, error?.message, error?.response?.data);
        sendError(res, 502, error, 'JIRA_PROXY_TOKEN_JIRA_ERROR', {
            jiraStatus: error?.response?.status,
            jiraData: error?.response?.data,
        });
    }
});


// Proxy endpoint for logging work
app.post('/api/jira/logwork', async (req, res) => {
    let {
        login,
        apiToken,
        token, // for backward compatibility, but prefer login/apiToken
        issueKey,
        timeSpentSeconds,
        started,
        comment,
        cookies,
        visibility,
        notifyUsers,
        adjustEstimate,
        newEstimate,
        reduceBy,
        expand,
        overrideEditableFlag
    } = req.body;

    // Accept timeSpentSeconds as string or number
    if (typeof timeSpentSeconds === 'string') {
        timeSpentSeconds = Number(timeSpentSeconds);
    }
    // Collect missing fields based on Jira API spec
    const missingFields: string[] = [];
    if (!(login && apiToken) && !token) missingFields.push('login/apiToken or token');
    if (!issueKey) missingFields.push('issueKey');
    if (typeof timeSpentSeconds !== 'number' || isNaN(timeSpentSeconds)) missingFields.push('timeSpentSeconds');
    if (!started) missingFields.push('started');
    // comment and visibility are optional

    if (missingFields.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            code: 'JIRA_PROXY_LOGWORK_MISSING_FIELDS',
            missingFields
        });
    }

    try {
        // Build query params
        const params: any = {};
        if (notifyUsers !== undefined) params.notifyUsers = notifyUsers;
        if (adjustEstimate !== undefined) params.adjustEstimate = adjustEstimate;
        if (newEstimate !== undefined) params.newEstimate = newEstimate;
        if (reduceBy !== undefined) params.reduceBy = reduceBy;
        if (expand !== undefined) params.expand = expand;
        if (overrideEditableFlag !== undefined) params.overrideEditableFlag = overrideEditableFlag;
        // Jira v2 API endpoint
        const url = `https://jira.eg.dk/rest/api/2/issue/${issueKey}/worklog`;
        // Auth: prefer basic auth if login/apiToken, else Bearer
        let axiosConfig: any = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.44.1',
            },
            params,
        };
        if (login && apiToken) {
            axiosConfig.auth = { username: login, password: apiToken };
        } else if (token) {
            axiosConfig.headers['Authorization'] = `Bearer ${token}`;
        }
        if (cookies) axiosConfig.headers['Cookie'] = cookies;
        // Build body
        const payload: any = {
            comment: comment || '',
            started,
            timeSpentSeconds,
        };
        if (visibility) payload.visibility = visibility;
        const response = await axios.post(url, payload, axiosConfig);
        res.json({
            jiraResponse: response.data,
            sent: true,
            sentPayload: payload,
            sentHeaders: axiosConfig.headers,
            url,
            params,
        });
    } catch (error: any) {
        if (error?.response) {
            sendError(res, 502, error, 'JIRA_PROXY_LOGWORK_JIRA_ERROR', {
                jiraStatus: error.response.status,
                jiraData: error.response.data,
            });
        } else {
            sendError(res, 500, error, 'JIRA_PROXY_LOGWORK_SERVER_ERROR');
        }
    }
});

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

app.listen(PORT, () => {
    console.log(`Jira proxy server running on port ${PORT}`);
});