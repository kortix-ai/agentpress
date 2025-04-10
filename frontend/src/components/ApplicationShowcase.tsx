'use client';

import { useState } from 'react';

const categories = [
  { id: 'productivity', label: 'Productivity' },
  { id: 'creativity', label: 'Creativity' },
  { id: 'stem', label: 'STEM' },
  { id: 'gaming', label: 'Gaming', default: true },
  { id: 'coding', label: 'Coding' }
];

interface ApplicationShowcaseProps {
  className?: string;
}

export default function ApplicationShowcase({ className = '' }: ApplicationShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState('gaming');

  return (
    <section className={`w-full ${className}`}>
      {/* Section title with edge to edge border */}
      <div className="border-b border-zinc-200 w-full">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="px-4 md:px-8 pb-12">
            <h2 className="text-4xl md:text-5xl font-medium text-gray-900 mb-4 tracking-tight">
              See it in action
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl font-normal">
              Experience how applications perform across different use cases.
            </p>
          </div>
        </div>
      </div>

      {/* Image showcase with edge to edge border */}
      <div className="border-b border-zinc-200 w-full">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            {/* Left image - Mac Mini with peripherals */}
            <div className="flex-1 rounded-3xl overflow-hidden bg-[#f3edf5] border border-zinc-200">
              <div className="aspect-square w-full bg-zinc-200 rounded-3xl"></div>
            </div>
            
            {/* Right image - Game on display */}
            <div className="flex-1 rounded-3xl overflow-hidden bg-[#f3edf5] border border-zinc-200">
              <div className="aspect-square w-full bg-zinc-200 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category selector with edge to edge border */}
      <div className="border-b border-zinc-200 w-full">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex justify-center">
            <div className="inline-flex rounded-md p-1 border border-zinc-200">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
                    activeCategory === category.id
                      ? 'bg-white text-black border border-zinc-200'
                      : 'text-zinc-400 hover:text-black'
                  }`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Description text section with bottom border */}
      <div className="border-b border-zinc-200 w-full">
        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Description text */}
          {activeCategory === 'gaming' && (
            <div className="text-center max-w-4xl mx-auto">
              <p className="text-xl font-medium text-gray-900">
                Play thrilling games like Prince of Persia: The Lost Crown.
                <sup className="text-xs">10</sup> Or enable hardware-accelerated ray tracing 
                in titles like Myst, Control Ultimate Edition,
                <sup className="text-xs">11</sup> and Layers of Fear 2023 — for incredibly vibrant and 
                realistic light, shadows, and reflections.
              </p>
            </div>
          )}
          
          {activeCategory === 'productivity' && (
            <div className="text-center max-w-4xl mx-auto">
              <p className="text-xl font-medium text-gray-900">
                Power through your workday with improved performance on productivity apps.
                Create spreadsheets, presentations, and documents faster than ever before.
              </p>
            </div>
          )}
          
          {activeCategory === 'creativity' && (
            <div className="text-center max-w-4xl mx-auto">
              <p className="text-xl font-medium text-gray-900">
                Edit 4K videos smoothly, work with large image files, and create stunning 
                designs with powerful creative applications.
              </p>
            </div>
          )}
          
          {activeCategory === 'stem' && (
            <div className="text-center max-w-4xl mx-auto">
              <p className="text-xl font-medium text-gray-900">
                Run complex scientific models, analyze data, and visualize results 
                with unprecedented speed and efficiency.
              </p>
            </div>
          )}
          
          {activeCategory === 'coding' && (
            <div className="text-center max-w-4xl mx-auto">
              <p className="text-xl font-medium text-gray-900">
                Compile code faster, run multiple development environments simultaneously, 
                and enjoy seamless performance for all your programming needs.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 