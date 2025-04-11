'use client';

import { useState, useEffect, useRef } from 'react';

type Testimonial = {
  name: string;
  company: string;
  quote: string;
  avatarUrl?: string;
};

const testimonials: Testimonial[] = [
  {
    name: 'Alex MacCaw',
    company: 'Reflect',
    quote: 'Cursor is the best product I\'ve used in a while - it\'s an AI enabled editor. I just asked it to write a README for a project I\'ve been working on - analyzed the code-base and worked first time.',
    avatarUrl: '/testimonials/alex-maccaw.jpg',
  },
  {
    name: 'Shadcn',
    company: 'Vercel',
    quote: 'Next.js makes React look current pay for it hands down, is Cursor It\'s fast, autocomplete (and where you need it to, handles brackets properly, sensible keyboard shortcuts, bring-your-own-model...everything is well put together.',
    avatarUrl: '/testimonials/shadcn.jpg',
  },
  {
    name: 'Josh Miller',
    company: 'The Browser Company',
    quote: 'I went from never hearing about Cursor to many IC engineers telling me it\'s their new favorite tool. Seemingly overnight! Pretty wild product-market fit.',
    avatarUrl: '/testimonials/josh-miller.jpg',
  },
  {
    name: 'Kent C. Dodds',
    company: 'Internet',
    quote: 'After many recommendations, I finally switched from VSC to Cursor and ... wow! It\'s absolutely incredible. If you like Copilot (or if you don\'t), you\'ll be blown away by Cursor. There is no going back.',
    avatarUrl: '/testimonials/kent-dodds.jpg',
  },
  {
    name: 'Zeke Sikelianos',
    company: 'Replicate',
    quote: 'Gonna apply to YC and list Cursor as my cofounder',
    avatarUrl: '/testimonials/zeke-sikelianos.jpg',
  },
  {
    name: 'Cory Etzkorn',
    company: 'Notion',
    quote: 'Cursor\'s new auto-complete is insane You no longer need to prompt it. It predicts what code you want based on what you\'re doing. Accept by hitting tab In this video I change the CSS class of one link. I then simply keep hitting tab to make the same change to all other links',
    avatarUrl: '/testimonials/cory-etzkorn.jpg',
  },
  {
    name: 'Marc Köhlbrugge',
    company: 'WIP',
    quote: 'Cursor is at least a 5-7x improvement over Copilot. It\'s amazing having an AI pair programmer, and is an incredible accelerator for me and my team.',
    avatarUrl: '/testimonials/marc-kohlbrugge.jpg',
  },
  {
    name: 'Ben Bernard',
    company: 'Instacart',
    quote: 'The Cursor tab completion while coding is occasionally so magic it defies reality - about ~25% of the time it is anticipating exactly what I want to do. It is enough to make you believe that eventually you\'ll be able to code at the speed of thought.',
    avatarUrl: '/testimonials/ben-bernard.jpg',
  },
  {
    name: 'Kevin Whinnery',
    company: 'OpenAI',
    quote: 'Cursor is hands down my biggest workflow improvement in years',
    avatarUrl: '/testimonials/kevin-whinnery.jpg',
  },
  {
    name: 'Sawyer Hood',
    company: 'Figma',
    quote: 'I love writing code and Cursor is a necessity. Cursor is steps ahead of my brain, proposing multi-line edits so I type "tab" more than anything else.',
    avatarUrl: '/testimonials/sawyer-hood.jpg',
  },
];

// Duplicate testimonials to ensure continuous scrolling
const extendedTestimonials = [...testimonials, ...testimonials, ...testimonials];

