'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth-layout';
import { CheckCircle2, Mail } from 'lucide-react';

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
    <AuthLayout icon={isConfirmed ? CheckCircle2 : Mail}>
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
            <CheckCircle2 className="mr-2 h-4 w-4" />
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
    </AuthLayout>
  );
} 