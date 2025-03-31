import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-8">
        <Card className="p-8">
          {children}
        </Card>
      </div>
    </div>
  );
} 