import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface IntroductionContextType {
  showIntroduction: boolean;
  visitCount: number;
  forceShowIntroduction: () => void;
  handleIntroductionComplete: () => void;
  handleDontShowAgain: () => void;
}

const IntroductionContext = createContext<IntroductionContextType | undefined>(undefined);

export const useIntroduction = () => {
  const context = useContext(IntroductionContext);
  if (context === undefined) {
    throw new Error('useIntroduction must be used within an IntroductionProvider');
  }
  return context;
};

interface IntroductionProviderProps {
  children: ReactNode;
}

export const IntroductionProvider: React.FC<IntroductionProviderProps> = ({ children }) => {
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    // Get visit count from localStorage
    const storedVisitCount = parseInt(localStorage.getItem('visitCount') || '0', 10);
    
    // Increment visit count on each app load
    const newVisitCount = storedVisitCount + 1;
    setVisitCount(newVisitCount);
    localStorage.setItem('visitCount', newVisitCount.toString());
    
    // Determine if we should show introduction
    // Show if: forced OR (visit count <= 20 AND not manually dismissed)
    const shouldShow = forceShow || (newVisitCount <= 20);
    setShowIntroduction(shouldShow);
  }, [forceShow]);

  const forceShowIntroduction = () => {
    setForceShow(true);
    setShowIntroduction(true);
  };

  const handleIntroductionComplete = () => {
    setShowIntroduction(false);
    setForceShow(false);
  };

  const handleDontShowAgain = () => {
    // Set visit count to 100 to prevent auto-showing
    const highCount = 100;
    setVisitCount(highCount);
    localStorage.setItem('visitCount', highCount.toString());
    setShowIntroduction(false);
    setForceShow(false);
  };

  return (
    <IntroductionContext.Provider
      value={{
        showIntroduction,
        visitCount,
        forceShowIntroduction,
        handleIntroductionComplete,
        handleDontShowAgain,
      }}
    >
      {children}
    </IntroductionContext.Provider>
  );
};