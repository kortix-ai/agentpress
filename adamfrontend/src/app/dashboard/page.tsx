"use client";

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BarChart, Calendar, Clock, LineChart, Users } from 'lucide-react';

export default function Dashboard() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  
  const DetailPanel = () => {
    if (!selectedCard) return <p>Select an item to view details</p>;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{selectedCard} Details</h3>
        
        <Card>
          <CardContent>
            <p className="text-foreground/70">
              This is a detailed view of the {selectedCard.toLowerCase()} information.
              You can add more specific content here based on which card was selected.
            </p>
          </CardContent>
        </Card>
        
        <div className="mt-6">
          <h4 className="text-sm font-medium text-foreground/60 mb-3">Actions</h4>
          <div className="space-y-3">
            <Button variant="primary" fullWidth>
              View Full Report
            </Button>
            <Button variant="outline" fullWidth>
              Export Data
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      rightPanelContent={<DetailPanel />}
      rightPanelTitle={selectedCard ? `${selectedCard} Details` : 'Details'}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
        <p className="text-foreground/70">Here's what's happening with your project today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <Card hover onClick={() => setSelectedCard('Analytics')}>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full">
              <BarChart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Analytics</h3>
              <p className="text-sm text-foreground/60">View your metrics</p>
            </div>
          </CardContent>
        </Card>
        
        <Card hover onClick={() => setSelectedCard('Users')}>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="bg-green-100/80 dark:bg-green-900/30 p-3 rounded-full">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium">Users</h3>
              <p className="text-sm text-foreground/60">Manage your users</p>
            </div>
          </CardContent>
        </Card>
        
        <Card hover onClick={() => setSelectedCard('Schedule')}>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="bg-purple-100/80 dark:bg-purple-900/30 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium">Schedule</h3>
              <p className="text-sm text-foreground/60">View your calendar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Recent Activity</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start space-x-4 py-2">
                  <div className="bg-background-secondary p-2 rounded-full">
                    <Clock className="h-4 w-4 text-foreground/60" />
                  </div>
                  <div>
                    <p className="font-medium">Activity {i}</p>
                    <p className="text-sm text-foreground/60">
                      This is a description of activity {i}
                    </p>
                    <p className="text-xs text-foreground/40 mt-1">
                      {i} hour{i !== 1 ? 's' : ''} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Performance</h3>
              <Button variant="ghost" size="sm">View Report</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 border border-white/10 dark:border-white/5 rounded-xl bg-background-secondary/50 dark:bg-background-secondary/50">
              <LineChart className="h-8 w-8 text-foreground/40" />
              <span className="ml-2 text-foreground/60">Chart Placeholder</span>
            </div>
          </CardContent>
          <CardFooter className="bg-background-secondary/50 dark:bg-background-secondary/20">
            <div className="w-full flex justify-between text-sm">
              <span className="text-foreground/60">Updated 3 hours ago</span>
              <Button variant="link" size="sm">Refresh</Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
} 