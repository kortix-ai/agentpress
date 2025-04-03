'use client';

import FeatureShowcase from '@/components/FeatureShowcase';

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Product Demos</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience our AI-powered features that make your workflow more efficient and productive.
          </p>
        </div>
      </div>
      
      <FeatureShowcase />
      
      <div className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to try it out?</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
              Our AI-powered tools help you write better, faster, and more effectively.
            </p>
            <div className="flex justify-center">
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 