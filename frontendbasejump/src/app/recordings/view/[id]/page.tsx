"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";

// Types for the events we'll be displaying
type EventType = 
  | "screenshot"
  | "a11y+screenshot"
  | "typewrite"
  | "click"
  | "moveTo"
  | "drag"
  | "scroll"
  | "hotkey"
  | "press";

interface EventArgs {
  [key: string]: any;
  image?: string;  // Base64 image for screenshots
  text?: string;   // For typewrite events
  x?: number;      // Normalized x coordinate
  y?: number;      // Normalized y coordinate
  button?: string; // For click events
  clicks?: number; // For click events
  keys?: string[]; // For hotkey events
  key?: string;    // For press events
}

interface RecordingEvent {
  type: EventType;
  timestamp: number;
  args: EventArgs;
  command?: string;
  debug_info?: any;
}

interface RecordingData {
  id: string;
  name: string;
  created_at: string;
  events: RecordingEvent[];
  meta: any;
}

export default function RecordingViewer() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<RecordingData | null>(null);
  
  // Viewer settings
  const [unfoldScreenshots, setUnfoldScreenshots] = useState(true);
  const [showRawData, setShowRawData] = useState(false);
  const [showMousePosition, setShowMousePosition] = useState(true);
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 50;
  
  useEffect(() => {
    const fetchRecording = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/recordings/view/${recordingId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch recording");
        }
        
        const data = await response.json();
        setRecording(data);
        
        // Set default event types based on available events
        if (data.events && data.events.length > 0) {
          const types = Array.from(new Set(data.events.map((event: RecordingEvent) => event.type)));
          setSelectedEventTypes(types as EventType[]);
          
          // Set default time range
          const minTime = Math.min(...data.events.map((e: RecordingEvent) => e.timestamp));
          const maxTime = Math.max(...data.events.map((e: RecordingEvent) => e.timestamp));
          setTimeRange([minTime, maxTime]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error("Error fetching recording:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (recordingId) {
      fetchRecording();
    }
  }, [recordingId]);
  
  // Format timestamp to readable format
  const formatTimestamp = (timestamp: number): string => {
    return `${timestamp.toFixed(2)}s`;
  };
  
  // Draw mouse pointer on image
  const drawMousePointer = (base64Image: string, normX: number, normY: number): string => {
    // This would be implemented in a client-side component using canvas
    // For now, we'll return the original image, but we'll create a component for this
    return base64Image;
  };
  
  // Render a single event
  const renderEvent = (event: RecordingEvent, index: number, mouseX: number = 0, mouseY: number = 0) => {
    const timestamp = formatTimestamp(event.timestamp);
    
    switch (event.type) {
      case "screenshot":
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] 📸 Screenshot`}</h3>
            {event.debug_info && (
              <p className="text-sm text-gray-500">
                Attached to {event.debug_info.type} at {event.debug_info.timestamp ? formatTimestamp(event.debug_info.timestamp) : "unknown"}
              </p>
            )}
            <details open={unfoldScreenshots}>
              <summary className="cursor-pointer">View Screenshot</summary>
              <div className="mt-2">
                {event.args.image && (
                  <div className="relative">
                    <img 
                      src={`data:image/jpeg;base64,${showMousePosition ? drawMousePointer(event.args.image, mouseX, mouseY) : event.args.image}`}
                      alt={`Screenshot at ${timestamp}`}
                      className="max-w-full h-auto"
                    />
                    {showMousePosition && (
                      <div className="text-sm mt-1 text-gray-500">
                        Mouse position: ({mouseX.toFixed(4)}, {mouseY.toFixed(4)})
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          </div>
        );
      
      case "a11y+screenshot":
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] 🕵️ Accessibility Screenshot`}</h3>
            {event.args.a11y?.metadata && (
              <div className="text-sm">
                <p>Time Taken: {event.args.a11y.metadata.time_taken || "N/A"} s</p>
                <p>Number of Elements: {event.args.a11y.metadata.num_elements || "N/A"}</p>
              </div>
            )}
            <details open={unfoldScreenshots}>
              <summary className="cursor-pointer">View Screenshot</summary>
              <div className="mt-2">
                {event.args.screenshot?.image && (
                  <div className="relative">
                    <img 
                      src={`data:image/jpeg;base64,${showMousePosition ? drawMousePointer(event.args.screenshot.image, mouseX, mouseY) : event.args.screenshot.image}`}
                      alt={`Accessibility Screenshot at ${timestamp}`}
                      className="max-w-full h-auto"
                    />
                    {showMousePosition && (
                      <div className="text-sm mt-1 text-gray-500">
                        Mouse position: ({mouseX.toFixed(4)}, {mouseY.toFixed(4)})
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          </div>
        );
      
      case "typewrite":
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] ⌨️ Type`}</h3>
            <div className="bg-gray-100 p-2 rounded font-mono">{event.args.text}</div>
          </div>
        );
      
      case "click":
        const button = event.args.button || "left";
        const clicks = event.args.clicks || 1;
        const x = event.args.x || 0;
        const y = event.args.y || 0;
        const modifiers = event.args.modifiers || [];
        
        const modifierStr = modifiers.length 
          ? `<u>${modifiers.map((m: string) => m.charAt(0).toUpperCase() + m.slice(1)).join(' + ')}</u> + ` 
          : "";
        
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] 🖱️ Click`}</h3>
            <div 
              className="text-md" 
              dangerouslySetInnerHTML={{ __html: `${modifierStr}${clicks}x ${button}-click at (${x.toFixed(4)}, ${y.toFixed(4)})` }} 
            />
          </div>
        );
      
      case "moveTo":
        const moveX = event.args.x || 0;
        const moveY = event.args.y || 0;
        const duration = event.args.duration || 0;
        
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] ➡️ Move`}</h3>
            <p>to ({moveX.toFixed(4)}, {moveY.toFixed(4)}) over {duration.toFixed(2)}s</p>
          </div>
        );
      
      case "drag":
        const startX = event.args.start_x || 0;
        const startY = event.args.start_y || 0;
        const endX = event.args.end_x || 0;
        const endY = event.args.end_y || 0;
        const dragButton = event.args.button || "left";
        const startTs = formatTimestamp(event.args.start_timestamp || event.timestamp);
        const endTs = formatTimestamp(event.args.end_timestamp || event.timestamp);
        
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] ✋ Drag`}</h3>
            <p>
              {dragButton}-drag from {startTs} to {endTs}<br />
              ({startX.toFixed(4)}, {startY.toFixed(4)}) to ({endX.toFixed(4)}, {endY.toFixed(4)})
            </p>
          </div>
        );
      
      case "scroll":
        const scrollClicks = event.args.clicks || 0;
        const scrollX = event.args.x || 0;
        const scrollY = event.args.y || 0;
        
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] 📜 Scroll`}</h3>
            <p>{scrollClicks} clicks at ({scrollX.toFixed(4)}, {scrollY.toFixed(4)})</p>
          </div>
        );
      
      case "hotkey":
        const keys = event.args.keys || [];
        const formattedKeys = keys.map(key => key === " " ? '" "' : key).join(" + ");
        
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] 🔑 Hotkey`}</h3>
            <div className="bg-gray-100 p-2 rounded font-mono">{formattedKeys}</div>
          </div>
        );
      
      case "press":
        const key = event.args.key || "";
        const count = event.args.count || 1;
        
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] ⌨️ Press`}</h3>
            <p>{key}{count > 1 ? ` (x${count})` : ""}</p>
          </div>
        );
      
      default:
        return (
          <div className="my-4" key={`event-${index}`}>
            <h3 className="text-lg font-medium">{`#${index} [${timestamp}] ❓ ${event.type}`}</h3>
            <p>{event.command || "Unknown command"}</p>
          </div>
        );
    }
  };
  
  // Filter events based on selected types and time range
  const filteredEvents = recording?.events
    ?.filter(event => selectedEventTypes.includes(event.type))
    ?.filter(event => event.timestamp >= timeRange[0] && event.timestamp <= timeRange[1]) || [];
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const currentEvents = filteredEvents.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );
  
  // Track mouse position through events
  let mouseX = 0, mouseY = 0;
  const eventsWithMousePosition = currentEvents.map((event, index) => {
    const result = { event, mouseX, mouseY };
    
    // Update mouse position for next event
    if (event.type === "click" || event.type === "moveTo" || event.type === "scroll") {
      mouseX = event.args.x || mouseX;
      mouseY = event.args.y || mouseY;
    } else if (event.type === "drag") {
      mouseX = event.args.end_x || mouseX;
      mouseY = event.args.end_y || mouseY;
    }
    
    return result;
  });
  
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Loading Recording...</h1>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <h1 className="text-2xl font-bold text-red-700 mb-2">Error Loading Recording</h1>
          <p className="text-red-600">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  if (!recording) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Recording Not Found</h1>
          <p className="mb-4">We couldn't find the recording you're looking for.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  const eventTypes = Array.from(new Set(recording.events.map(event => event.type)));
  const minTime = Math.min(...recording.events.map(e => e.timestamp));
  const maxTime = Math.max(...recording.events.map(e => e.timestamp));
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Recording Viewer
        </h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Recording Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="text-lg">{recording.name || "Unnamed Recording"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date</h3>
            <p className="text-lg">{recording.created_at ? format(new Date(recording.created_at), "MMM d, yyyy h:mm a") : "Unknown"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Events</h3>
            <p className="text-lg">{recording.events.length} total events</p>
          </div>
        </div>
        {recording.meta?.duration_seconds && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">Duration</h3>
            <p className="text-lg">{recording.meta.duration_seconds} seconds</p>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Viewer Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="unfoldScreenshots"
              checked={unfoldScreenshots}
              onChange={(e) => setUnfoldScreenshots(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="unfoldScreenshots">Unfold all screenshots</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showRawData"
              checked={showRawData}
              onChange={(e) => setShowRawData(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showRawData">Show raw event data</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showMousePosition"
              checked={showMousePosition}
              onChange={(e) => setShowMousePosition(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showMousePosition">Show mouse position</label>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Filter Event Types</h3>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <label key={type} className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full">
                <input
                  type="checkbox"
                  checked={selectedEventTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEventTypes([...selectedEventTypes, type]);
                    } else {
                      setSelectedEventTypes(selectedEventTypes.filter(t => t !== type));
                    }
                  }}
                  className="mr-2"
                />
                {type}
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Timeline (seconds)</h3>
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={timeRange[0]}
            onChange={(e) => setTimeRange([parseFloat(e.target.value), timeRange[1]])}
            className="w-full mb-2"
          />
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={timeRange[1]}
            onChange={(e) => setTimeRange([timeRange[0], parseFloat(e.target.value)])}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>{timeRange[0].toFixed(2)}s</span>
            <span>{timeRange[1].toFixed(2)}s</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Events</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredEvents.length} filtered events of {recording.events.length} total
          </div>
        </div>
        
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No events match your filter criteria
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Previous Page
              </button>
              
              <span className="text-sm">
                Page {currentPage + 1} of {totalPages} 
                · Showing events {currentPage * ITEMS_PER_PAGE + 1} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Next Page
              </button>
            </div>
            
            <div className="divide-y divide-gray-200">
              {eventsWithMousePosition.map((item, index) => (
                <div key={index} className="py-4">
                  {renderEvent(
                    item.event,
                    currentPage * ITEMS_PER_PAGE + index,
                    item.mouseX,
                    item.mouseY
                  )}
                  
                  {showRawData && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-500">Show raw event data</summary>
                      <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-x-auto text-xs">
                        {JSON.stringify(item.event, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  <hr className="mt-4" />
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Previous Page
              </button>
              
              <span className="text-sm">
                Page {currentPage + 1} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Next Page
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 