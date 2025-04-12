import { createClient } from "@/lib/supabase/server";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  
  return NextResponse.redirect(new URL('/', request.url));
} 