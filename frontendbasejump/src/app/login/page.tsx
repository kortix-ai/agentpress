import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

export default function Login({
  searchParams,
}: {
  searchParams: { message: string, returnUrl?: string };
}) {
  const signIn = async (prevState: any, formData: FormData) => {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    if (!email || !email.includes('@')) {
      return { message: "Please enter a valid email address" };
    }
    
    if (!password || password.length < 6) {
      return { message: "Password must be at least 6 characters" };
    }

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { message: error.message || "Could not authenticate user" };
    }

    return redirect(searchParams.returnUrl || "/dashboard");
  };

  const signUp = async (prevState: any, formData: FormData) => {
    "use server";

    const origin = headers().get("origin");
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    if (!email || !email.includes('@')) {
      return { message: "Please enter a valid email address" };
    }
    
    if (!password || password.length < 6) {
      return { message: "Password must be at least 6 characters" };
    }

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?returnUrl=${searchParams.returnUrl}`,
      },
    });

    if (error) {
      return { message: error.message || "Could not create account" };
    }

    // Try to sign in immediately
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      return { message: "Account created! Check your email to confirm your registration." };
    }

    return redirect(searchParams.returnUrl || "/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFCF5] dark:bg-[#121212] py-16 px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-serif tracking-tight mb-4 text-black dark:text-white">
            Your ideas,<br />amplified
          </h1>
          <p className="text-xl text-neutral-700 dark:text-neutral-300">
            Privacy-first AI that helps you create in confidence.
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6">
            <button
              className="w-full flex items-center justify-center bg-white dark:bg-background-secondary text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-full py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#FFFCF5] dark:bg-[#121212] text-gray-500">
                OR
              </span>
            </div>
          </div>

          <form className="space-y-4">
            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email address"
                className="w-full h-14 px-4 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-secondary text-black dark:text-white"
                required
              />
            </div>
            
            <div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className="w-full h-14 px-4 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-secondary text-black dark:text-white"
                required
              />
            </div>
            
            <div className="pt-2 space-y-3">
              <SubmitButton
                formAction={signIn}
                className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full py-3 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                pendingText="Signing in..."
              >
                Sign in
              </SubmitButton>
              
              <SubmitButton
                formAction={signUp}
                variant="outline"
                className="w-full border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full py-3"
                pendingText="Creating account..."
              >
                Create new account
              </SubmitButton>
            </div>
            
            <div className="text-center pt-1">
              <Link href="#" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            
            {searchParams?.message && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-center text-sm">
                {searchParams.message}
              </div>
            )}
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            By continuing, you acknowledge our{' '}
            <Link href="/privacy" className="text-black dark:text-white hover:underline">
              Privacy Policy
            </Link>.
          </div>
          
          <div className="mt-16">
            <button className="mx-auto flex items-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition">
              Learn more <ChevronDown className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
