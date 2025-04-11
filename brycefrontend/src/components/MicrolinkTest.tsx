import React, { useEffect, useState } from 'react';
import mql from '@microlink/mql';

interface MicrolinkResult {
  status: 'success' | 'error';
  data: {
    title?: string;
    description?: string;
    image?: {
      url?: string;
    };
    [key: string]: unknown;
  };
}

export function MicrolinkTest() {
  const [result, setResult] = useState<MicrolinkResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testMicrolink() {
      try {
        console.log('🚀 BEFORE MICROLINK API CALL');
        console.log('Attempting to fetch data from: https://github.com/microlinkhq');
        
        // Example using the exact code from the query
        const { status, data } = await mql('https://github.com/microlinkhq');
        
        console.log('🎯 AFTER MICROLINK API CALL - SUCCESS');
        console.log('Status:', status);
        console.log('Data:', data);
        
        console.log('Rendering data with mql.render():');
        mql.render(data);
        
        setResult({ status, data });
      } catch (error) {
        console.log('🛑 AFTER MICROLINK API CALL - ERROR');
        console.error('Error occurred:', error);
      } finally {
        setLoading(false);
      }
    }
    
    testMicrolink();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Microlink Test</h2>
      
      {loading ? (
        <div>Loading...</div>
      ) : result ? (
        <div>
          <div className="mb-2">Status: {result.status}</div>
          {result.data.title && <h3 className="text-lg font-semibold">{result.data.title}</h3>}
          {result.data.description && <p>{result.data.description}</p>}
          {result.data.image?.url && (
            <img 
              src={result.data.image.url} 
              alt="Preview" 
              className="max-w-md mt-2"
            />
          )}
          <pre className="mt-4 p-2 bg-gray-100 overflow-auto">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      ) : (
        <div>Error loading data</div>
      )}
    </div>
  );
} 