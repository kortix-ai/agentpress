import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  icon?: LucideIcon;
}

export function AuthLayout({ children, icon: Icon }: AuthLayoutProps) {
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