import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { PlanComparison } from "./PlanComparison";

interface BillingErrorAlertProps {
  message?: string;
  currentUsage?: number;
  limit?: number;
  accountId: string | null | undefined;
  onDismiss?: () => void;
  className?: string;
  isOpen: boolean;
}

export function BillingErrorAlert({
  message,
  currentUsage,
  limit,
  accountId,
  onDismiss,
  className = "",
  isOpen
}: BillingErrorAlertProps) {
  const returnUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
          onClick={onDismiss}
          aria-hidden="true"
        />
        
        {/* Modal */}
        <div 
          className={`relative bg-background rounded-xl shadow-2xl w-full max-w-3xl mx-4 transform transition-all duration-200 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-modal-title"
        >
          <div className="p-6">
            {/* Close button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-destructive/10 rounded-full mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h2 id="billing-modal-title" className="text-2xl font-semibold mb-2">Usage Limit Reached</h2>
              <p className="text-base text-muted-foreground">
                {message || "You've reached your monthly usage limit."}
              </p>
            </div>

            {/* Usage Stats */}
            {currentUsage !== undefined && limit !== undefined && (
              <div className="mb-8 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-sm font-medium">Current Usage</p>
                    <p className="text-2xl font-bold">{currentUsage} hours</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Monthly Limit</p>
                    <p className="text-2xl font-bold">{limit} hours</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-background rounded-full">
                  <div 
                    className="h-full bg-destructive rounded-full transition-all"
                    style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Plans Comparison */}
            <PlanComparison
              accountId={accountId}
              returnUrl={returnUrl}
              className="mb-6"
            />

            {/* Dismiss Button */}
            {onDismiss && (
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground" 
                onClick={onDismiss}
              >
                Continue with Current Plan
              </Button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
} 