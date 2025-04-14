import { useState, useCallback } from 'react';

interface BillingErrorState {
  message: string;
  currentUsage?: number;
  limit?: number;
  subscription?: {
    price_id?: string;
    current_usage?: number;
    limit?: number;
  };
}

export function useBillingError() {
  const [billingError, setBillingError] = useState<BillingErrorState | null>(null);

  const handleBillingError = useCallback((error: any) => {
    // Check if it's a billing error (402 status or message contains 'Payment Required')
    if (error.status === 402 || (error.message && error.message.includes('Payment Required'))) {
      const errorDetail = error.data?.detail || {};
      const subscription = errorDetail.subscription || {};
      
      setBillingError({
        message: errorDetail.message || "You've reached your monthly usage limit.",
        currentUsage: subscription.current_usage,
        limit: subscription.limit,
        subscription
      });
      return true;
    }
    return false;
  }, []);

  const clearBillingError = useCallback(() => {
    setBillingError(null);
  }, []);

  return {
    billingError,
    handleBillingError,
    clearBillingError
  };
} 