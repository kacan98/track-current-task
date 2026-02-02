import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { API_ROUTES } from '@shared/apiRoutes';
import type { Check } from '@shared/github.model';

interface Step {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

interface CheckLog {
  checkName: string;
  conclusion: string;
  startedAt: string;
  completedAt: string;
  url: string;
  steps: Step[];
  logs: string | null;
}

interface CheckLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkId: number;
  checkName: string;
  repoFullName: string;
  allFailedChecks?: Check[] | undefined;
}

// Parse logs into sections by step
function parseLogsByStep(rawLogs: string, steps: Step[]): Map<number, string> {
  const stepLogs = new Map<number, string>();
  const lines = rawLogs.split('\n');
  let currentStepNumber = 0;
  let currentStepLines: string[] = [];

  const stepNameToNumber = new Map<string, number>();
  steps.forEach(s => stepNameToNumber.set(s.name.toLowerCase(), s.number));

  for (const line of lines) {
    const groupMatch = line.match(/##\[group\](.+)/);
    if (groupMatch) {
      if (currentStepNumber > 0 && currentStepLines.length > 0) {
        stepLogs.set(currentStepNumber, currentStepLines.join('\n'));
      }

      const stepName = groupMatch[1].trim().toLowerCase();
      const matchedNumber = stepNameToNumber.get(stepName);
      if (matchedNumber) {
        currentStepNumber = matchedNumber;
      } else {
        for (const [name, num] of stepNameToNumber.entries()) {
          if (stepName.includes(name) || name.includes(stepName)) {
            currentStepNumber = num;
            break;
          }
        }
      }
      currentStepLines = [];
      continue;
    }

    if (line.includes('##[endgroup]')) {
      if (currentStepNumber > 0 && currentStepLines.length > 0) {
        stepLogs.set(currentStepNumber, currentStepLines.join('\n'));
      }
      currentStepNumber = 0;
      currentStepLines = [];
      continue;
    }

    currentStepLines.push(line);
  }

  if (currentStepNumber > 0 && currentStepLines.length > 0) {
    stepLogs.set(currentStepNumber, currentStepLines.join('\n'));
  }

  return stepLogs;
}

export function CheckLogsModal({ isOpen, onClose, checkId, checkName, repoFullName, allFailedChecks }: CheckLogsModalProps) {
  const [currentCheckId, setCurrentCheckId] = useState(checkId);
  const [currentCheckName, setCurrentCheckName] = useState(checkName);
  const [logs, setLogs] = useState<CheckLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentCheckId(checkId);
      setCurrentCheckName(checkName);
      setSearchInput('');
      setDebouncedSearchTerm('');
      setCurrentMatch(0);
      setTotalMatches(0);
      setSelectedStep(null);
    }
  }, [isOpen, checkId, checkName]);

  // Fetch logs when check changes
  useEffect(() => {
    if (isOpen && currentCheckId) {
      fetchLogs(currentCheckId);
      setSelectedStep(null);
    }
  }, [isOpen, currentCheckId]);

  // Scroll to bottom when logs are loaded
  useEffect(() => {
    if (logs?.logs && !debouncedSearchTerm && selectedStep === null && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs?.logs, selectedStep]);

  // Scroll to top when step is selected
  useEffect(() => {
    if (selectedStep !== null && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [selectedStep]);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchInput.trim()) {
      setDebouncedSearchTerm('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  const fetchLogs = async (checkIdToFetch: number) => {
    setLoading(true);
    setError(null);

    try {
      const [owner, repo] = repoFullName.split('/');
      const response = await fetch(`/api${API_ROUTES.GITHUB.CHECK_LOGS(owner, repo, checkIdToFetch)}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch check logs');
      setLogs(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedStep !== null) {
        setSelectedStep(null);
      } else {
        onClose();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('log-search-input')?.focus();
    }
    if (e.key === 'Enter' && document.activeElement?.id === 'log-search-input') {
      e.preventDefault();
      if (e.shiftKey) goToPrevMatch();
      else goToNextMatch();
    }
  }, [selectedStep, onClose]);

  const formatDuration = (start: string, end: string) => {
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const formatLogs = useCallback((rawLogs: string): string => {
    let formatted = rawLogs.replace(/\x1b\[[0-9;]*m/g, '');
    formatted = formatted.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/gm, '');
    formatted = formatted.replace(/##\[(group|endgroup)\].*$/gm, '');
    formatted = formatted.replace(/##\[(error|warning|notice|debug)\]/g, '');
    return formatted.trim();
  }, []);

  const stepLogs = useMemo(() => {
    if (!logs?.logs || !logs.steps?.length) return new Map<number, string>();
    return parseLogsByStep(logs.logs, logs.steps);
  }, [logs?.logs, logs?.steps]);

  const displayLogs = useMemo(() => {
    if (!logs?.logs) return '';
    if (selectedStep !== null) {
      const stepLog = stepLogs.get(selectedStep);
      if (stepLog) return formatLogs(stepLog);
    }
    return formatLogs(logs.logs);
  }, [logs?.logs, selectedStep, stepLogs, formatLogs]);

  const highlightedContent = useMemo(() => {
    if (!displayLogs) return null;
    if (!debouncedSearchTerm.trim()) return displayLogs;

    const escapedSearch = debouncedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = displayLogs.split(new RegExp(`(${escapedSearch})`, 'gi'));
    let matchIndex = 0;

    return parts.map((part, i) => {
      if (part.toLowerCase() === debouncedSearchTerm.toLowerCase()) {
        matchIndex++;
        const isCurrentMatch = matchIndex === currentMatch;
        return (
          <mark
            key={i}
            id={isCurrentMatch ? 'current-match' : undefined}
            className={isCurrentMatch ? 'bg-yellow-400 text-black' : 'bg-yellow-200 text-black'}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  }, [displayLogs, debouncedSearchTerm, currentMatch]);

  useEffect(() => {
    if (!displayLogs || !debouncedSearchTerm.trim()) {
      setTotalMatches(0);
      setCurrentMatch(0);
      return;
    }
    const regex = new RegExp(debouncedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = displayLogs.match(regex);
    setTotalMatches(matches?.length || 0);
    setCurrentMatch(matches?.length ? 1 : 0);
  }, [debouncedSearchTerm, displayLogs]);

  useEffect(() => {
    if (currentMatch > 0) {
      setTimeout(() => {
        document.getElementById('current-match')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [currentMatch, highlightedContent]);

  const goToNextMatch = useCallback(() => {
    if (totalMatches > 0) setCurrentMatch(prev => prev >= totalMatches ? 1 : prev + 1);
  }, [totalMatches]);

  const goToPrevMatch = useCallback(() => {
    if (totalMatches > 0) setCurrentMatch(prev => prev <= 1 ? totalMatches : prev - 1);
  }, [totalMatches]);

  const getStepIcon = (step: Step) => {
    if (step.status === 'completed') {
      if (step.conclusion === 'success') return { icon: 'check_circle', color: 'text-green-500' };
      if (step.conclusion === 'failure') return { icon: 'cancel', color: 'text-red-500' };
      if (step.conclusion === 'skipped') return { icon: 'skip_next', color: 'text-gray-400' };
    }
    if (step.status === 'in_progress') return { icon: 'pending', color: 'text-yellow-500 animate-spin' };
    return { icon: 'circle', color: 'text-gray-400' };
  };

  const handleCheckSwitch = (check: Check) => {
    setCurrentCheckId(check.id);
    setCurrentCheckName(check.name);
    setSearchInput('');
    setDebouncedSearchTerm('');
    setCurrentMatch(0);
    setTotalMatches(0);
    setSelectedStep(null);
  };

  const handleStepClick = (stepNumber: number) => {
    setSelectedStep(selectedStep === stepNumber ? null : stepNumber);
    setSearchInput('');
    setDebouncedSearchTerm('');
    setCurrentMatch(0);
    setTotalMatches(0);
  };

  if (!isOpen) return null;

  const hasMultipleChecks = allFailedChecks && allFailedChecks.length > 1;
  const selectedStepInfo = selectedStep !== null ? logs?.steps?.find(s => s.number === selectedStep) : null;

  const header = (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="material-symbols-outlined text-red-600 flex-shrink-0">cancel</span>
        <div className="min-w-0 flex-1">
          {hasMultipleChecks ? (
            <div className="flex items-center gap-2">
              <select
                value={currentCheckId}
                onChange={(e) => {
                  const check = allFailedChecks.find(c => c.id === Number(e.target.value));
                  if (check) handleCheckSwitch(check);
                }}
                className="text-lg font-semibold text-gray-900 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-md truncate"
              >
                {allFailedChecks.map(check => (
                  <option key={check.id} value={check.id}>{check.name}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                ({allFailedChecks.findIndex(c => c.id === currentCheckId) + 1}/{allFailedChecks.length} failed)
              </span>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-gray-900 truncate">{currentCheckName}</h2>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{repoFullName}</span>
            {logs?.startedAt && logs?.completedAt && (
              <span>• Duration: {formatDuration(logs.startedAt, logs.completedAt)}</span>
            )}
            {selectedStepInfo && (
              <span className="text-blue-600 font-medium">• Viewing: {selectedStepInfo.name}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasMultipleChecks && (
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => {
                const currentIdx = allFailedChecks.findIndex(c => c.id === currentCheckId);
                const prevIdx = currentIdx <= 0 ? allFailedChecks.length - 1 : currentIdx - 1;
                handleCheckSwitch(allFailedChecks[prevIdx]);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Previous failed check"
            >
              <span className="material-symbols-outlined text-gray-600" style={{ fontSize: '20px' }}>chevron_left</span>
            </button>
            <button
              onClick={() => {
                const currentIdx = allFailedChecks.findIndex(c => c.id === currentCheckId);
                const nextIdx = currentIdx >= allFailedChecks.length - 1 ? 0 : currentIdx + 1;
                handleCheckSwitch(allFailedChecks[nextIdx]);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Next failed check"
            >
              <span className="material-symbols-outlined text-gray-600" style={{ fontSize: '20px' }}>chevron_right</span>
            </button>
          </div>
        )}
        {logs?.url && (
          <a
            href={logs.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
            GitHub
          </a>
        )}
        <Button onClick={onClose} variant="secondary" className="p-1 w-8 h-8 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-500">close</span>
        </Button>
      </div>
    </>
  );

  const footer = (
    <div className="flex justify-end">
      <Button variant="secondary" onClick={onClose}>Close</Button>
    </div>
  );

  return (
    <Modal
      onClose={onClose}
      maxWidth="full"
      height="full"
      header={header}
      footer={footer}
      onKeyDown={handleKeyDown}
    >
      {/* Search bar */}
      {logs?.logs && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>search</span>
          <input
            id="log-search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search logs... (Ctrl+F, Enter for next)"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchInput && (
            <>
              <span className="text-sm text-gray-600">
                {isSearching ? <span className="text-gray-400">Searching...</span> : totalMatches > 0 ? `${currentMatch}/${totalMatches}` : 'No matches'}
              </span>
              <button onClick={goToPrevMatch} disabled={totalMatches === 0 || isSearching} className="p-1 hover:bg-gray-200 rounded disabled:opacity-50" title="Previous match (Shift+Enter)">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>keyboard_arrow_up</span>
              </button>
              <button onClick={goToNextMatch} disabled={totalMatches === 0 || isSearching} className="p-1 hover:bg-gray-200 rounded disabled:opacity-50" title="Next match (Enter)">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>keyboard_arrow_down</span>
              </button>
              <button onClick={() => { setSearchInput(''); setDebouncedSearchTerm(''); }} className="p-1 hover:bg-gray-200 rounded">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </>
          )}
          {selectedStep !== null && (
            <Button onClick={() => setSelectedStep(null)} size="sm" variant="secondary" className="ml-2 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              Show all steps
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {loading && (
          <div className="flex items-center justify-center w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading logs...</span>
          </div>
        )}

        {error && (
          <div className="p-4 w-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
          </div>
        )}

        {logs && !loading && (
          <>
            {/* Steps sidebar */}
            {logs.steps && logs.steps.length > 0 && (
              <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-auto">
                <div className="p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Steps <span className="text-gray-400 font-normal ml-1">(click to filter)</span>
                  </h3>
                  <div className="space-y-1">
                    {logs.steps.map((step, idx) => {
                      const stepIcon = getStepIcon(step);
                      const isSelected = selectedStep === step.number;
                      const hasLogs = stepLogs.has(step.number);
                      return (
                        <button
                          key={idx}
                          onClick={() => handleStepClick(step.number)}
                          disabled={!hasLogs && step.conclusion === 'skipped'}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                            isSelected ? 'bg-blue-100 border border-blue-300' : step.conclusion === 'failure' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'
                          } ${!hasLogs && step.conclusion === 'skipped' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={hasLogs ? `View logs for: ${step.name}` : step.conclusion === 'skipped' ? 'Step was skipped' : step.name}
                        >
                          <span className={`material-symbols-outlined ${stepIcon.color} flex-shrink-0`} style={{ fontSize: '16px' }}>{stepIcon.icon}</span>
                          <span className={`truncate ${isSelected ? 'text-blue-700 font-medium' : step.conclusion === 'failure' ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                            {step.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Logs */}
            <div ref={logContainerRef} className="flex-1 overflow-auto bg-gray-900 p-4">
              {displayLogs ? (
                <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap break-words leading-relaxed">{highlightedContent}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <span className="material-symbols-outlined text-5xl mb-3">description</span>
                  <p>No logs available for this {selectedStep !== null ? 'step' : 'check'}.</p>
                  {selectedStep !== null && (
                    <button onClick={() => setSelectedStep(null)} className="text-blue-400 hover:text-blue-300 text-sm mt-2">Show all logs</button>
                  )}
                  {selectedStep === null && logs.url && (
                    <a href={logs.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm mt-2">View on GitHub</a>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
