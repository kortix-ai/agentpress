'use client';

import { useState, useEffect } from 'react';

interface IntroPageProps {
  onSkip: () => void;
}

export default function IntroPage({ onSkip }: IntroPageProps) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Animation sequence
  useEffect(() => {
    // Step 1: Fade in the logo after a brief delay
    const fadeInTimer = setTimeout(() => {
      setLogoVisible(true);
    }, 1000);

    // Step 2: Begin fade out sequence
    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-zinc-50 overflow-hidden">
      {/* Colored dots background */}
      

      {/* Content container with logo */}
      <div 
        className={`relative z-10 flex flex-col items-center justify-center transition-opacity duration-1000 ${
          logoVisible ? 'opacity-100' : 'opacity-0'
        } ${fadeOut ? 'opacity-0' : ''}`}
      >
        {/* Kortix logo with gradient colors */}
        <div className="w-32 h-32 flex items-center justify-center mb-8">
          <div className="w-20 h-20 relative">
            <div className="absolute inset-0 logo-gradient"></div>
          </div>
        </div>

        {/* Tagline */}
        
      </div>

      {/* Skip button */}
      <button 
        onClick={onSkip} 
        className="absolute bottom-8 right-8 px-4 py-2 bg-black bg-opacity-30 text-white rounded-md hover:bg-opacity-50 transition-colors"
      >
        Skip
      </button>

      {/* CSS for the dots */}
      <style jsx>{`
        .dots-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        
        .color-dot {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.8;
          animation: float 15s infinite ease-in-out;
        }
        
        .red-dot {
          width: 800px;
          height: 800px;
          background-color: rgba(255, 0, 0, 0.7);
          top: -15%;
          left: -10%;
          animation-delay: 0s;
        }
        
        .orange-dot {
          width: 700px;
          height: 700px;
          background-color: rgba(255, 165, 0, 0.7);
          top: -10%;
          left: 75%;
          animation-delay: 1s;
        }
        
        .yellow-dot {
          width: 750px;
          height: 750px;
          background-color: rgba(255, 255, 0, 0.7);
          top: 75%;
          left: -15%;
          animation-delay: 2s;
        }
        
        .green-dot {
          width: 850px;
          height: 850px;
          background-color: rgba(0, 255, 0, 0.7);
          top: 60%;
          left: 85%;
          animation-delay: 3s;
        }
        
        .teal-dot {
          width: 774px;
          height: 774px;
          background-color: rgba(0, 128, 128, 0.7);
          top: 35%;
          left: -20%;
          animation-delay: 4s;
        }
        
        .blue-dot {
          width: 824px;
          height: 824px;
          background-color: rgba(0, 0, 255, 0.7);
          top: -25%;
          left: 35%;
          animation-delay: 5s;
        }
        
        .indigo-dot {
          width: 724px;
          height: 724px;
          background-color: rgba(75, 0, 130, 0.7);
          top: 95%;
          left: 40%;
          animation-delay: 6s;
        }
        
        .purple-dot {
          width: 750px;
          height: 750px;
          background-color: rgba(128, 0, 128, 0.7);
          top: 20%;
          left: 85%;
          animation-delay: 7s;
        }
        
        .pink-dot {
          width: 800px;
          height: 800px;
          background-color: rgba(255, 105, 180, 0.7);
          top: 40%;
          left: 40%;
          animation-delay: 8s;
        }
        
        .cyan-dot {
          width: 674px;
          height: 674px;
          background-color: rgba(0, 255, 255, 0.7);
          top: 65%;
          left: 65%;
          animation-delay: 9s;
        }
        
        .white-dot {
          width: 650px;
          height: 650px;
          background-color: rgba(255, 255, 255, 0.5);
          top: 10%;
          left: 15%;
          animation-delay: 10s;
        }
        
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(20px) translateX(15px);
          }
          100% {
            transform: translateY(0) translateX(0);
          }
        }
        
        .logo-gradient-container {
          position: relative;
          overflow: hidden;
          background-size: 200% 200%;
          border-radius: 4px;
        }
        
        .logo-gradient {
          mask-image: url('/images/kortix-small-logo.svg');
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            45deg,
            #ff0000,
            #ff4500,
            #ffa500,
            #ffff00,
            #7cfc00,
            #00ff00,
            #00fa9a,
            #00ffff,
            #1e90ff,
            #0000ff,
            #4b0082,
            #8a2be2,
            #800080,
            #ff00ff,
            #ff1493,
            #ff0000
          );
          background-size: 400% 400%;
          animation: gradient-shift 6s infinite linear;
        }
        
        .logo-gradient-container::before {
          content: none;
        }
        
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
} 