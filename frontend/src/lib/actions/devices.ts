import { createClient } from "@/lib/supabase/server";

export async function getDevices(accountId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("account_id", accountId)
    .order("last_seen", { ascending: false });

  if (error) {
    console.error("Error fetching devices:", error);
    throw error;
  }

  return data || [];
} 