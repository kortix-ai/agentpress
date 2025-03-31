import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="w-full h-full overflow-auto">
      <div className="w-full max-w-6xl mx-auto p-6">
        {children}
      </div>
    </div>
  );
} 