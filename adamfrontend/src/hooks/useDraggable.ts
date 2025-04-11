import { useEffect, useRef, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  boundaryElement?: string;
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const { initialPosition = { x: 0, y: 0 }, boundaryElement } = options;
  
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const initialPositionRef = useRef<Position>(initialPosition);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger dragging when clicking on buttons or elements with click handlers
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).tagName === 'A') {
      return;
    }
    
    // Only allow dragging from the header area
    if (!(e.target as HTMLElement).closest('.drag-handle')) return;
    
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPositionRef.current = { ...position };
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    
    // Prevent any default behavior
    e.preventDefault();
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      let newX = initialPositionRef.current.x + deltaX;
      let newY = initialPositionRef.current.y + deltaY;
      
      // Apply boundary constraints if a boundary element is specified
      if (boundaryElement && elementRef.current) {
        const boundary = document.querySelector(boundaryElement);
        
        if (boundary) {
          const boundaryRect = boundary.getBoundingClientRect();
          const elementRect = elementRef.current.getBoundingClientRect();
          
          // Make sure the element stays within the boundary
          newX = Math.max(0, Math.min(newX, boundaryRect.width - elementRect.width));
          newY = Math.max(0, Math.min(newY, boundaryRect.height - elementRect.height));
        }
      }
      
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = '';
        e.preventDefault();
      }
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, boundaryElement]);
  
  return {
    position,
    setPosition,
    isDragging,
    elementRef,
    dragHandlers: {
      onMouseDown: handleMouseDown,
    },
    style: {
      transform: `translate(${position.x}px, ${position.y}px)`,
      cursor: isDragging ? 'grabbing' : 'default',
      position: 'absolute' as const,
      zIndex: 50
    },
  };
} 