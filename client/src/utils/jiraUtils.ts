// Utility to generate a Jira task link for a given taskId using configurable patterns
export function getJiraTaskUrl(taskId: string, taskIdRegex?: string, baseUrl?: string): string | null {
  if (!taskId || !taskIdRegex || !baseUrl) return null;
  
  try {
    const regex = new RegExp(`^${taskIdRegex}$`, 'i');
    if (regex.test(taskId)) {
      // Add /browse/ path to the base URL for proper Jira navigation
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${normalizedBaseUrl}/browse/${taskId}`;
    }
  } catch (error) {
    console.warn('Invalid task ID regex pattern:', taskIdRegex, error);
  }
  
  return null;
}

// Utility to test if a taskId matches the configured pattern
export function isValidTaskId(taskId: string, taskIdRegex?: string): boolean {
  if (!taskId || !taskIdRegex) return false;
  
  try {
    const regex = new RegExp(`^${taskIdRegex}$`, 'i');
    return regex.test(taskId);
  } catch (error) {
    console.warn('Invalid task ID regex pattern:', taskIdRegex, error);
  }
  
  return false;
}
