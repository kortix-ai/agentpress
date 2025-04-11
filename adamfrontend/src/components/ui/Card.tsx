import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <div 
      className={`
        bg-white dark:bg-background-secondary 
        border border-subtle dark:border-white/10 
        rounded-2xl 
        shadow-[0_2px_10px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.08)] 
        transition-all duration-200
        backdrop-blur-sm
        relative
        overflow-hidden
        ${hover ? 'hover:translate-y-[-2px]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
      {/* Inner shadow overlay */}
      <div className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none" style={{ 
        background: 'linear-gradient(to top, #faf9f5 0%, rgba(250, 249, 245, 0) 100%)',
        opacity: 0.4,
        mixBlendMode: 'multiply'
      }} />
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-5 border-b border-subtle dark:border-white/10 ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`p-5 border-t border-subtle dark:border-white/10 ${className}`}>
      {children}
    </div>
  );
} 