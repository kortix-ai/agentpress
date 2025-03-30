'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const confirmEmail = async () => {
      if (!code) return;

      try {
        setIsConfirmed(true);
        const supabase = createClient();
        
        try {
          // Try to exchange the code for a session, but don't block on errors
          await supabase.auth.exchangeCodeForSession(code);
          toast.success('Email confirmed successfully!');
        } catch (sessionErr) {
          console.error('Session exchange error:', sessionErr);
          // Continue even if this fails
        }
      } catch (err: any) {
        console.error('Confirmation error:', err);
        toast.error(err.message || 'Failed to confirm email');
      }
    };

    confirmEmail();
  }, [code, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full py-8">
      <div className="w-full max-w-md mx-auto px-8">
        <div className="flex items-center justify-center mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-8 w-8"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-2xl font-bold">AgentPress</span>
        </div>
        
        <div className="bg-white p-8 rounded-lg border shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {code ? 'Email verification' : 'Confirm your email'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {code
                ? isConfirmed 
                  ? 'Your email has been verified!' 
                  : 'Please wait while we verify your email...'
                : 'Please check your email for the confirmation link.'}
            </p>
          </div>
          
          {!code && (
            <div className="text-sm text-muted-foreground mb-6">
              If you haven&apos;t received the email, please check your spam folder or try signing up again.
            </div>
          )}
          
          <div className="flex flex-col space-y-3">
            {isConfirmed ? (
              <Button
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Continue to sign in
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/auth/signup')}
              >
                {code ? 'Back to sign up' : 'Try again'}
              </Button>
            )}
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isConfirmed ? (
                'Thank you for verifying your email!'
              ) : (
                <>
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 