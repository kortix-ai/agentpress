'use client';

import { useEffect, useState } from 'react';
import './globals.css';
import { Inter } from 'next/font/google';
import { MainNav } from '@/components/layout/main-nav';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkApiConnection() {
      try {
        // Get auth token from Supabase
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        // Add auth token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Try to access an authenticated endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/health-check`, {
          method: 'GET',
          headers,
        });
        
        setApiConnected(response.ok);
        
        if (!response.ok) {
          console.error('Backend API is not responding:', response.status, response.statusText);
          toast.error('Cannot connect to backend API. Some features may not work.');
        }
      } catch (error) {
        console.error('Error connecting to backend API:', error);
        setApiConnected(false);
        toast.error('Cannot connect to backend API. Some features may not work.');
      }
    }
    
    checkApiConnection();
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <MainNav />
          {apiConnected === false && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 mx-4 mt-2" role="alert">
              <p className="font-bold">Warning</p>
              <p>Could not connect to backend API. Agent and thread features may not work properly.</p>
            </div>
          )}
          <main className="min-h-screen">{children}</main>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
