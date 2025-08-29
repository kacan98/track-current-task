// Helper for error responses
export function sendError(res: any, status: number, error: any, code: string, extra: any = {}) {
    const errorMessage = error?.response?.data?.error || error.message;
    console.log(`[ERROR] ${code}: ${errorMessage}`);
    res.status(status).json({ error: errorMessage, code, ...extra });
}