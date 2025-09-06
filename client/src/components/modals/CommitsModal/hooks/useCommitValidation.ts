// Function to validate regex pattern
export const useCommitValidation = () => {
  const validateRegex = (pattern: string): string | null => {
    if (!pattern.trim()) {
      return 'Regex pattern cannot be empty';
    }
    try {
      new RegExp(pattern);
      return null; // Valid
    } catch (error) {
      return 'Invalid regex pattern';
    }
  };

  return { validateRegex };
};