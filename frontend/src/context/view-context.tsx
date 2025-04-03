'use client';

import React, { createContext, useContext, useState } from 'react';

interface ViewContextType {
  isDualView: boolean;
  toggleViewMode: () => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}

export const ViewProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDualView, setIsDualView] = useState(false);

  const toggleViewMode = () => {
    setIsDualView((prev) => !prev);
  };

  const value = {
    isDualView,
    toggleViewMode,
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}; 