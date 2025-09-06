import type { ApiErrorResponse } from '@shared/types';

/**
 * Custom error class for API errors with proper typing
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Type guard to check if an object is an ApiErrorResponse
 */
export function isApiErrorResponse(obj: unknown): obj is ApiErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as any).error === 'object' &&
    'message' in (obj as any).error &&
    'code' in (obj as any).error
  );
}

/**
 * Parse error response from API and throw a proper ApiError
 */
export async function handleApiResponse(response: Response, defaultMessage: string): Promise<any> {
  if (response.ok) {
    return response.json();
  }

  let errorData: unknown;
  try {
    errorData = await response.json();
  } catch {
    // If JSON parsing fails, throw with status text
    throw new ApiError(
      response.statusText || defaultMessage,
      'PARSE_ERROR',
      response.status
    );
  }

  // Handle our standard API error format
  if (isApiErrorResponse(errorData)) {
    throw new ApiError(
      errorData.error.message,
      errorData.error.code,
      response.status,
      errorData.error.details
    );
  }

  // Handle legacy error format or unexpected format
  const message = (errorData as any)?.message || 
                  (errorData as any)?.error || 
                  defaultMessage;
  
  throw new ApiError(
    message,
    'UNKNOWN_ERROR',
    response.status,
    errorData
  );
}

/**
 * Extract user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}