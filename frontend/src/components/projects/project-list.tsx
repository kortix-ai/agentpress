'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/lib/types';
import { CreateProjectDialog } from './create-project-dialog';
import { formatDate } from '@/lib/utils';

interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
}

export function ProjectList({ projects, isLoading }: ProjectListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24 bg-gray-100 rounded-t-lg" />
            <CardContent className="p-4">
              <div className="h-6 bg-gray-100 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </CardContent>
            <CardFooter className="h-10 bg-gray-50 rounded-b-lg" />
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium text-gray-700 mb-2">No projects yet</h3>
        <p className="text-gray-500 mb-4">Create your first project to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link key={project.id} href={`/projects/${project.id}`} passHref legacyBehavior>
          <a className="block transition-transform hover:scale-[1.02]">
            <Card className="h-full cursor-pointer border-2 hover:border-gray-300">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Content could be a preview of threads, etc. */}
              </CardContent>
              <CardFooter className="text-sm text-gray-500">
                Created: {formatDate(project.created_at)}
              </CardFooter>
            </Card>
          </a>
        </Link>
      ))}
    </div>
  );
} 