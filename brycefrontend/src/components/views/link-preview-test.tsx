import React, { useState, useEffect } from 'react';
import { SearchResultsView } from './search-results-view';

interface SampleResult {
  fileName: string;
  line: number;
  content: string;
  matches?: { start: number; end: number }[];
  url: string;
}

export default function LinkPreviewTest() {
  const [results, setResults] = useState<SampleResult[]>([]);

  useEffect(() => {
    // Sample URLs for testing
    const sampleUrls: SampleResult[] = [
      {
        fileName: 'GitHub',
        line: 1,
        content: 'GitHub is where over 100 million developers shape the future of software',
        url: 'https://github.com'
      },
      {
        fileName: 'YouTube',
        line: 1,
        content: 'Video sharing platform',
        url: 'https://youtube.com'
      },
      {
        fileName: 'Wikipedia',
        line: 1,
        content: 'The free encyclopedia',
        url: 'https://wikipedia.org'
      },
      {
        fileName: 'React Documentation',
        line: 1,
        content: 'React is a JavaScript library for building user interfaces',
        url: 'https://react.dev'
      },
      {
        fileName: 'Twitter',
        line: 1,
        content: 'Social media platform',
        url: 'https://twitter.com'
      }
    ];

    setResults(sampleUrls);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Link Preview Test</h1>
      <div className="border border-zinc-200 rounded-lg">
        <SearchResultsView results={results} />
      </div>
    </div>
  );
} 