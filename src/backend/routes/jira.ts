import { Router } from 'express';
import axios from 'axios';
import { sendError } from '../utils/errors';
import { getJiraToken } from '../services/jiraService';
import { isProduction } from '../config/cors';

const router = Router();

// Authentication endpoints
router.post('/auth/login', async (req, res) => {
    const { login, password, name } = req.body;
    if (!login || !password) {
        return sendError(res, 400, new Error('Missing login or password'), 'AUTH_MISSING_CREDENTIALS');
    }
    
    try {
        console.log('[AUTH] Attempting to get Jira token...');
        const tokenData = await getJiraToken(login, password, name);
        
        // Store token in encrypted cookie with environment-aware settings
        const jiraToken = tokenData.rawToken;
        res.cookie('jiraToken', jiraToken, {
            signed: true,        // Encrypt the cookie
            httpOnly: true,      // Prevent XSS
            secure: isProduction, // HTTPS only in production
            maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
            sameSite: isProduction ? 'strict' : 'lax' // Stricter CSRF in prod
        });
        
        console.log('[AUTH] Successfully authenticated and set encrypted cookie');
        res.json({ 
            success: true, 
            message: 'Successfully authenticated with Jira',
            hasFilesystemAccess: process.env.DEV === 'true'
        });
    } catch (error: any) {
        console.error('[AUTH] Failed to authenticate:', error?.response?.status, error?.message);
        sendError(res, 401, error, 'AUTH_JIRA_ERROR', {
            jiraStatus: error?.response?.status,
            jiraData: error?.response?.data,
        });
    }
});

router.post('/auth/logout', (req, res) => {
    res.clearCookie('jiraToken');
    console.log('[AUTH] User logged out');
    res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/status', (req, res) => {
    const jiraToken = req.signedCookies.jiraToken;
    res.json({ 
        authenticated: !!jiraToken,
        hasFilesystemAccess: process.env.DEV === 'true'
    });
});

// Proxy endpoint for logging work
router.post('/logwork', async (req, res) => {
    // Get token from encrypted cookie
    const token = req.signedCookies.jiraToken;
    if (!token) {
        return sendError(res, 401, new Error('Not authenticated. Please log in first.'), 'AUTH_REQUIRED');
    }

    let {
        issueKey,
        timeSpentSeconds,
        started,
        comment,
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
        // Use Bearer token from encrypted cookie
        const axiosConfig = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.44.1',
                'Authorization': `Bearer ${token}`,
            },
            params,
        };
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

// Endpoint to get details for multiple Jira issues by key
router.post('/issues/details', async (req, res) => {
    // Get token from encrypted cookie
    const token = req.signedCookies.jiraToken;
    if (!token) {
        return sendError(res, 401, new Error('Not authenticated. Please log in first.'), 'AUTH_REQUIRED');
    }
    
    const { issueKeys, jql, fields } = req.body;
    if (!Array.isArray(issueKeys) || issueKeys.length === 0) {
        return sendError(res, 400, new Error('Missing or empty issueKeys array'), 'JIRA_PROXY_ISSUES_MISSING_KEYS');
    }
    try {
        const url = 'https://jira.eg.dk/rest/api/2/search';
        const jqlQuery = jql || `issuekey in (${issueKeys.map(k => `'${k}'`).join(',')})`;
        const payload = {
            jql: jqlQuery,
            fields: fields || ["summary", "description", "status", "assignee", "reporter", "priority"]
        };
        const axiosConfig = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.44.1',
                'Authorization': `Bearer ${token}`
            }
        };
        const response = await axios.post(url, payload, axiosConfig);
        res.json({
            issues: response.data.issues,
            total: response.data.total,
            jql: payload.jql,
            sentFields: payload.fields
        });
    } catch (error: any) {
        if (error?.response) {
            sendError(res, 502, error, 'JIRA_PROXY_ISSUES_JIRA_ERROR', {
                jiraStatus: error.response.status,
                jiraData: error.response.data,
            });
        } else {
            sendError(res, 500, error, 'JIRA_PROXY_ISSUES_SERVER_ERROR');
        }
    }
});

// Endpoint to get details for multiple worklogs by ID
router.post('/worklogs/details', async (req, res) => {
    // Get token from encrypted cookie
    const token = req.signedCookies.jiraToken;
    if (!token) {
        return sendError(res, 401, new Error('Not authenticated. Please log in first.'), 'AUTH_REQUIRED');
    }
    
    const { worklogIds } = req.body;
    if (!Array.isArray(worklogIds) || worklogIds.length === 0) {
        return sendError(res, 400, new Error('Missing or empty worklogIds array'), 'JIRA_PROXY_WORKLOGS_MISSING_IDS');
    }
    try {
        const url = 'https://jira.eg.dk/rest/api/2/worklog/list';
        const payload = { ids: worklogIds };
        const axiosConfig = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.44.1',
                'Authorization': `Bearer ${token}`
            }
        };
        const response = await axios.post(url, payload, axiosConfig);
        res.json({
            worklogs: response.data,
            total: response.data.length,
            sentIds: worklogIds
        });
    } catch (error: any) {
        if (error?.response) {
            sendError(res, 502, error, 'JIRA_PROXY_WORKLOGS_JIRA_ERROR', {
                jiraStatus: error.response.status,
                jiraData: error.response.data,
            });
        } else {
            sendError(res, 500, error, 'JIRA_PROXY_WORKLOGS_SERVER_ERROR');
        }
    }
});

export default router;