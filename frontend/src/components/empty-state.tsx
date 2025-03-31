import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    isLoading?: boolean;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-primary/70" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 text-center max-w-md">
        {description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="flex items-center gap-1.5"
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