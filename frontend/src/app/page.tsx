'use client';

import ComputerViewer from '@/components/ComputerViewer';


export default function HomePage() {
  
  return (
    <div className="flex flex-col overflow-auto min-h-screen">
      <ComputerViewer />
    </div>
  );
}
