import { Router, Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import { createLogger } from '@shared/logger';

const router = Router();
const fileLogger = createLogger('FILES');

// Activity log endpoint - works locally, disabled in serverless production
router.get('/activity-log', asyncHandler(async (req: Request, res: Response) => {
    // Only available in development
    if (process.env.NODE_ENV === 'production') {
        throw new ApiError(
            501, 
            'Activity log endpoint not available in serverless production. Use database or cloud storage instead.', 
            'ENDPOINT_NOT_IMPLEMENTED'
        );
    }
    
    // Local development - dynamically import file system modules
    const { readFile } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const { resolvePathFromAppData } = await import('@shared/path-utils');
    
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