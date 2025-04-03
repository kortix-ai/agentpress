'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import HeroSection from '@/components/HeroSection';
import FeatureShowcase from '@/components/FeatureShowcase';
import ApplicationShowcase from '@/components/ApplicationShowcase';
import TestimonialsCarousel from '@/components/TestimonialsCarousel';
import Footer from '@/components/Footer';
// Commenting out IntroPage import since it's causing an error
// import IntroPage from '@/components/IntroPage';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  // Removed showIntro state since it's not being used

  // Function to handle chat form submission
  const handleChatSubmit = (message: string) => {
    console.log('Chat input:', message);
  };

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Auto-transition from intro page to main content
  // Commented out since we're not using the IntroPage component
  /*
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 4000); // 4 seconds for the intro animation
      return () => clearTimeout(timer);
    }
  }, [showIntro]);
  */

  // Function to manually skip intro - removed since it's not being used

  // If still loading or user is authenticated (redirecting), show loading
  if (isLoading || user) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Show intro page or main content based on state
  // Commenting out the IntroPage conditional since it's not available
  /*
  if (showIntro) {
    return <IntroPage onSkip={skipIntro} />;
  }
  */

  return (
    <main className="flex-1 relative overflow-y-auto">
      {/* Hero Section */}
      <div id="hero" className="min-h-screen">
        <HeroSection onSubmit={handleChatSubmit} />
      </div>

      {/* Feature Showcase */}
      <section id="features" className="w-full">
        <FeatureShowcase 
          title="Experience the power of AI"
          subtitle="Built for your productivity needs. Personalized, secure, and intelligent."
        />
      </section>

      {/* Application Showcase */}
      <section id="applications" className="w-full">
        <ApplicationShowcase />
      </section>
      
      {/* Testimonials Section */}
      <section id="contact" className="w-full">
        <TestimonialsCarousel />
      </section>
      
      {/* Footer */}
      <Footer />
    </main>
  );
}