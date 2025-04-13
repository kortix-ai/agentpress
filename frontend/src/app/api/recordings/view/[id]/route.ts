import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { id } = params;

    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { error: "Recording ID is required" },
        { status: 400 }
      );
    }

    // First, fetch the recording to get the preprocessed_file_path
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", id)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: recordingError?.message || "Recording not found" },
        { status: 404 }
      );
    }

    console.log("Fetched recording for view:", recording.name);
    console.log("Preprocessed file path:", recording.preprocessed_file_path);

    if (!recording.preprocessed_file_path) {
      return NextResponse.json(
        { error: "Preprocessed file path not found for this recording" },
        { status: 404 }
      );
    }

    // Download preprocessed file from Supabase Storage
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('recordings')
        .download(recording.preprocessed_file_path);

      if (downloadError) {
        console.error("Supabase storage download error:", downloadError);
        return NextResponse.json(
          { error: `Failed to download file from storage: ${downloadError.message}` },
          { status: 500 }
        );
      }

      if (!fileData) {
        return NextResponse.json(
          { error: "Downloaded file data is empty" },
          { status: 500 }
        );
      }

      // Convert blob to text
      const text = await fileData.text();
      
      // Parse JSONL content into structured data
      const lines = text.split('\n').filter(line => line.trim());
      const events = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error("Error parsing JSONL line:", e);
          return null;
        }
      }).filter(Boolean);

      // Create response with recording metadata and events
      const response = {
        id: recording.id,
        name: recording.name,
        created_at: recording.created_at,
        events: events,
        meta: recording.meta,
      };

      return NextResponse.json(response);
    } catch (storageError) {
      console.error("Error during storage download:", storageError);
      return NextResponse.json(
        { error: "Internal server error during storage download" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 