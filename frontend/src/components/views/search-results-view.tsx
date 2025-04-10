import React, { useEffect, useState } from 'react';
import Microlink from '@microlink/react';
import styled from 'styled-components';
import { Skeleton } from "@/components/ui/skeleton";

// Add mql for direct API access
// Note: Since we're using ESM, we need to import this way
import mql from '@microlink/mql';

interface MicrolinkData {
  title?: string;
  description?: string;
  lang?: string;
  author?: string;
  publisher?: string;
  image?: {
    url?: string;
    type?: string;
    size?: number;
    height?: number;
    width?: number;
  };
  logo?: {
    url?: string;
  };
  url: string;
  date?: string;
}

interface SearchResultsViewProps {
  links?: string[];
}

// Container for styling the Microlink cards
const MicrolinkCard = styled(Microlink)`
  border-radius: 0.375rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
  border: 1px solid #27272a;
  background-color: #18181b;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-color: #3f3f46;
  }
`;

// Mock links for testing - real Japan travel related links as seen in the image
const MOCK_LINKS = [
  'https://www.japan-guide.com/e/e2274.html',
  'https://www.japan-rail-pass.com/',
  'https://www.jrpass.com/japan-rail-pass-guide',
  'https://japanrailpass.net/en/about_jrp.html',
  'https://www.japan-guide.com/e/e2018.html',
  'https://www.japan-experience.com/japan-rail-pass',
  'https://www.insidekyoto.com/japan-rail-pass-is-it-worth-it'
];

// Mock preview data for faster testing
const MOCK_PREVIEW_DATA: MicrolinkData[] = [
  {
    title: "Need Advice on Travel Pass and Transport for Japan Trip in April",
    description: "Your travel barely breaks even if using a 7 day JR pass, but you'll need the much more expensive 21 day pass to encompass your trips. The JR pass doesn't cover local subway/bus tickets.",
    url: "https://www.japan-guide.com/e/e2274.html",
    logo: { url: "https://www.japan-guide.com/favicon.ico" }
  },
  {
    title: "Japan Rail Pass | Guide | Travel Japan",
    description: "The Japan Rail Pass gives you access to JR train lines countrywide, with very few exceptions. With your pass, you can take unlimited rides on most shinkansen.",
    url: "https://www.japan-rail-pass.com/",
    logo: { url: "https://www.japan-rail-pass.com/favicon.ico" }
  },
  {
    title: "Is the Japan Rail Pass Worth it? Complete Guide (2025)",
    description: "The Japan Rail Pass is a physical train pass, only available for tourists, that offers unlimited rides on (most) trains across Japan, including the shinkansen.",
    url: "https://www.jrpass.com/japan-rail-pass-guide",
    logo: { url: "https://www.jrpass.com/favicon.ico" }
  },
  {
    title: "Japan Rail Pass (JR Pass) - Japan Guide",
    description: "The pass can be used only by foreign tourists and offers unlimited rides on JR trains for one, two or three weeks. It comes in two types: ordinary and green.",
    url: "https://japanrailpass.net/en/about_jrp.html",
    image: { url: "https://japanrailpass.net/images/og_image.jpg" },
    logo: { url: "https://japanrailpass.net/favicon.ico" }
  },
  {
    title: "How to Get Around Japan: A Japan Rail Travel Guide - Bon Traveler",
    description: "The Japan Rail Pass is a train pass that covers a range of shinkansen (bullet train) and JR train lines, as well as a few other modes of transport, such as buses and ferries.",
    url: "https://www.japan-guide.com/e/e2018.html",
    logo: { url: "https://www.japan-guide.com/favicon.ico" }
  },
  {
    title: "Japan Rail Pass FAQ - Frequently asked questions about the JR Pass",
    description: "Japan Rail Pass FAQ, find out all about the JR Pass, including how to use the JR Pass, what is included, how to activate and much more.",
    url: "https://www.japan-experience.com/japan-rail-pass",
    logo: { url: "https://www.japan-experience.com/favicon.ico" }
  },
  {
    title: "Traveling Japan April - japan-guide.com forum",
    description: "The Jr Pass will cover well over 90% of your transport. A couple of notes, side-trips may not be covered so check on japan-guide.com which rail lines are JR.",
    url: "https://www.insidekyoto.com/japan-rail-pass-is-it-worth-it",
    logo: { url: "https://www.insidekyoto.com/favicon.ico" }
  }
];

// Skeleton component for link previews during loading
const LinkPreviewSkeleton = () => (
  <div className="bg-zinc-800/50 p-4 rounded-md border border-zinc-800">
    <div className="flex items-center space-x-3 mb-3">
      <Skeleton className="h-6 w-6 rounded-full bg-zinc-700/50" /> {/* Favicon/logo skeleton */}
      <Skeleton className="h-4 w-48 bg-zinc-700/50" /> {/* Title skeleton */}
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full bg-zinc-700/50" /> {/* Description skeleton line 1 */}
      <Skeleton className="h-3 w-4/5 bg-zinc-700/50" /> {/* Description skeleton line 2 */}
      <Skeleton className="h-3 w-3/5 bg-zinc-700/50" /> {/* Description skeleton line 3 */}
    </div>
    <div className="mt-3">
      <Skeleton className="h-32 w-full rounded-md bg-zinc-700/50" /> {/* Image skeleton */}
    </div>
  </div>
);

