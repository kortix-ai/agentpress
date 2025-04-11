import React from "react";

import { Loader2 } from "lucide-react";

import { ToolCallData } from "./types";
import { getDetailedToolDescription } from "./ToolDescriptionHelper";

interface StreamingMessageProps {
  streamContent: string;
  isStreaming: boolean;
  toolCallData: ToolCallData | null;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  streamContent,
  isStreaming,
  toolCallData,
}) => {
  return (
    <div className="flex justify-start">
      <div className="max-w-full rounded-lg px-4 py-1 text-sm">
        <div className="whitespace-pre-wrap break-words">
          {toolCallData ? (
            <div className="font-mono text-xs">
              <div className="p-2 bg-secondary/0 rounded-md overflow-hidden relative border border-zinc-100">
                {/* Metallic pulse overlay */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  <div
                    className="h-full w-40 absolute top-0 left-0"
                    style={{
                      animation: "toolPulse 3s linear infinite",
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)",
                      mixBlendMode: "overlay",
                      zIndex: 20,
                    }}
                  />
                </div>

                {/* Tool execution status with clear indication of what's running */}
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-zinc-700">
                    {getDetailedToolDescription(toolCallData)}
                  </span>
                </div>
              </div>

              <style jsx global>{`
                @keyframes toolPulse {
                  0% {
                    transform: translateX(-100%);
                  }
                  100% {
                    transform: translateX(400%);
                  }
                }
              `}</style>
            </div>
          ) : (
            <>
              {/* Add Kortix logo for streaming content when not in a tool call */}
              <div className="flex items-center mb-2">
                <img
                  src="/Kortix-Logo-Only.svg"
                  alt="Kortix Logo"
                  className="h-4 w-4 mr-1.5"
                />
                <span className="text-xs suna-text font-medium">SUNA</span>
              </div>
              {streamContent}
            </>
          )}
          {isStreaming && (
            <>
              <span className="inline-flex items-center ml-0.5">
                <span
                  className="inline-block h-4 w-0.5 bg-foreground/50 mx-px"
                  style={{
                    opacity: 0.7,
                    animation: "cursorBlink 1s ease-in-out infinite",
                  }}
                />
                <style jsx global>{`
                  @keyframes cursorBlink {
                    0%,
                    100% {
                      opacity: 1;
                    }
                    50% {
                      opacity: 0;
                    }
                  }
                `}</style>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreamingMessage;
