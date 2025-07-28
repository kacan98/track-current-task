// Utility to generate a Jira task link for a given taskId
export function getJiraTaskUrl(taskId: string, baseUrl: string = 'https://jira.eg.dk/browse/'): string | null {
  if (!taskId) return null;
  // Only link if it matches DFO-####
  if (/^DFO-\d+$/i.test(taskId)) {
    return baseUrl + taskId;
  }
  return null;
}
