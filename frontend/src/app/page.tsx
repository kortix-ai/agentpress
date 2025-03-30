'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <section className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-100">
        <div className="container px-4 py-24 mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              AgentPress
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              Build beautiful, responsive web applications using AI agents. Describe your project,
              and our agents will help you create it efficiently.
            </p>
            <div className="mt-10 flex justify-center gap-x-6">
              {!isLoading && (
                user ? (
                  <Link href="/projects">
                    <Button size="lg">Go to Projects</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/login">
                      <Button variant="outline" size="lg">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button size="lg">Sign up</Button>
                    </Link>
                  </>
                )
              )}
            </div>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Create Projects</h3>
                <p className="text-gray-600">
                  Organize your work into projects for better management and collaboration.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Threads & Conversations</h3>
                <p className="text-gray-600">
                  Each project supports multiple threads for different aspects of your work.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">AI-Powered Agents</h3>
                <p className="text-gray-600">
                  Get help from advanced AI agents that can understand your requirements and assist in development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
