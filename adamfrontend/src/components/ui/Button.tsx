import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-white text-foreground hover:bg-white/90 border border-subtle dark:bg-background-secondary dark:text-foreground dark:border-white/10 dark:hover:bg-background-secondary/80",
        primary: "bg-primary text-white hover:bg-primary/90 border border-primary/30 shadow-md hover:shadow-lg",
        destructive: "bg-red-500 text-white hover:bg-red-600 border border-red-600/20 shadow-md",
        outline: "bg-transparent border border-subtle hover:bg-white/10 text-foreground shadow-sm dark:border-white/10 dark:text-foreground dark:hover:bg-white/5",
        ghost: "bg-transparent hover:bg-white/10 text-foreground dark:text-foreground dark:hover:bg-white/5",
        link: "bg-transparent underline-offset-4 hover:underline text-primary dark:text-primary hover:bg-transparent",
      },
      size: {
        default: "h-10 py-2 px-5",
        sm: "h-8 px-4 rounded-full text-xs",
        lg: "h-12 px-8 rounded-full text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps 
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  children,
  className,
  variant = "default",
  size = "default",
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonVariants({ variant, size })} ${fullWidth ? 'w-full' : ''} relative overflow-hidden group`}
      {...props}
    >
      <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out bg-white/10 dark:bg-white/5 opacity-0 group-hover:opacity-100 rounded-full"></span>
      <span className="relative z-10">{children}</span>
    </button>
  );
} 