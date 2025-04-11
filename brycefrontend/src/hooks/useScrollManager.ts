import { useState, useRef, useCallback, useEffect } from 'react';

interface UseScrollManagerProps {
  onScroll?: () => void;
}

interface UseScrollManagerReturn {
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  showScrollButton: boolean;
  buttonOpacity: number;
  userHasScrolled: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: () => void;
  handleScrollButtonClick: () => void;
}

export function useScrollManager({ onScroll }: UseScrollManagerProps = {}): UseScrollManagerReturn {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [buttonOpacity, setButtonOpacity] = useState(0);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitiallyScrolled = useRef<boolean>(false);

  // Scroll to bottom explicitly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Optimized scroll handler with throttling
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    
    setShowScrollButton(isScrolledUp);
    setButtonOpacity(isScrolledUp ? 1 : 0);
    setUserHasScrolled(isScrolledUp);
    
    // Set scrolling state
    if (!isScrolling) {
      setIsScrolling(true);
    }
    
    // Clear any existing timer
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    
    // Call custom scroll handler if provided
    if (onScroll) {
      onScroll();
    }
    
    // Set timer to detect when scrolling stops
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
      
      // Call custom scroll handler again when scrolling stops
      if (onScroll) {
        onScroll();
      }
    }, 100);
  }, [isScrolling, onScroll]);

  // Make sure clicking the scroll button scrolls to bottom
  const handleScrollButtonClick = useCallback(() => {
    scrollToBottom();
    setUserHasScrolled(false);
  }, [scrollToBottom]);

  // Clean up any scroll timers on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  return {
    messagesEndRef,
    messagesContainerRef,
    showScrollButton,
    buttonOpacity,
    userHasScrolled,
    scrollToBottom,
    handleScroll,
    handleScrollButtonClick
  };
} 