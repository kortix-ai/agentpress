'use client';

import LinkPreviewTest from '@/components/views/link-preview-test';

export default function PreviewTestPage() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Link Preview Test</h1>
      <p className="text-zinc-600 mb-6">Testing the link-preview-js implementation with sample URLs</p>
      
      <div className="border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
        <LinkPreviewTest />
      </div>
    </div>
  );
} 