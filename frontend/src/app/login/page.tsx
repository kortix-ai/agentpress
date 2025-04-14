import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import GoogleSignIn from "@/components/GoogleSignIn";

export default function Login({
  searchParams,
}: {
  searchParams: { message: string, returnUrl?: string, mode?: 'signin' | 'signup' };
}) {
  const isSignUp = searchParams.mode === 'signup';

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
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (!email || !email.includes('@')) {
      return { message: "Please enter a valid email address" };
    }
    
    if (!password || password.length < 6) {
      return { message: "Password must be at least 6 characters" };
    }

    if (password !== confirmPassword) {
      return { message: "Passwords do not match" };
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
    <div className="flex min-h-screen">
      {/* Left side - Login Form */}
      <div className="w-1/2 flex items-center justify-center px-16 bg-white dark:bg-[#121212]">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-3 text-black dark:text-white">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Privacy-first AI that helps you create in confidence.
            </p>
          </div>

          <div className="mb-8">
            <GoogleSignIn returnUrl={searchParams.returnUrl} />
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-[#121212] text-gray-500">OR</span>
            </div>
          </div>

          <form className="space-y-5">
            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email address"
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-secondary text-black dark:text-white"
                required
              />
            </div>
            
            <div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-secondary text-black dark:text-white"
                required
              />
            </div>

            {isSignUp && (
              <div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-secondary text-black dark:text-white"
                  required
                />
              </div>
            )}
            
            <div className="space-y-4">
              {!isSignUp ? (
                <>
                  <SubmitButton
                    formAction={signIn}
                    className="w-full bg-black dark:bg-white text-white dark:text-black rounded-lg py-3 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                    pendingText="Signing in..."
                  >
                    Sign in
                  </SubmitButton>
                  
                  <Link
                    href={`/login?mode=signup${searchParams.returnUrl ? `&returnUrl=${searchParams.returnUrl}` : ''}`}
                    className="block w-full text-center border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg py-3"
                  >
                    Create new account
                  </Link>
                </>
              ) : (
                <>
                  <SubmitButton
                    formAction={signUp}
                    className="w-full bg-black dark:bg-white text-white dark:text-black rounded-lg py-3 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                    pendingText="Creating account..."
                  >
                    Sign up
                  </SubmitButton>
                  
                  <Link
                    href={`/login${searchParams.returnUrl ? `?returnUrl=${searchParams.returnUrl}` : ''}`}
                    className="block w-full text-center border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg py-3"
                  >
                    Back to sign in
                  </Link>
                </>
              )}
            </div>

            {!isSignUp && (
              <div className="text-center">
                <Link href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            {searchParams?.message && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-center text-sm">
                {searchParams.message}
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <Link href="/privacy" className="text-black dark:text-white hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}<Link href="/privacy" className="text-black dark:text-white hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
      {/* Right side - Video Background */}
      <div className="w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/80 z-10"></div>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/worldoscollage.mp4" type="video/mp4" />
        </video>
        <img 
          src="/mac.png" 
          alt="Mac" 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 object-contain z-20"
        />
        <div className="relative z-30 flex items-center p-16">
          <div className="text-left text-white">
            <h2 className="text-2xl font-bold mb-6">General AI Agent,<br/>That do tasks for you</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
