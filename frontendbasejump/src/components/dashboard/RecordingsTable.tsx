"use client";

import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import Link from "next/link";

export type MetaData = {
  duration_seconds?: number;
  event_count?: number;
  audio_enabled?: boolean;
  start_time?: string;
  end_time?: string;
  device_info?: {
    platform?: string;
    platform_version?: string;
  };
};

export type Recording = {
  id: string;
  name: string | null;
  created_at: string;
  meta: MetaData | null;
  devices: {
    name: string | null;
  };
  preprocessed_file_path?: string;
};

export function RecordingsTable({ recordings }: { recordings: Recording[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<{
    id: string;
    status: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  function formatDuration(seconds?: number): string {
    if (!seconds) return "Unknown";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  async function handleDownload(recordingId: string) {
    if (downloadingId) return; // Prevent multiple downloads at once
    
    try {
      setDownloadingId(recordingId);
      setDownloadStatus(null);
      
      const response = await fetch(`/api/recordings/download/${recordingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        // Try to parse error JSON, otherwise use status text
        let errorMessage = response.statusText;
        try {
          const error = await response.json();
          errorMessage = error.error || "Failed to download recording";
        } catch (jsonError) {
          // If parsing JSON fails, stick with the status text
          console.error("Could not parse error response JSON:", jsonError);
        }
        throw new Error(errorMessage);
      }
      
      // Get filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = 'downloaded_recording.jsonl'; // Default filename
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }
      
      // Get the file data as a Blob
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up the temporary link and URL
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Update status to success (no details needed for browser download)
      setDownloadStatus({
        id: recordingId,
        status: "success",
        message: `Download started: ${fileName}`,
      });
    } catch (error) {
      setDownloadStatus({
        id: recordingId,
        status: "error",
        message: error instanceof Error ? error.message : "Failed to download recording",
      });
    } finally {
      setDownloadingId(null);
      // Clear the status after 10 seconds
      setTimeout(() => {
        setDownloadStatus((current) => 
          current && current.id === recordingId ? null : current
        );
      }, 10000);
    }
  }

  return (
    <div className="rounded-md border">
      <div className="mb-2 text-xs text-muted-foreground italic">
        Click on a recording to download it to your local machine
      </div>
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium">
                Name
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Device
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Date
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {recordings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  No recordings found
                </td>
              </tr>
            ) : (
              recordings.map((recording) => (
                <tr
                  key={recording.id}
                  className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted relative ${
                    downloadingId === recording.id ? "opacity-70" : ""
                  }`}
                >
                  <td className="p-4 align-middle">
                    {recording.name || "Unnamed Recording"}
                    {downloadingId === recording.id && (
                      <span className="ml-2 text-xs font-medium text-blue-500 animate-pulse">
                        Downloading...
                      </span>
                    )}
                    {downloadStatus && downloadStatus.id === recording.id && (
                      <div className={`mt-1 text-xs font-medium ${
                        downloadStatus.status === "success" ? "text-green-500" : "text-red-500"
                      }`}>
                        <div>{downloadStatus.message}</div>
                        {downloadStatus.details && <div className="text-muted-foreground">{downloadStatus.details}</div>}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Link 
                        href={`/recordings/view/${recording.id}`}
                        className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                      >
                        View Recording
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(recording.id);
                        }}
                        className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                      >
                        Download
                      </button>
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    {recording.devices?.name || "Unknown Device"}
                  </td>
                  <td className="p-4 align-middle">
                    {recording.created_at ? (
                      <div className="flex flex-col">
                        <span>{format(new Date(recording.created_at), "MMM d, yyyy")}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ) : (
                      "Unknown"
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    {formatDuration(recording.meta?.duration_seconds)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 