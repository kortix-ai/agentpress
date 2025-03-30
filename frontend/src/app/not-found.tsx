import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-6xl font-bold text-gray-800 mb-6">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/">
              Return Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/projects">
              Browse Projects
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 