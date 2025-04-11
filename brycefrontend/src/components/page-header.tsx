import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    isLoading?: boolean;
  };
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button 
          onClick={action.onClick}
          className="flex items-center gap-2"
          disabled={action.isLoading}
        >
          {action.isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </>
          )}
        </Button>
      )}
    </div>
  );
} 