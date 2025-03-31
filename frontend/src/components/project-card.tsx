import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  variant?: 'default' | 'new';
  isLoading?: boolean;
}

export function ProjectCard({ project, onClick, variant = 'default', isLoading }: ProjectCardProps) {
  if (variant === 'new') {
    return (
      <Card 
        className="group relative h-[182px] border border-dashed border-border/60 hover:border-border/80 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-sm transition-all duration-200"
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center p-6 text-center">
          {isLoading ? (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                <div className="h-6 w-6 border-2 border-primary/70 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Creating...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <Plus className="h-6 w-6 text-primary/70 group-hover:text-primary transition-colors" />
              </div>
              <p className="font-medium group-hover:text-primary transition-colors">New Project</p>
              <p className="text-muted-foreground text-sm mt-1">Start a new AI project</p>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="group relative h-[182px] overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border border-border/80"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium group-hover:text-primary transition-colors">{project.name}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        )}
      </CardContent>
      <CardFooter className="border-t border-border/40 pt-3 text-xs text-muted-foreground/60">
        Created: {new Date(project.created_at).toLocaleDateString()}
      </CardFooter>
    </Card>
  );
} 