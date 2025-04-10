import React from 'react';
import { Brain } from 'lucide-react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-lg px-4 py-2.5">
        <div className="relative animate-brain-gradient">
          <Brain 
            className="h-4 w-4 mr-1 text-transparent" 
            strokeWidth={1.5} 
            style={{stroke: 'url(#brainGradient)'}} 
          />
          <svg width="0" height="0">
            <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#f9fafb" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
          </svg>
        </div>
        <span className="text-sm suna-text-active bg-gradient-to-r from-gray-300 via-zinc-100 to-gray-300 animate-shimmer">
          Thinking
        </span>
      </div>
    </div>
  );
};

export default ThinkingIndicator; 