import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Message } from '@/lib/api';

interface Thread {
  thread_id: string;
  project_id?: string | null;
  user_id?: string | null;
  messages: Message[];
  created_at: string;
}

interface ThreadCardProps {
  thread: Thread;
  projectId: string;
  variant?: 'default' | 'new';
  isLoading?: boolean;
  onClick?: () => void;
}

export function ThreadCard({ thread, projectId, variant = 'default', isLoading, onClick }: ThreadCardProps) {
  if (variant === 'new') {
    return (
      <Card 
        className="group relative h-[182px] border border-dashed border-border/60 hover:border-border/80 transition-all duration-200 flex flex-col items-center justify-center"
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center p-6 text-center">
          {isLoading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground mb-3 animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Creating conversation...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <Plus className="h-6 w-6 text-primary/70 group-hover:text-primary transition-colors" />
              </div>
              <p className="font-medium group-hover:text-primary transition-colors">New Conversation</p>
              <p className="text-muted-foreground text-sm mt-1">Start a new AI conversation</p>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Link 
      href={`/projects/${projectId}/threads/${thread.thread_id}`}
      className="block"
    >
      <Card className="group relative h-[182px] cursor-pointer border border-border/80 hover:shadow-md transition-all duration-200">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-medium group-hover:text-primary transition-colors">
            Conversation {thread.thread_id.slice(0, 8)}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {new Date(thread.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <p className="text-sm text-muted-foreground">
            {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
} 