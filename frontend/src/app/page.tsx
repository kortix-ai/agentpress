'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, Database, Play, Zap, Brain, Calculator, Image } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // If still loading or user is authenticated (redirecting), show loading
  if (isLoading || user) {
    return null;
  }

  return (
    <div className="flex flex-col overflow-auto min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-6">AgentPress</h1>
          <p className="text-xl text-zinc-600 mb-6 max-w-2xl mx-auto">
            A meticulously AI-powered search engine with RAG and search grounding capabilities. Clean interface and built for everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button size="lg" className="bg-black hover:bg-zinc-800" asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-zinc-200" asChild>
              <Link href="/auth/login">Try Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* RAG & Search Grounding */}
      <section className="py-16 bg-zinc-50 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-medium text-center mb-10">RAG & Search Grounding</h2>
          <div className="bg-white rounded-lg shadow-sm border border-zinc-100 p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-3 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-1">
                  <span className="text-zinc-500">1</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Enable modern RAG capabilities in your real-world applications</h3>
                  <p className="text-zinc-500 text-sm">Semantic search provides better context for AI agents</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 rounded-lg bg-green-50">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-1 text-green-600">
                  <span>2</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1 text-green-700">Prioritized instant search</h3>
                  <p className="text-green-600 text-sm">Get results as you type for a responsive experience</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-3 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-1 text-blue-600">
                  <span>3</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Integration is just a few lines of code for "information access"</h3>
                  <p className="text-zinc-500 text-sm">Simple API to connect to your comprehensive search</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Powered By */}
      <section className="py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-medium mb-10">Powered By</h2>
          <div className="flex justify-center gap-12">
            <div className="flex flex-col items-center">
              <div className="border border-zinc-200 rounded-lg p-6 bg-white shadow-sm w-40 h-20 flex items-center justify-center">
                <svg className="h-6" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#000000"/>
                </svg>
              </div>
              <p className="text-xs text-zinc-500 mt-3">Deployed on Vercel</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="border border-zinc-200 rounded-lg p-6 bg-white shadow-sm w-40 h-20 flex items-center justify-center">
                <svg className="h-6" viewBox="0 0 95 95" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="95" height="95" rx="47.5" fill="#F0F0F0"/>
                  <path d="M30 47.5C30 37.835 37.835 30 47.5 30V65C37.835 65 30 57.165 30 47.5Z" fill="#000000"/>
                  <path d="M47.5 30C57.165 30 65 37.835 65 47.5C65 57.165 57.165 65 47.5 65V30Z" fill="#666666"/>
                </svg>
              </div>
              <p className="text-xs text-zinc-500 mt-3">Design by Tekky</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-6 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold">350K+</h3>
            <p className="text-sm text-zinc-500">Requests Processed</p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold">100K+</h3>
            <p className="text-sm text-zinc-500">Active Users</p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold">7K+</h3>
            <p className="text-sm text-zinc-500">Connections Built</p>
          </div>
        </div>
      </section>

      {/* Featured on Vercel's Blog */}
      <section className="py-16 px-6 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-medium mb-6">Featured on Vercel's Blog</h2>
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/2">
              <p className="text-sm mb-4">
                Recognized for our innovative use of AI technology and its integration for a seamless experience. Our approach to developer community growth stands out.
              </p>
              <Link href="#" className="text-sm text-black font-medium hover:underline">
                Read the feature →
              </Link>
            </div>
            <div className="md:w-1/2 bg-zinc-100 h-48 rounded-lg"></div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-medium text-center mb-12">Advanced Search Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-zinc-100 rounded-lg p-6 bg-white">
              <div className="mb-4 w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                <Search className="h-5 w-5 text-zinc-600" />
              </div>
              <h3 className="text-md font-medium mb-2">Smart Understanding</h3>
              <p className="text-sm text-zinc-500">Easily analyze content and context for better search results</p>
            </div>
            
            <div className="border border-zinc-100 rounded-lg p-6 bg-white">
              <div className="mb-4 w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                <Image className="h-5 w-5 text-zinc-600" />
              </div>
              <h3 className="text-md font-medium mb-2">Image Understanding</h3>
              <p className="text-sm text-zinc-500">Get contextual responses based on visual inputs</p>
            </div>
            
            <div className="border border-zinc-100 rounded-lg p-6 bg-white">
              <div className="mb-4 w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-zinc-600" />
              </div>
              <h3 className="text-md font-medium mb-2">Smart Calculations</h3>
              <p className="text-sm text-zinc-500">Perform complex math and calculations in real-time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Built For Everyone */}
      <section className="py-16 px-6 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-medium text-center mb-12">Built For Everyone</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-medium mb-4">Students</h3>
              <ul className="space-y-2">
                <li className="text-sm text-zinc-600">• Research paper analysis</li>
                <li className="text-sm text-zinc-600">• Complex calculations</li>
                <li className="text-sm text-zinc-600">• Study guidance</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Researchers</h3>
              <ul className="space-y-2">
                <li className="text-sm text-zinc-600">• Access to paper archives</li>
                <li className="text-sm text-zinc-600">• Data visualization</li>
                <li className="text-sm text-zinc-600">• Citation formatting</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Professionals</h3>
              <ul className="space-y-2">
                <li className="text-sm text-zinc-600">• Market research</li>
                <li className="text-sm text-zinc-600">• Technical troubleshooting</li>
                <li className="text-sm text-zinc-600">• Code reviews</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-100 text-center text-sm text-zinc-500">
        <p>© 2023 AgentPress. All rights reserved.</p>
      </footer>
    </div>
  );
}
