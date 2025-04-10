import React from 'react';

interface Issue {
  id: string;
  fileName: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface IssuesViewProps {
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
}

export function IssuesView({ issues, onIssueClick }: IssuesViewProps) {
  return (
    <div className="w-full h-full overflow-auto p-2">
      {/* Issues will be displayed here */}
      <div className="text-sm text-zinc-400">
        Issues View - {issues.length} issue(s)
      </div>
    </div>
  );
} 