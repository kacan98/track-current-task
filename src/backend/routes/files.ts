import { Router, Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolvePathFromAppData } from '../../utils/path-utils';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { createLogger } from '../../utils/logger';

const router = Router();
const fileLogger = createLogger('FILES');

// Endpoint to serve activity log CSV from filesystem (DEV only)
router.get('/activity-log', asyncHandler(async (req: Request, res: Response) => {
    if (process.env.DEV !== 'true') {
        throw new ApiError(404, 'Filesystem endpoints disabled in production', 'FILESYSTEM_DISABLED');
    }
    
    const csvPath = resolvePathFromAppData('activity_log.csv');
    fileLogger.debug(`Looking for activity log at: ${csvPath}`);
    
    if (!existsSync(csvPath)) {
        throw new ApiError(
            404, 
            'Activity log not found', 
            'ACTIVITY_LOG_NOT_FOUND',
            { path: csvPath }
        );
    }
    
    const csvData = await readFile(csvPath, 'utf-8');
    fileLogger.success(`Activity log loaded (${csvData.length} bytes)`);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'inline; filename="activity_log.csv"');
    res.send(csvData);
}));

export default router;