'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth-layout';
import { UserPlus } from 'lucide-react';

function SignupContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) throw error;

      toast.success('Check your email to confirm your account!');
      router.push('/auth/confirm');
    } catch (err: Error | unknown) {
      console.error('Signup error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email below to create your account
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            disabled={isLoading}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <Button
          type="submit"
          className="w-full mt-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Create account
            </>
          )}
        </Button>
      </form>
      
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
      
      <p className="mt-3 text-center text-xs text-muted-foreground">
        By clicking continue, you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Loading...</h1>
          <p className="text-sm text-muted-foreground mt-1">Please wait while we load the signup form...</p>
        </div>
      }>
        <SignupContent />
      </Suspense>
    </AuthLayout>
  );
} 