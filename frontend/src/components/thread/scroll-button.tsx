import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface ScrollButtonProps {
  show: boolean;
  opacity: number;
  onClick: () => void;
}

export function ScrollButton({ show, opacity, onClick }: ScrollButtonProps) {
  return (
    <div
      className="sticky bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex justify-center items-center"
      style={{
        opacity,
        transition: 'opacity 0.2s ease-in-out',
        visibility: show ? 'visible' : 'hidden',
        marginTop: '-3rem',
      }}
    >
      <div
        className="bg-primary/90 shadow-md rounded-full p-2 flex items-center justify-center hover:bg-primary transition-all duration-200 cursor-pointer pointer-events-auto"
        onClick={onClick}
      >
        <ArrowDown className="h-4 w-4 text-primary-foreground" />
      </div>
    </div>
  );
} 