export default function TestimonialsCarousel() {
  const [isPaused1, setIsPaused1] = useState(false);
  const [isPaused2, setIsPaused2] = useState(false);
  const [isPaused3, setIsPaused3] = useState(false);
  
  const column1Ref = useRef<HTMLDivElement>(null);
  const column2Ref = useRef<HTMLDivElement>(null);
  const column3Ref = useRef<HTMLDivElement>(null);
  
  // Initialize the scrolling with offset for each column
  useEffect(() => {
    if (column1Ref.current) {
      column1Ref.current.scrollTop = Math.random() * 500;
    }
    
    if (column2Ref.current) {
      column2Ref.current.scrollTop = column2Ref.current.scrollHeight - column2Ref.current.clientHeight - (Math.random() * 500);
    }
    
    if (column3Ref.current) {
      column3Ref.current.scrollTop = Math.random() * 700;
    }
  }, []);
  
  useEffect(() => {
    const animate = () => {
      // Column 1: Move upward
      if (column1Ref.current && !isPaused1) {
        const { scrollTop, scrollHeight, clientHeight } = column1Ref.current;
        if (scrollTop + clientHeight >= scrollHeight - 2) {
          column1Ref.current.scrollTop = 0;
        } else {
          column1Ref.current.scrollTop += 0.5;
        }
      }
      
      // Column 2: Move downward
      if (column2Ref.current && !isPaused2) {
        if (column2Ref.current.scrollTop <= 2) {
          column2Ref.current.scrollTop = column2Ref.current.scrollHeight - column2Ref.current.clientHeight;
        } else {
          column2Ref.current.scrollTop -= 0.5;
        }
      }
      
      // Column 3: Move upward
      if (column3Ref.current && !isPaused3) {
        const { scrollTop, scrollHeight, clientHeight } = column3Ref.current;
        if (scrollTop + clientHeight >= scrollHeight - 2) {
          column3Ref.current.scrollTop = 0;
        } else {
          column3Ref.current.scrollTop += 0.5;
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    const animationRef = { current: requestAnimationFrame(animate) };
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPaused1, isPaused2, isPaused3]);

  return (
    <div className="w-full bg-background text-foreground py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-5xl font-bold text-center mb-12">Loved by world-class devs</h2>
        <p className="text-xl text-center mb-16">Engineers all around the world reach for Cursor by choice.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Column 1 - Moving upward */}
          <div className="relative h-[700px] border-r border-border">
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-background via-background/95 to-transparent z-10 pointer-events-none"></div>
            <div 
              ref={column1Ref}
              className="overflow-hidden h-full no-scrollbar"
              onMouseEnter={() => setIsPaused1(true)}
              onMouseLeave={() => setIsPaused1(false)}
            >
              <div className="space-y-0">
                {extendedTestimonials.slice(0, 10).map((testimonial, index) => (
                  <TestimonialCard 
                    key={`col1-${index}`} 
                    testimonial={testimonial} 
                    isLast={index === extendedTestimonials.slice(0, 10).length - 1}
                  />
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/95 to-transparent z-10 pointer-events-none"></div>
          </div>
          
          {/* Column 2 - Moving downward */}
          <div className="relative h-[700px] border-r border-border">
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-background via-background/95 to-transparent z-10 pointer-events-none"></div>
            <div 
              ref={column2Ref}
              className="overflow-hidden h-full no-scrollbar"
              onMouseEnter={() => setIsPaused2(true)}
              onMouseLeave={() => setIsPaused2(false)}
            >
              <div className="space-y-0">
                {extendedTestimonials.slice(10, 20).map((testimonial, index) => (
                  <TestimonialCard 
                    key={`col2-${index}`} 
                    testimonial={testimonial} 
                    isLast={index === extendedTestimonials.slice(10, 20).length - 1}
                  />
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/95 to-transparent z-10 pointer-events-none"></div>
          </div>
          
          {/* Column 3 - Moving upward */}
          <div className="relative h-[700px]">
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-background via-background/95 to-transparent z-10 pointer-events-none"></div>
            <div 
              ref={column3Ref}
              className="overflow-hidden h-full no-scrollbar"
              onMouseEnter={() => setIsPaused3(true)}
              onMouseLeave={() => setIsPaused3(false)}
            >
              <div className="space-y-0">
                {extendedTestimonials.slice(20, 30).map((testimonial, index) => (
                  <TestimonialCard 
                    key={`col3-${index}`} 
                    testimonial={testimonial} 
                    isLast={index === extendedTestimonials.slice(20, 30).length - 1}
                  />
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/95 to-transparent z-10 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial, isLast }: { testimonial: Testimonial; isLast?: boolean }) {
  return (
    <div className={`bg-card p-6 ${!isLast ? 'border-b border-border' : ''}`}>
      {testimonial.avatarUrl && (
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 rounded-full overflow-hidden mr-3 bg-muted">
            <img 
              src={testimonial.avatarUrl} 
              alt={`${testimonial.name}`} 
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback for missing images
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48';
              }}
            />
          </div>
          <div>
            <p className="font-medium text-foreground">{testimonial.name}</p>
            <p className="text-sm text-muted-foreground">{testimonial.company}</p>
          </div>
        </div>
      )}
      <p className="text-sm text-foreground">{testimonial.quote}</p>
    </div>
  );
} 