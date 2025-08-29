import { Router } from 'express';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolvePathFromAppData } from '../../utils/path-utils';
import { sendError } from '../utils/errors';

const router = Router();

// Endpoint to serve activity log CSV from filesystem (DEV only)
router.get('/activity-log', async (req, res) => {
    if (process.env.DEV !== 'true') {
        return res.status(404).json({ 
            error: 'Filesystem endpoints disabled in production', 
            code: 'FILESYSTEM_DISABLED' 
        });
    }
    
    try {
        const csvPath = resolvePathFromAppData('activity_log.csv');
        
        if (!existsSync(csvPath)) {
            return res.status(404).json({ 
                error: 'Activity log not found', 
                code: 'ACTIVITY_LOG_NOT_FOUND',
                path: csvPath 
            });
        }
        
        const csvData = await readFile(csvPath, 'utf-8');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'inline; filename="activity_log.csv"');
        res.send(csvData);
    } catch (error: any) {
        console.error('[ACTIVITY_LOG][ERROR]', error?.message);
        sendError(res, 500, error, 'ACTIVITY_LOG_READ_ERROR');
    }
});

export default router;