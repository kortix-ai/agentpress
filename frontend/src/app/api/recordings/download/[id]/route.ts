import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
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

    console.log("Fetched recording from DB:", recording); // Debug log 1
    console.log("Preprocessed file path from DB:", recording.preprocessed_file_path); // Debug log 2

    if (!recording.preprocessed_file_path) {
      return NextResponse.json(
        { error: "Preprocessed file path not found for this recording" },
        { status: 404 }
      );
    }

    // Download directly from Supabase Storage
    try {
      const { data: blobData, error: downloadError } = await supabase.storage
        .from('recordings') // Bucket name
        .download(recording.preprocessed_file_path); // Path from the DB

      if (downloadError) {
        console.error("Supabase storage download error:", downloadError);
        return NextResponse.json(
          { error: `Failed to download file from storage: ${downloadError.message}` },
          { status: 500 }
        );
      }

      if (!blobData) {
        return NextResponse.json(
          { error: "Downloaded file data is empty" },
          { status: 500 }
        );
      }
      
      // Prepare headers for file download
      const headers = new Headers();
      const fileName = recording.preprocessed_file_path.split('/').pop() || 'downloaded_file.jsonl';
      // Set appropriate content type (adjust if needed, e.g., 'application/json' if it's pure JSON)
      headers.set('Content-Type', 'application/x-jsonlines'); 
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Return the blob data as the response body
      return new NextResponse(blobData, { status: 200, headers });

    } catch (storageError) {
      console.error("Error during storage download:", storageError);
      return NextResponse.json(
        { error: "Internal server error during storage download" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error downloading recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 