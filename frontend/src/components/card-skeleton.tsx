import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  variant?: 'default' | 'new';
}

export function CardSkeleton({ variant = 'default' }: CardSkeletonProps) {
  if (variant === 'new') {
    return (
      <Card className="h-[182px] border border-dashed border-border/60 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Skeleton className="w-12 h-12 rounded-full mb-3" />
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[182px] overflow-hidden">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="pb-3">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
      <CardFooter className="border-t border-border/40 pt-3">
        <Skeleton className="h-3 w-1/3" />
      </CardFooter>
    </Card>
  );
} 