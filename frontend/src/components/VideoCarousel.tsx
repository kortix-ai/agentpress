'use client';

import { useState, useRef, useEffect } from 'react';

interface VideoSlide {
  id: string;
  src: string;
  alt: string;
  caption?: string;
}

interface VideoCarouselProps {
  slides: VideoSlide[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

export default function VideoCarousel({
  slides,
  autoPlay = true,
  interval = 5000,
  className = '',
}: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Reset autoplay timer when current index or isPlaying changes
  useEffect(() => {
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }

    if (isPlaying) {
      autoPlayRef.current = setTimeout(() => {
        handleNext();
      }, interval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, [currentIndex, isPlaying, interval]);

  // Handle video playback based on active slide and playing state
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === currentIndex) {
        if (isPlaying) {
          video.play().catch(() => {
            // Handle autoplay restrictions
            console.log('Video playback was prevented by the browser');
          });
        } else {
          video.pause();
        }
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, isPlaying]);

  // Set up refs array when slides change
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, slides.length);
  }, [slides]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`}>
      {/* Videos */}
      <div className="relative w-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={slide.src}
              className="w-full h-full object-cover rounded-2xl"
              muted
              playsInline
              loop
              aria-label={slide.alt}
            />
            {slide.caption && (
              <div className="absolute bottom-16 left-0 right-0 text-center p-4 text-white font-medium text-lg">
                {slide.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Carousel Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 z-20">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="w-10 h-10 flex items-center justify-center bg-[rgba(255,255,255,0.2)] backdrop-blur-md rounded-full border border-[rgba(255,255,255,0.1)] text-white transition hover:bg-[rgba(255,255,255,0.3)]"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="2" width="3" height="12" rx="1" fill="currentColor" />
              <rect x="10" y="2" width="3" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 3.5V12.5L13 8L4 3.5Z" fill="currentColor" />
            </svg>
          )}
        </button>

        {/* Navigation Dots */}
        <div className="flex items-center gap-1.5 h-9 px-1.5 py-3 rounded-full bg-[rgba(255,255,255,0.2)] backdrop-blur-md">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`relative w-6 h-3 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-white' 
                  : 'bg-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.7)]'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 