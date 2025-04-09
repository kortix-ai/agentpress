import React from 'react';

// We can add specific props when needed
export function SecondaryView() {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="border-b border-zinc-200 pb-3 mb-4">
        <h2 className="text-lg font-semibold text-zinc-800">Secondary View</h2>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Secondary View</p>
      </div>
    </div>
  );
} 