export function SearchResultsView({ links = MOCK_LINKS }: SearchResultsViewProps) {
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<MicrolinkData[]>([]);
  const [loadingStates, setLoadingStates] = useState<boolean[]>(links.map(() => true));
  const [useMockData, setUseMockData] = useState(false);  // For demo purposes

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadingStates(links.map(() => true));
      
      try {
        // Set a timeout to simulate loading and then use mock data for demo
        if (useMockData) {
          console.log('⏳ Using mock data for demonstration...');
          
          // Simulate progressive loading of each item
          const mockResults = [...MOCK_PREVIEW_DATA];
          
          // Simulate staggered loading times for each result
          links.forEach((_, index) => {
            setTimeout(() => {
              setLoadingStates(prev => {
                const updated = [...prev];
                updated[index] = false;
                return updated;
              });
            }, 300 + (index * 400)); // Stagger the loading times
          });
          
          setTimeout(() => {
            setPreviewData(mockResults);
            setLoading(false);
            console.log('⚙️ Loading state set to false');
          }, 500);
          
          return;
        }
        
        console.log('⏳ Starting to fetch microlink data for all links...');
        const results = await Promise.all(
          links.map(async (url, index) => {
            try {
              console.log(`🔍 Fetching microlink data for: ${url}`);
              const response = await mql(url);
              const { status, data } = response;
              
              // Log the data received from microlink API
              console.log(`✅ Microlink data received for ${url}:`, { status, data });
              
              // Mark this specific link's data as loaded
              setLoadingStates(prev => {
                const updated = [...prev];
                updated[index] = false;
                return updated;
              });
              
              if (status === 'success') {
                return data as MicrolinkData;
              }
              return { url };
            } catch (error) {
              console.error(`❌ Error fetching microlink data for ${url}:`, error);
              
              // Mark as loaded even if there's an error
              setLoadingStates(prev => {
                const updated = [...prev];
                updated[index] = false;
                return updated;
              });
              
              return { url };
            }
          })
        );
        
        console.log('🎉 All microlink data fetched successfully:', results);
        setPreviewData(results);
      } catch (error) {
        console.error('💥 Error fetching all previews:', error);
      }
      
      setLoading(false);
      console.log('⚙️ Loading state set to false');
    }
    
    fetchData();
  }, [links, useMockData]);

  // For demo purposes - toggle between real and mock data
  useEffect(() => {
    // Use mock data by default for demonstration
    setUseMockData(true);
  }, []);

  return (
    <div className="w-full h-full overflow-auto bg-transparent text-white">
      <div className="text-center font-medium text-zinc-400 mb-2 text-sm py-2">Search</div>

      {loading ? (
        <div className="space-y-4">
          {links.map((_, index) => (
            <LinkPreviewSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((url, index) => (
            <div key={`result-${index}`}>
              {loadingStates[index] ? (
                <LinkPreviewSkeleton />
              ) : (
                <>
                  {useMockData ? (
                    <div className="bg-zinc-800/50 p-4 rounded-md border border-zinc-800 hover:border-zinc-700 transition-all">
                      <div className="flex items-start">
                        {previewData[index]?.logo?.url && (
                          <img 
                            src={previewData[index].logo.url} 
                            alt="Logo" 
                            className="w-6 h-6 rounded-full mr-3 mt-1" 
                          />
                        )}
                        <div>
                          <h3 className="text-white text-sm font-medium mb-1">{previewData[index]?.title}</h3>
                          <p className="text-zinc-400 text-xs mb-2">{previewData[index]?.description}</p>
                          <div className="text-zinc-500 text-xs">{previewData[index]?.url}</div>
                        </div>
                      </div>
                      {previewData[index]?.image?.url && (
                        <div className="mt-3">
                          <img 
                            src={previewData[index].image.url} 
                            alt="Preview" 
                            className="w-full h-auto rounded-md" 
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <MicrolinkCard
                        url={url}
                        size="large"
                        contrast
                        media={['image', 'logo']}
                        direction="ltr"
                        style={{ 
                          backgroundColor: '#18181b', 
                          color: '#ffffff',
                          fontFamily: 'inherit',
                          border: '1px solid #27272a',
                          borderRadius: '0.375rem'
                        }}
                      />
                      
                      {/* Display fetched data in console for verification */}
                      {previewData[index] && (
                        <div className="mt-2 text-xs text-zinc-500">
                          {`Data fetched: ${previewData[index].title || 'No title'}`}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}