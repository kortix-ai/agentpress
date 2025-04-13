'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">Kortix Suna</Link>
          </div>
          <div className="hidden md:flex space-x-8">
            <Link href="#intro" className="text-gray-700 hover:text-blue-600 transition-all">Intro</Link>
            <Link href="#use-cases" className="text-gray-700 hover:text-blue-600 transition-all">Use Cases</Link>
            <Link href="#pricing" className="text-gray-700 hover:text-blue-600 transition-all">Pricing</Link>
            <Link href="#footer" className="text-gray-700 hover:text-blue-600 transition-all">Contact</Link>
          </div>
          <div>
            <Link href="/dashboard" className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 