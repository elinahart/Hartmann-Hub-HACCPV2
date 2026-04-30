import React, { useState, useEffect, useCallback, useRef } from 'react';

export function useAutoDraft<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void, boolean] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(`draft_${key}`);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const [isRestored, setIsRestored] = useState(() => {
    try {
        return !!localStorage.getItem(`draft_${key}`);
    } catch {
        return false;
    }
  });
  
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    const timeoutId = setTimeout(() => {
      // Don't save draft if it equals initial value
      if (JSON.stringify(state) !== JSON.stringify(initialValue)) {
        localStorage.setItem(`draft_${key}`, JSON.stringify(state));
        setIsRestored(true);
      } else {
        localStorage.removeItem(`draft_${key}`);
        setIsRestored(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [state, key, initialValue]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`draft_${key}`);
    setIsRestored(false);
    setState(initialValue); // Reset to initial
  }, [key, initialValue]);

  return [state, setState, clearDraft, isRestored];
}
