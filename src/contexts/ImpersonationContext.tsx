import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ImpersonationState {
  isImpersonating: boolean;
  businessId: string | null;
  businessName: string | null;
  ownerId: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (businessId: string, businessName: string, ownerId: string) => void;
  exitImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'velo_impersonation';

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>(() => {
    // Restore from sessionStorage on mount
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to restore impersonation state:', e);
    }
    return {
      isImpersonating: false,
      businessId: null,
      businessName: null,
      ownerId: null,
    };
  });

  const startImpersonation = useCallback((businessId: string, businessName: string, ownerId: string) => {
    const newState = {
      isImpersonating: true,
      businessId,
      businessName,
      ownerId,
    };
    setState(newState);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  const exitImpersonation = useCallback(() => {
    const newState = {
      isImpersonating: false,
      businessId: null,
      businessName: null,
      ownerId: null,
    };
    setState(newState);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ImpersonationContext.Provider value={{ ...state, startImpersonation, exitImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
