'use client';

import { useState, useEffect, useRef } from 'react';

interface FeatureShowcaseProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

interface SlideContent {
  id: number;
  title: string;
  subtitle: string;
}

export default function FeatureShowcase({
  title = "Get the highlights.",
  subtitle = "Built for Apple Intelligence. Personal, private, powerful.",
  className = '',
}: FeatureShowcaseProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  
  const slides: SlideContent[] = [
    {
      id: 0,
      title: "M4. M4 Pro. Next-level performance.",
      subtitle: "Game-changing graphics. More power to you."
    },
    {
      id: 1,
      title: "Built for Apple Intelligence.",
      subtitle: "Personal, private, powerful."
    },
    {
      id: 2,
      title: "Magic editing tools.",
      subtitle: "Powerful image enhancements at your fingertips."
    },
    {
      id: 3,
      title: "Seamless ecosystem.",
      subtitle: "Works perfectly with all your Apple devices."
    }
  ];
  
  const slideDuration = 5000; // 5 seconds per slide

  // Setup intersection observer to detect when section is in view
  useEffect(() => {
    if (!sectionRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Add a small delay for a smoother effect
        if (entry.isIntersecting) {
          setTimeout(() => setIsInView(true), 100);
        } else {
          setTimeout(() => setIsInView(false), 100);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.2, // When 20% of the element is visible
      }
    );
    
    observer.observe(sectionRef.current);
    
    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Handle auto-play and slide transitions
  useEffect(() => {
    if (isPlaying && !transitioning) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Start progress animation
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / slideDuration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100) {
          // Move to next slide when progress completes
          setTransitioning(true);
          setCurrentSlide((prev) => (prev + 1) % slides.length);
          setProgress(0);
          
          // Reset transitioning state after animation completes
          setTimeout(() => {
            setTransitioning(false);
          }, 500); // Match the duration of the transition
        }
      }, 50); // Update progress frequently for smooth animation
      
      intervalRef.current = progressInterval;
    } else if (intervalRef.current) {
      // If paused, clear interval
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentSlide, slides.length, transitioning]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDotClick = (index: number) => {
    if (index !== currentSlide && !transitioning) {
      setTransitioning(true);
      setCurrentSlide(index);
      setProgress(0); // Reset progress when manually changing slides
      
      // Reset transitioning state after animation completes
      setTimeout(() => {
        setTransitioning(false);
      }, 500); // Match the duration of the transition
    }
  };
  
  return (
    <section ref={sectionRef} className={`py-16 md:py-24 ${className} relative border-t border-b border-zinc-200`}>
      <div className="w-full mx-auto">
        {/* Heading with bottom border */}
        <div className="border-b border-zinc-200 w-full mb-16">
          <div className="mb-12 md:mb-16 px-4 md:px-8">
            <h2 className="text-2xl md:text-3xl font-medium text-gray-900 mb-4 tracking-tight">{title}</h2>
            <p className="text-md md:text-md text-gray-700 max-w-3xl font-normal">
              {subtitle}
              <sup className="text-sm">1</sup>
            </p>
          </div>
        </div>

        {/* Feature Demonstration */}
        <div className="w-full mx-auto mb-20">
          {/* Carousel container */}
          <div className="relative overflow-x-visible mx-auto">
            {/* Create a carousel with centered active slide and visible edges for prev/next */}
            <div className="flex justify-center items-stretch w-full relative">
              {slides.map((slide, index) => {
                // Calculate position relative to current slide
                const position = (index - currentSlide + slides.length) % slides.length;
                
                // Determine if this slide is previous, current, or next
                const isPrev = position === slides.length - 1;
                const isCurrent = position === 0;
                const isNext = position === 1;
                
                // Only render previous, current, and next slides for performance
                if (!isPrev && !isCurrent && !isNext) return null;
                
                return (
                  <div 
                    key={slide.id}
                    className={`absolute transition-all duration-500 ease-out h-[500px] rounded-xl overflow-visible
                      ${isCurrent ? 'z-20' : 'z-10'}
                    `}
                    style={{
                      left: isCurrent ? '5%' : isPrev ? '-7%' : '97%',
                      width: isCurrent ? '90%' : '10%',
                      background: index === 0 ? 'rgb(250, 250, 250)' : // zinc-50
                                index === 1 ? 'rgb(240, 249, 255)' : // sky-50
                                index === 2 ? 'rgb(255, 247, 237)' : // amber-50
                                'rgb(245, 243, 255)', // violet-50
                    }}
                  >
                    {/* Card content only shown for active card */}
                    {isCurrent && (
                      <div className="absolute inset-0 p-8 flex flex-col">
                        <h3 className="text-xl font-medium text-gray-900 tracking-tight">{slide.title}</h3>
                        <p className="text-md text-gray-600 mt-2 font-normal">{slide.subtitle}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Static container for sizing */}
              <div className="h-[500px] w-full invisible"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fixed Carousel Controls - Positioned at bottom of screen with animation */}
      <div 
        className={`fixed left-1/2 flex justify-center items-center gap-3 z-50 transition-all duration-300 ease-out ${
          isInView 
            ? 'bottom-8 opacity-100 scale-100' 
            : 'bottom-0 opacity-0 scale-75'
        }`}
        style={{
          transform: `translateX(-50%) translateY(${isInView ? '0' : '20px'}) scale(${isInView ? '1' : '0.75'})`,
          transformOrigin: 'bottom center',
        }}
      >
        {/* Play/Pause Button */}
        <button 
          onClick={handlePlayPause}
          className="w-10 h-10 flex items-center justify-center bg-white/40 backdrop-blur-lg rounded-md border border-zinc-200 "
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="3" width="3" height="14" rx="1" fill="black" />
              <rect x="12" y="3" width="3" height="14" rx="1" fill="black" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4L16 10L6 16V4Z" fill="black" />
            </svg>
          )}
        </button>
        
        {/* Navigation Dots with Progress Indicator */}
        <div className="flex items-center gap-2 h-10 px-3 py-2 rounded-md bg-white/40 backdrop-blur-lg border border-zinc-200">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => handleDotClick(index)}
              className={`h-2.5 rounded-xs transition-all relative ${
                currentSlide === index 
                  ? 'w-16 bg-zinc-300/50' 
                  : 'w-2.5 bg-zinc-300/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            >
              {currentSlide === index && (
                <div 
                  className="absolute top-0 left-0 h-full bg-black/100 rounded-xs transition-all"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
} 