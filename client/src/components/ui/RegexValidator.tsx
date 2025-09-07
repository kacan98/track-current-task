import { useState, useMemo } from 'react';
import { Button } from './Button';

interface RegexValidatorProps {
  regex: string;
  onRegexChange: (regex: string) => void;
  className?: string;
}

interface ExampleTest {
  id: string;
  input: string;
  expected: boolean;
}

export function RegexValidator({ regex, onRegexChange, className = '' }: RegexValidatorProps) {
  const [examples, setExamples] = useState<ExampleTest[]>([
    { id: '1', input: 'feature/PROJ-123-add-login', expected: true },
    { id: '2', input: 'PROJ-456: Fix bug in authentication', expected: true },
    { id: '3', input: 'bugfix/no-task-id-here', expected: false },
  ]);
  
  const [newExample, setNewExample] = useState('');
  
  // Common regex patterns
  const commonPatterns = [
    { name: 'JIRA Style (PROJ-123)', pattern: '[A-Z]+-\\d+' },
    { name: 'Generic (ABC-123)', pattern: '\\w+-\\d+' },
    { name: 'GitHub Issue (#123)', pattern: '#\\d+' },
    { name: 'Linear (ABC-123)', pattern: '[A-Z]{2,4}-\\d+' },
  ];
  
  // Test the regex against examples
  const testResults = useMemo(() => {
    if (!regex.trim()) return [];
    
    try {
      const regexObj = new RegExp(regex, 'i');
      return examples.map(example => {
        const match = example.input.match(regexObj);
        const found = !!match;
        const extractedId = match ? match[0] : null;
        
        return {
          ...example,
          found,
          extractedId,
          isCorrect: found === example.expected
        };
      });
    } catch (error) {
      return examples.map(example => ({
        ...example,
        found: false,
        extractedId: null,
        isCorrect: false,
        error: 'Invalid regex'
      }));
    }
  }, [regex, examples]);
  
  const addExample = () => {
    if (newExample.trim()) {
      setExamples(prev => [...prev, {
        id: Date.now().toString(),
        input: newExample.trim(),
        expected: true // Default to expecting a match
      }]);
      setNewExample('');
    }
  };
  
  const removeExample = (id: string) => {
    setExamples(prev => prev.filter(ex => ex.id !== id));
  };
  
  const toggleExpected = (id: string) => {
    setExamples(prev => prev.map(ex => 
      ex.id === id ? { ...ex, expected: !ex.expected } : ex
    ));
  };
  
  const updateExampleInput = (id: string, newInput: string) => {
    setExamples(prev => prev.map(ex => 
      ex.id === id ? { ...ex, input: newInput } : ex
    ));
  };
  
  const allCorrect = testResults.every(result => result.isCorrect);
  const hasValidRegex = regex.trim() && !testResults.some(r => 'error' in r && r.error);
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Regex Input */}
      <div>
        <label htmlFor="regex-input" className="block text-sm font-medium text-gray-700 mb-2">
          Regular Expression Pattern
        </label>
        <input
          id="regex-input"
          type="text"
          value={regex}
          onChange={(e) => onRegexChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent font-mono text-sm ${
            hasValidRegex && allCorrect
              ? 'border-green-500 focus:ring-green-500' 
              : hasValidRegex
              ? 'border-yellow-500 focus:ring-yellow-500'
              : 'border-red-500 focus:ring-red-500'
          }`}
          placeholder="e.g., [A-Z]+-\\d+"
        />
      </div>
      
      {/* Common Patterns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Patterns
        </label>
        <div className="flex flex-wrap gap-2">
          {commonPatterns.map((pattern) => (
            <Button
              key={pattern.pattern}
              variant="secondary"
              className="text-xs px-2 py-1"
              onClick={() => onRegexChange(pattern.pattern)}
            >
              {pattern.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Examples Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Examples
        </label>
        
        {/* Add new example */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            placeholder="Add example text (e.g., feature/PROJ-123-description)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            onKeyPress={(e) => e.key === 'Enter' && addExample()}
          />
          <Button
            onClick={addExample}
            disabled={!newExample.trim()}
            variant="secondary"
            className="px-3 py-2 text-sm"
          >
            Add
          </Button>
        </div>
        
        {/* Example results */}
        <div className="space-y-2">
          {testResults.map((result) => (
            <div
              key={result.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                result.isCorrect 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={result.input}
                    onChange={(e) => updateExampleInput(result.id, e.target.value)}
                    className="bg-white px-2 py-1 rounded text-sm border font-mono flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter test text..."
                  />
                  
                  {/* Status indicator */}
                  <div className="flex items-center gap-1">
                    {result.isCorrect ? (
                      <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    {result.found && result.extractedId && (
                      <span className="text-sm font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                        Found: {result.extractedId}
                      </span>
                    )}
                    
                    {!result.found && result.expected && (
                      <span className="text-sm text-red-700">
                        Expected match
                      </span>
                    )}
                    
                    {result.found && !result.expected && (
                      <span className="text-sm text-red-700">
                        Unexpected match
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-3">
                <Button
                  onClick={() => toggleExpected(result.id)}
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  title={result.expected ? "Click if this should NOT match" : "Click if this should match"}
                >
                  {result.expected ? "Should match" : "Should not match"}
                </Button>
                <Button
                  onClick={() => removeExample(result.id)}
                  variant="secondary"
                  className="text-xs px-2 py-1 text-red-600 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        {testResults.length > 0 && (
          <div className={`mt-3 p-3 rounded-lg ${
            allCorrect && hasValidRegex
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className="text-sm font-medium">
              {allCorrect && hasValidRegex ? (
                <span className="text-green-800">✅ All tests pass! This regex looks good.</span>
              ) : hasValidRegex ? (
                <span className="text-yellow-800">⚠️ Some tests failing. Adjust the regex or example expectations.</span>
              ) : (
                <span className="text-red-800">❌ Invalid regex pattern.</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}