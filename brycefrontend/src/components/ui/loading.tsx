import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingProps {
  text?: string;
  className?: string;
  variant?: "spinner" | "skeleton";
  size?: "sm" | "md" | "lg";
  count?: number;
}

// Creates a content loading component that can be used consistently across the app
export function Loading({
  text,
  className,
  variant = "spinner",
  size = "md",
  count = 3
}: LoadingProps) {
  // Size mappings
  const sizeClasses = {
    sm: {
      spinner: "h-4 w-4",
      container: "gap-1.5 py-2",
      text: "text-xs"
    },
    md: {
      spinner: "h-6 w-6",
      container: "gap-2 py-3",
      text: "text-sm"
    },
    lg: {
      spinner: "h-8 w-8",
      container: "gap-3 py-4",
      text: "text-base"
    }
  };

  if (variant === "skeleton") {
    return (
      <div className={cn("w-full space-y-2", className)}>
        {Array(count).fill(0).map((_, i) => (
          <Skeleton 
            key={`skeleton-${i}`} 
            className={cn(
              "w-full", 
              size === "sm" ? "h-4" : size === "md" ? "h-6" : "h-8"
            )} 
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center", 
      sizeClasses[size].container,
      className
    )}>
      <Loader2 
        className={cn(
          "animate-spin text-muted-foreground", 
          sizeClasses[size].spinner
        )} 
      />
      {text && (
        <p className={cn(
          "text-muted-foreground", 
          sizeClasses[size].text
        )}>
          {text}
        </p>
      )}
    </div>
  );
} 